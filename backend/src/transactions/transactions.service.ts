import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { endOfDay, startOfDay } from 'date-fns';
import { Model } from 'mongoose';
import { AccountsService } from '../accounts/accounts.service';
import { JwtUser, TransactionType } from '../common/types';
import { CreateTransactionDto, UpdateTransactionDto } from './dto/transaction.dto';
import { Transaction } from './transaction.schema';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Transaction.name) private readonly transactions: Model<Transaction>,
    private readonly accounts: AccountsService,
  ) {}

  list(type: TransactionType, user: JwtUser, from?: string, to?: string) {
    const filter: Record<string, unknown> = { companyId: user.companyId, type };
    if (from || to) {
      filter.transactionDate = {
        ...(from ? { $gte: startOfDay(new Date(from)) } : {}),
        ...(to ? { $lte: endOfDay(new Date(to)) } : {}),
      };
    }
    return this.transactions
      .find(filter)
      .populate('categoryId', 'name type')
      .populate('accountId', 'name number')
      .sort({ transactionDate: -1 })
      .lean();
  }

  async create(type: TransactionType, dto: CreateTransactionDto, user: JwtUser) {
    await this.accounts.adjustBalance(dto.accountId, user.companyId, this.effect(type, dto.amount));
    return this.transactions.create({
      ...dto,
      type,
      companyId: user.companyId,
      transactionDate: new Date(dto.transactionDate),
    });
  }

  async update(id: string, type: TransactionType, dto: UpdateTransactionDto, user: JwtUser) {
    const current = await this.transactions.findOne({ _id: id, type, companyId: user.companyId });
    if (!current) {
      throw new NotFoundException('Transaction not found');
    }

    await this.accounts.adjustBalance(current.accountId.toString(), user.companyId, -this.effect(current.type, current.amount));
    try {
      const nextAccountId = dto.accountId ?? current.accountId.toString();
      const nextAmount = dto.amount ?? current.amount;
      await this.accounts.adjustBalance(nextAccountId, user.companyId, this.effect(type, nextAmount));
      current.set({
        ...dto,
        transactionDate: dto.transactionDate ? new Date(dto.transactionDate) : current.transactionDate,
      });
      await current.save();
      return this.transactions
        .findById(current._id)
        .populate('categoryId', 'name type')
        .populate('accountId', 'name number')
        .lean();
    } catch (error) {
      await this.accounts.adjustBalance(current.accountId.toString(), user.companyId, this.effect(current.type, current.amount));
      throw error;
    }
  }

  async remove(id: string, type: TransactionType, user: JwtUser) {
    const current = await this.transactions.findOne({ _id: id, type, companyId: user.companyId });
    if (!current) {
      throw new NotFoundException('Transaction not found');
    }
    await this.accounts.adjustBalance(current.accountId.toString(), user.companyId, -this.effect(current.type, current.amount));
    await current.deleteOne();
    return { success: true };
  }

  private effect(type: TransactionType, amount: number) {
    return type === TransactionType.INCOME ? amount : -amount;
  }
}
