import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AccountsService } from '../accounts/accounts.service';
import { JwtUser, LoanDirection } from '../common/types';
import { buildDateFilter, parseDateInput } from '../common/utils/date-range';
import { assertNotStale } from '../common/utils/optimistic-lock';
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
    return this.people.find({ userId: user.sub, isActive: true }).sort({ createdAt: -1 }).lean();
  }

  async createPerson(dto: CreateLoanPersonDto, user: JwtUser) {
    if (dto.clientRequestId) {
      const existing = await this.people.findOne({ userId: user.sub, clientRequestId: dto.clientRequestId }).lean();
      if (existing) {
        return existing;
      }
    }

    return this.people.create({ ...dto, userId: user.sub });
  }

  async updatePerson(id: string, dto: UpdateLoanPersonDto, user: JwtUser) {
    const person = await this.people.findOne({ _id: id, userId: user.sub });
    if (!person) {
      throw new NotFoundException('Loan account not found');
    }

    const { expectedUpdatedAt, ...changes } = dto;
    assertNotStale(person.updatedAt, expectedUpdatedAt);
    person.set(changes);
    await person.save();
    return this.people.findById(person._id).lean();
  }

  async removePerson(id: string, user: JwtUser, expectedUpdatedAt?: string) {
    const person = await this.people.findOne({ _id: id, userId: user.sub });
    if (!person) {
      throw new NotFoundException('Loan account not found');
    }

    assertNotStale(person.updatedAt, expectedUpdatedAt);
    person.set({ isActive: false });
    await person.save();
    return { success: true };
  }

  listLoans(user: JwtUser, from?: string, to?: string, personId?: string, direction?: LoanDirection) {
    const filter: Record<string, unknown> = { userId: user.sub };
    const dateFilter = buildDateFilter(from, to);
    if (dateFilter) {
      filter.loanDate = dateFilter;
    }
    if (personId) {
      filter.personId = personId;
    }
    if (direction) {
      filter.direction = direction;
    }
    return this.loans
      .find(filter)
      .populate('personId', 'name phone')
      .populate('accountId', 'name number')
      .sort({ loanDate: -1, createdAt: -1, _id: -1 })
      .lean();
  }

  async createLoan(dto: CreateLoanDto, user: JwtUser) {
    if (dto.clientRequestId) {
      const existing = await this.loans.findOne({ userId: user.sub, clientRequestId: dto.clientRequestId }).lean();
      if (existing) {
        return existing;
      }
    }

    await this.ensurePerson(dto.personId, user.sub);
    await this.accounts.adjustBalance(dto.accountId, user.sub, this.effect(dto.direction, dto.amount));
    return this.loans.create({
      ...dto,
      userId: user.sub,
      loanDate: parseDateInput(dto.loanDate) ?? new Date(dto.loanDate),
    });
  }

  async updateLoan(id: string, dto: UpdateLoanDto, user: JwtUser) {
    const current = await this.loans.findOne({ _id: id, userId: user.sub });
    if (!current) {
      throw new NotFoundException('Loan not found');
    }

    const { expectedUpdatedAt, ...changes } = dto;
    assertNotStale(current.updatedAt, expectedUpdatedAt);
    await this.accounts.adjustBalance(current.accountId.toString(), user.sub, -this.effect(current.direction, current.amount));
    try {
      const nextDirection = changes.direction ?? current.direction;
      const nextAmount = changes.amount ?? current.amount;
      const nextAccountId = changes.accountId ?? current.accountId.toString();
      const nextPersonId = changes.personId ?? current.personId.toString();
      await this.ensurePerson(nextPersonId, user.sub);
      await this.accounts.adjustBalance(nextAccountId, user.sub, this.effect(nextDirection, nextAmount));
      current.set({
        ...changes,
        loanDate: changes.loanDate ? (parseDateInput(changes.loanDate) ?? new Date(changes.loanDate)) : current.loanDate,
      });
      await current.save();
      return this.loans
        .findById(current._id)
        .populate('personId', 'name phone')
        .populate('accountId', 'name number')
        .lean();
    } catch (error) {
      await this.accounts.adjustBalance(current.accountId.toString(), user.sub, this.effect(current.direction, current.amount));
      throw error;
    }
  }

  async removeLoan(id: string, user: JwtUser, expectedUpdatedAt?: string) {
    const current = await this.loans.findOne({ _id: id, userId: user.sub });
    if (!current) {
      throw new NotFoundException('Loan not found');
    }
    assertNotStale(current.updatedAt, expectedUpdatedAt);
    await this.accounts.adjustBalance(current.accountId.toString(), user.sub, -this.effect(current.direction, current.amount));
    await current.deleteOne();
    return { success: true };
  }

  private effect(direction: LoanDirection, amount: number) {
    return direction === LoanDirection.BORROWED ? amount : -amount;
  }

  private async ensurePerson(personId: string, userId: string) {
    const person = await this.people.findOne({ _id: personId, userId, isActive: true });
    if (!person) {
      throw new NotFoundException('Loan account not found');
    }
  }
}
