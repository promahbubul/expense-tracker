import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtUser } from '../common/types';
import { assertNotStale } from '../common/utils/optimistic-lock';
import { Account } from './account.schema';
import { CreateAccountDto, UpdateAccountDto } from './dto/account.dto';

@Injectable()
export class AccountsService {
  constructor(@InjectModel(Account.name) private readonly accounts: Model<Account>) {}

  list(user: JwtUser) {
    return this.accounts.find({ userId: user.sub, isActive: true }).sort({ createdAt: -1 }).lean();
  }

  async create(dto: CreateAccountDto, user: JwtUser) {
    if (dto.clientRequestId) {
      const existing = await this.accounts.findOne({ userId: user.sub, clientRequestId: dto.clientRequestId }).lean();
      if (existing) {
        return existing;
      }
    }

    const initialBalance = dto.initialBalance ?? 0;
    return this.accounts.create({
      ...dto,
      initialBalance,
      currentBalance: initialBalance,
      userId: user.sub,
    });
  }

  async update(id: string, dto: UpdateAccountDto, user: JwtUser) {
    const account = await this.accounts.findOne({ _id: id, userId: user.sub });
    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const { expectedUpdatedAt, ...changes } = dto;
    assertNotStale(account.updatedAt, expectedUpdatedAt);
    account.set(changes);
    await account.save();
    return this.accounts.findById(account._id).lean();
  }

  async remove(id: string, user: JwtUser, expectedUpdatedAt?: string) {
    const account = await this.accounts.findOne({ _id: id, userId: user.sub });
    if (!account) {
      throw new NotFoundException('Account not found');
    }

    assertNotStale(account.updatedAt, expectedUpdatedAt);
    account.set({ isActive: false });
    await account.save();
    return { success: true };
  }

  async adjustBalance(accountId: string, userId: string, delta: number) {
    const filter: Record<string, unknown> = { _id: accountId, userId, isActive: true };
    if (delta < 0) {
      filter.currentBalance = { $gte: Math.abs(delta) };
    }

    const account = await this.accounts.findOneAndUpdate(filter, { $inc: { currentBalance: delta } }, { new: true });
    if (!account) {
      const exists = await this.accounts.findOne({ _id: accountId, userId, isActive: true });
      if (!exists) {
        throw new NotFoundException('Account not found');
      }
      throw new BadRequestException('Insufficient account balance');
    }
    return account;
  }
}
