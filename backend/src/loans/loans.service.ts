import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { endOfDay, startOfDay } from 'date-fns';
import { Model } from 'mongoose';
import { AccountsService } from '../accounts/accounts.service';
import { JwtUser, LoanDirection } from '../common/types';
import { CreateLoanDto, CreateLoanPersonDto, UpdateLoanDto, UpdateLoanPersonDto } from './dto/loan.dto';
import { LoanPerson } from './loan-person.schema';
import { Loan } from './loan.schema';

@Injectable()
export class LoansService {
  constructor(
    @InjectModel(LoanPerson.name) private readonly people: Model<LoanPerson>,
    @InjectModel(Loan.name) private readonly loans: Model<Loan>,
    private readonly accounts: AccountsService,
  ) {}

  listPeople(user: JwtUser) {
    return this.people.find({ companyId: user.companyId, isActive: true }).sort({ createdAt: -1 }).lean();
  }

  createPerson(dto: CreateLoanPersonDto, user: JwtUser) {
    return this.people.create({ ...dto, companyId: user.companyId });
  }

  async updatePerson(id: string, dto: UpdateLoanPersonDto, user: JwtUser) {
    const person = await this.people.findOneAndUpdate({ _id: id, companyId: user.companyId }, dto, { new: true }).lean();
    if (!person) {
      throw new NotFoundException('Loan account not found');
    }
    return person;
  }

  async removePerson(id: string, user: JwtUser) {
    const person = await this.people.findOneAndUpdate({ _id: id, companyId: user.companyId }, { isActive: false });
    if (!person) {
      throw new NotFoundException('Loan account not found');
    }
    return { success: true };
  }

  listLoans(user: JwtUser, from?: string, to?: string) {
    const filter: Record<string, unknown> = { companyId: user.companyId };
    if (from || to) {
      filter.loanDate = {
        ...(from ? { $gte: startOfDay(new Date(from)) } : {}),
        ...(to ? { $lte: endOfDay(new Date(to)) } : {}),
      };
    }
    return this.loans
      .find(filter)
      .populate('personId', 'name phone')
      .populate('accountId', 'name number')
      .sort({ loanDate: -1 })
      .lean();
  }

  async createLoan(dto: CreateLoanDto, user: JwtUser) {
    await this.accounts.adjustBalance(dto.accountId, user.companyId, this.effect(dto.direction, dto.amount));
    return this.loans.create({
      ...dto,
      companyId: user.companyId,
      loanDate: new Date(dto.loanDate),
    });
  }

  async updateLoan(id: string, dto: UpdateLoanDto, user: JwtUser) {
    const current = await this.loans.findOne({ _id: id, companyId: user.companyId });
    if (!current) {
      throw new NotFoundException('Loan not found');
    }

    await this.accounts.adjustBalance(current.accountId.toString(), user.companyId, -this.effect(current.direction, current.amount));
    try {
      const nextDirection = dto.direction ?? current.direction;
      const nextAmount = dto.amount ?? current.amount;
      const nextAccountId = dto.accountId ?? current.accountId.toString();
      await this.accounts.adjustBalance(nextAccountId, user.companyId, this.effect(nextDirection, nextAmount));
      current.set({
        ...dto,
        loanDate: dto.loanDate ? new Date(dto.loanDate) : current.loanDate,
      });
      await current.save();
      return this.loans
        .findById(current._id)
        .populate('personId', 'name phone')
        .populate('accountId', 'name number')
        .lean();
    } catch (error) {
      await this.accounts.adjustBalance(current.accountId.toString(), user.companyId, this.effect(current.direction, current.amount));
      throw error;
    }
  }

  async removeLoan(id: string, user: JwtUser) {
    const current = await this.loans.findOne({ _id: id, companyId: user.companyId });
    if (!current) {
      throw new NotFoundException('Loan not found');
    }
    await this.accounts.adjustBalance(current.accountId.toString(), user.companyId, -this.effect(current.direction, current.amount));
    await current.deleteOne();
    return { success: true };
  }

  private effect(direction: LoanDirection, amount: number) {
    return direction === LoanDirection.BORROWED ? amount : -amount;
  }
}
