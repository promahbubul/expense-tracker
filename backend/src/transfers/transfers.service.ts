import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AccountsService } from '../accounts/accounts.service';
import { JwtUser } from '../common/types';
import { buildDateFilter, parseDateInput } from '../common/utils/date-range';
import { assertNotStale } from '../common/utils/optimistic-lock';
import { CreateTransferDto, UpdateTransferDto } from './dto/transfer.dto';
import { Transfer } from './transfer.schema';

@Injectable()
export class TransfersService {
  constructor(
    @InjectModel(Transfer.name) private readonly transfers: Model<Transfer>,
    private readonly accounts: AccountsService,
  ) {}

  list(user: JwtUser, from?: string, to?: string) {
    const filter: Record<string, unknown> = { userId: user.sub };
    const dateFilter = buildDateFilter(from, to);
    if (dateFilter) {
      filter.transferDate = dateFilter;
    }

    return this.transfers
      .find(filter)
      .populate('fromAccountId', 'name number')
      .populate('toAccountId', 'name number')
      .sort({ transferDate: -1, createdAt: -1 })
      .lean();
  }

  async create(dto: CreateTransferDto, user: JwtUser) {
    if (dto.clientRequestId) {
      const existing = await this.transfers.findOne({ userId: user.sub, clientRequestId: dto.clientRequestId }).lean();
      if (existing) {
        return existing;
      }
    }

    this.ensureAccountsDiffer(dto.fromAccountId, dto.toAccountId);

    try {
      await this.applyTransfer(user.sub, dto.fromAccountId, dto.toAccountId, dto.amount, dto.fee ?? 0);
    } catch (error) {
      throw error;
    }

    return this.transfers.create({
      ...dto,
      fee: dto.fee ?? 0,
      userId: user.sub,
      transferDate: parseDateInput(dto.transferDate) ?? new Date(dto.transferDate),
    });
  }

  async update(id: string, dto: UpdateTransferDto, user: JwtUser) {
    const current = await this.transfers.findOne({ _id: id, userId: user.sub });
    if (!current) {
      throw new NotFoundException('Transfer not found');
    }

    const { expectedUpdatedAt, ...changes } = dto;
    assertNotStale(current.updatedAt, expectedUpdatedAt);
    const nextFromAccountId = changes.fromAccountId ?? current.fromAccountId.toString();
    const nextToAccountId = changes.toAccountId ?? current.toAccountId.toString();
    const nextAmount = changes.amount ?? current.amount;
    const nextFee = changes.fee ?? current.fee ?? 0;

    this.ensureAccountsDiffer(nextFromAccountId, nextToAccountId);
    const deltas = this.buildBalanceDeltas(
      current.fromAccountId.toString(),
      current.toAccountId.toString(),
      current.amount,
      current.fee ?? 0,
      nextFromAccountId,
      nextToAccountId,
      nextAmount,
      nextFee,
    );

    await this.applyBalanceDeltas(user.sub, deltas);

    try {
      current.set({
        ...changes,
        fee: nextFee,
        transferDate: changes.transferDate ? (parseDateInput(changes.transferDate) ?? new Date(changes.transferDate)) : current.transferDate,
      });
      await current.save();
      return this.transfers.findById(current._id).populate('fromAccountId', 'name number').populate('toAccountId', 'name number').lean();
    } catch (error) {
      await this.rollbackBalanceDeltas(user.sub, deltas);
      throw error;
    }
  }

  async remove(id: string, user: JwtUser, expectedUpdatedAt?: string) {
    const current = await this.transfers.findOne({ _id: id, userId: user.sub });
    if (!current) {
      throw new NotFoundException('Transfer not found');
    }

    assertNotStale(current.updatedAt, expectedUpdatedAt);
    await this.revertTransfer(user.sub, current.fromAccountId.toString(), current.toAccountId.toString(), current.amount, current.fee ?? 0);
    await current.deleteOne();
    return { success: true };
  }

  private ensureAccountsDiffer(fromAccountId: string, toAccountId: string) {
    if (fromAccountId === toAccountId) {
      throw new BadRequestException('Choose two different accounts');
    }
  }

  private async applyTransfer(userId: string, fromAccountId: string, toAccountId: string, amount: number, fee: number) {
    await this.accounts.adjustBalance(fromAccountId, userId, -(amount + fee));

    try {
      await this.accounts.adjustBalance(toAccountId, userId, amount);
    } catch (error) {
      await this.accounts.adjustBalance(fromAccountId, userId, amount + fee);
      throw error;
    }
  }

  private async revertTransfer(userId: string, fromAccountId: string, toAccountId: string, amount: number, fee: number) {
    await this.accounts.adjustBalance(toAccountId, userId, -amount);

    try {
      await this.accounts.adjustBalance(fromAccountId, userId, amount + fee);
    } catch (error) {
      await this.accounts.adjustBalance(toAccountId, userId, amount);
      throw error;
    }
  }

  private buildBalanceDeltas(
    currentFromAccountId: string,
    currentToAccountId: string,
    currentAmount: number,
    currentFee: number,
    nextFromAccountId: string,
    nextToAccountId: string,
    nextAmount: number,
    nextFee: number,
  ) {
    const deltas = new Map<string, number>();

    const addDelta = (accountId: string, delta: number) => {
      deltas.set(accountId, (deltas.get(accountId) ?? 0) + delta);
    };

    // Remove the current transfer effect.
    addDelta(currentFromAccountId, currentAmount + currentFee);
    addDelta(currentToAccountId, -currentAmount);

    // Apply the next transfer effect.
    addDelta(nextFromAccountId, -(nextAmount + nextFee));
    addDelta(nextToAccountId, nextAmount);

    return [...deltas.entries()]
      .filter(([, delta]) => delta !== 0)
      .map(([accountId, delta]) => ({ accountId, delta }));
  }

  private async applyBalanceDeltas(userId: string, deltas: Array<{ accountId: string; delta: number }>) {
    const ordered = [...deltas].sort((left, right) => left.delta - right.delta);
    const applied: Array<{ accountId: string; delta: number }> = [];

    try {
      for (const item of ordered) {
        await this.accounts.adjustBalance(item.accountId, userId, item.delta);
        applied.push(item);
      }
    } catch (error) {
      await this.rollbackBalanceDeltas(userId, applied);
      throw error;
    }
  }

  private async rollbackBalanceDeltas(userId: string, deltas: Array<{ accountId: string; delta: number }>) {
    for (const item of [...deltas].reverse()) {
      try {
        await this.accounts.adjustBalance(item.accountId, userId, -item.delta);
      } catch {
        // Best-effort rollback if a later step failed after partial balance updates.
      }
    }
  }
}
