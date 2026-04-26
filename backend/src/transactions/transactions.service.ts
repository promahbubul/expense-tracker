import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AccountsService } from '../accounts/accounts.service';
import { Category } from '../categories/category.schema';
import { CategoryType, JwtUser, TransactionType } from '../common/types';
import { buildDateFilter, parseDateInput } from '../common/utils/date-range';
import { assertNotStale } from '../common/utils/optimistic-lock';
import { CreateTransactionDto, UpdateTransactionDto } from './dto/transaction.dto';
import { Transaction } from './transaction.schema';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Transaction.name) private readonly transactions: Model<Transaction>,
    @InjectModel(Category.name) private readonly categories: Model<Category>,
    private readonly accounts: AccountsService,
  ) {}

  list(type: TransactionType, user: JwtUser, from?: string, to?: string) {
    const filter: Record<string, unknown> = { userId: user.sub, type };
    const dateFilter = buildDateFilter(from, to);
    if (dateFilter) {
      filter.transactionDate = dateFilter;
    }
    return this.transactions
      .find(filter)
      .populate('categoryId', 'name type')
      .populate('accountId', 'name number')
      .sort({ transactionDate: -1, createdAt: -1, _id: -1 })
      .lean();
  }

  async create(type: TransactionType, dto: CreateTransactionDto, user: JwtUser) {
    if (dto.clientRequestId) {
      const existing = await this.transactions.findOne({ userId: user.sub, clientRequestId: dto.clientRequestId }).lean();
      if (existing) {
        return existing;
      }
    }

    await this.ensureCategory(dto.categoryId, user.sub, type);
    await this.accounts.adjustBalance(dto.accountId, user.sub, this.effect(type, dto.amount));
    return this.transactions.create({
      ...dto,
      type,
      userId: user.sub,
      transactionDate: parseDateInput(dto.transactionDate) ?? new Date(dto.transactionDate),
    });
  }

  async update(id: string, type: TransactionType, dto: UpdateTransactionDto, user: JwtUser) {
    const current = await this.transactions.findOne({ _id: id, type, userId: user.sub });
    if (!current) {
      throw new NotFoundException('Transaction not found');
    }

    const { expectedUpdatedAt, ...changes } = dto;
    assertNotStale(current.updatedAt, expectedUpdatedAt);
    await this.accounts.adjustBalance(current.accountId.toString(), user.sub, -this.effect(current.type, current.amount));
    try {
      const nextAccountId = changes.accountId ?? current.accountId.toString();
      const nextAmount = changes.amount ?? current.amount;
      const nextCategoryId = changes.categoryId ?? current.categoryId.toString();
      await this.ensureCategory(nextCategoryId, user.sub, type);
      await this.accounts.adjustBalance(nextAccountId, user.sub, this.effect(type, nextAmount));
      current.set({
        ...changes,
        transactionDate: changes.transactionDate ? (parseDateInput(changes.transactionDate) ?? new Date(changes.transactionDate)) : current.transactionDate,
      });
      await current.save();
      return this.transactions
        .findById(current._id)
        .populate('categoryId', 'name type')
        .populate('accountId', 'name number')
        .lean();
    } catch (error) {
      await this.accounts.adjustBalance(current.accountId.toString(), user.sub, this.effect(current.type, current.amount));
      throw error;
    }
  }

  async remove(id: string, type: TransactionType, user: JwtUser, expectedUpdatedAt?: string) {
    const current = await this.transactions.findOne({ _id: id, type, userId: user.sub });
    if (!current) {
      throw new NotFoundException('Transaction not found');
    }
    assertNotStale(current.updatedAt, expectedUpdatedAt);
    await this.accounts.adjustBalance(current.accountId.toString(), user.sub, -this.effect(current.type, current.amount));
    await current.deleteOne();
    return { success: true };
  }

  private effect(type: TransactionType, amount: number) {
    return type === TransactionType.INCOME ? amount : -amount;
  }

  private async ensureCategory(categoryId: string, userId: string, type: TransactionType) {
    const category = await this.categories.findOne({
      _id: categoryId,
      userId,
      type: type === TransactionType.INCOME ? CategoryType.INCOME : CategoryType.EXPENSE,
      isActive: true,
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
  }
}
