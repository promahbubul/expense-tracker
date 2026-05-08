import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import type { ClientSession, Connection, Model } from 'mongoose';
import { AccountsService } from '../accounts/accounts.service';
import { Category } from '../categories/category.schema';
import { CategoryType, JwtUser, TransactionType } from '../common/types';
import { buildDateFilter, parseDateInput } from '../common/utils/date-range';
import { runWithOptionalTransaction } from '../common/utils/mongo-transaction';
import { assertNotStale } from '../common/utils/optimistic-lock';
import { CreateTransactionDto, UpdateTransactionDto } from './dto/transaction.dto';
import { Transaction } from './transaction.schema';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Transaction.name) private readonly transactions: Model<Transaction>,
    @InjectModel(Category.name) private readonly categories: Model<Category>,
    private readonly accounts: AccountsService,
    @InjectConnection() private readonly connection: Connection,
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

    const transactionId = await runWithOptionalTransaction(
      this.connection,
      async (session) => {
        await this.ensureCategory(dto.categoryId, user.sub, type, session);
        await this.accounts.adjustBalance(dto.accountId, user.sub, this.effect(type, dto.amount), session);
        const [created] = await this.transactions.create([this.buildPayload(type, dto, user.sub)], { session });
        return created._id.toString();
      },
      async () => {
        await this.ensureCategory(dto.categoryId, user.sub, type);
        await this.accounts.adjustBalance(dto.accountId, user.sub, this.effect(type, dto.amount));
        try {
          const created = await this.transactions.create(this.buildPayload(type, dto, user.sub));
          return created._id.toString();
        } catch (error) {
          await this.accounts.adjustBalance(dto.accountId, user.sub, -this.effect(type, dto.amount));
          throw error;
        }
      },
    );

    return this.findDetailed(transactionId);
  }

  async update(id: string, type: TransactionType, dto: UpdateTransactionDto, user: JwtUser) {
    const transactionId = await runWithOptionalTransaction(
      this.connection,
      async (session) => {
        const current = await this.transactions.findOne({ _id: id, type, userId: user.sub }).session(session);
        if (!current) {
          throw new NotFoundException('Transaction not found');
        }

        const { expectedUpdatedAt, ...changes } = dto;
        assertNotStale(current.updatedAt, expectedUpdatedAt);
        await this.accounts.adjustBalance(current.accountId.toString(), user.sub, -this.effect(current.type, current.amount), session);

        const nextAccountId = changes.accountId ?? current.accountId.toString();
        const nextAmount = changes.amount ?? current.amount;
        const nextCategoryId = changes.categoryId ?? current.categoryId.toString();
        await this.ensureCategory(nextCategoryId, user.sub, type, session);
        await this.accounts.adjustBalance(nextAccountId, user.sub, this.effect(type, nextAmount), session);
        current.set({
          ...changes,
          transactionDate: changes.transactionDate ? (parseDateInput(changes.transactionDate) ?? new Date(changes.transactionDate)) : current.transactionDate,
        });
        await current.save({ session });
        return current._id.toString();
      },
      async () => {
        const current = await this.transactions.findOne({ _id: id, type, userId: user.sub });
        if (!current) {
          throw new NotFoundException('Transaction not found');
        }

        const { expectedUpdatedAt, ...changes } = dto;
        assertNotStale(current.updatedAt, expectedUpdatedAt);
        await this.accounts.adjustBalance(current.accountId.toString(), user.sub, -this.effect(current.type, current.amount));
        const nextAccountId = changes.accountId ?? current.accountId.toString();
        const nextAmount = changes.amount ?? current.amount;
        try {
          const nextCategoryId = changes.categoryId ?? current.categoryId.toString();
          await this.ensureCategory(nextCategoryId, user.sub, type);
          await this.accounts.adjustBalance(nextAccountId, user.sub, this.effect(type, nextAmount));
          current.set({
            ...changes,
            transactionDate: changes.transactionDate ? (parseDateInput(changes.transactionDate) ?? new Date(changes.transactionDate)) : current.transactionDate,
          });
          await current.save();
          return current._id.toString();
        } catch (error) {
          try {
            await this.accounts.adjustBalance(nextAccountId, user.sub, -this.effect(type, nextAmount));
          } catch {
            // Best-effort rollback for non-transactional Mongo deployments.
          }
          await this.accounts.adjustBalance(current.accountId.toString(), user.sub, this.effect(current.type, current.amount));
          throw error;
        }
      },
    );

    return this.findDetailed(transactionId);
  }

  async remove(id: string, type: TransactionType, user: JwtUser, expectedUpdatedAt?: string) {
    return runWithOptionalTransaction(
      this.connection,
      async (session) => {
        const current = await this.transactions.findOne({ _id: id, type, userId: user.sub }).session(session);
        if (!current) {
          throw new NotFoundException('Transaction not found');
        }
        assertNotStale(current.updatedAt, expectedUpdatedAt);
        await this.accounts.adjustBalance(current.accountId.toString(), user.sub, -this.effect(current.type, current.amount), session);
        await current.deleteOne({ session });
        return { success: true };
      },
      async () => {
        const current = await this.transactions.findOne({ _id: id, type, userId: user.sub });
        if (!current) {
          throw new NotFoundException('Transaction not found');
        }
        assertNotStale(current.updatedAt, expectedUpdatedAt);
        await this.accounts.adjustBalance(current.accountId.toString(), user.sub, -this.effect(current.type, current.amount));
        try {
          await current.deleteOne();
          return { success: true };
        } catch (error) {
          await this.accounts.adjustBalance(current.accountId.toString(), user.sub, this.effect(current.type, current.amount));
          throw error;
        }
      },
    );
  }

  private effect(type: TransactionType, amount: number) {
    return type === TransactionType.INCOME ? amount : -amount;
  }

  private buildPayload(type: TransactionType, dto: CreateTransactionDto, userId: string) {
    return {
      ...dto,
      type,
      userId,
      transactionDate: parseDateInput(dto.transactionDate) ?? new Date(dto.transactionDate),
    };
  }

  private findDetailed(id: string) {
    return this.transactions.findById(id).populate('categoryId', 'name type').populate('accountId', 'name number').lean();
  }

  private async ensureCategory(categoryId: string, userId: string, type: TransactionType, session?: ClientSession) {
    const category = await this.categories.findOne({
      _id: categoryId,
      userId,
      type: type === TransactionType.INCOME ? CategoryType.INCOME : CategoryType.EXPENSE,
      isActive: true,
    }).session(session ?? null);
    if (!category) {
      throw new NotFoundException('Category not found');
    }
  }
}
