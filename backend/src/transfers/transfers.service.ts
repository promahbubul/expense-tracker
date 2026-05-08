import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import type { ClientSession, Connection, Model } from 'mongoose';
import { AccountsService } from '../accounts/accounts.service';
import { JwtUser } from '../common/types';
import { buildDateFilter, parseDateInput } from '../common/utils/date-range';
import { runWithOptionalTransaction } from '../common/utils/mongo-transaction';
import { assertNotStale } from '../common/utils/optimistic-lock';
import { CreateTransferDto, UpdateTransferDto } from './dto/transfer.dto';
import { Transfer } from './transfer.schema';

@Injectable()
export class TransfersService {
  constructor(
    @InjectModel(Transfer.name) private readonly transfers: Model<Transfer>,
    private readonly accounts: AccountsService,
    @InjectConnection() private readonly connection: Connection,
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

    const transferId = await runWithOptionalTransaction(
      this.connection,
      async (session) => {
        await this.applyTransfer(user.sub, dto.fromAccountId, dto.toAccountId, dto.amount, dto.fee ?? 0, session);
        const [created] = await this.transfers.create([this.buildPayload(dto, user.sub)], { session });
        return created._id.toString();
      },
      async () => {
        await this.applyTransfer(user.sub, dto.fromAccountId, dto.toAccountId, dto.amount, dto.fee ?? 0);
        try {
          const created = await this.transfers.create(this.buildPayload(dto, user.sub));
          return created._id.toString();
        } catch (error) {
          await this.revertTransfer(user.sub, dto.fromAccountId, dto.toAccountId, dto.amount, dto.fee ?? 0);
          throw error;
        }
      },
    );

    return this.findDetailed(transferId);
  }

  async update(id: string, dto: UpdateTransferDto, user: JwtUser) {
    const transferId = await runWithOptionalTransaction(
      this.connection,
      async (session) => {
        const current = await this.transfers.findOne({ _id: id, userId: user.sub }).session(session);
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

        await this.applyBalanceDeltas(user.sub, deltas, session);
        current.set({
          ...changes,
          fee: nextFee,
          transferDate: changes.transferDate ? (parseDateInput(changes.transferDate) ?? new Date(changes.transferDate)) : current.transferDate,
        });
        await current.save({ session });
        return current._id.toString();
      },
      async () => {
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
          return current._id.toString();
        } catch (error) {
          await this.rollbackBalanceDeltas(user.sub, deltas);
          throw error;
        }
      },
    );

    return this.findDetailed(transferId);
  }

  async remove(id: string, user: JwtUser, expectedUpdatedAt?: string) {
    return runWithOptionalTransaction(
      this.connection,
      async (session) => {
        const current = await this.transfers.findOne({ _id: id, userId: user.sub }).session(session);
        if (!current) {
          throw new NotFoundException('Transfer not found');
        }

        assertNotStale(current.updatedAt, expectedUpdatedAt);
        await this.revertTransfer(user.sub, current.fromAccountId.toString(), current.toAccountId.toString(), current.amount, current.fee ?? 0, session);
        await current.deleteOne({ session });
        return { success: true };
      },
      async () => {
        const current = await this.transfers.findOne({ _id: id, userId: user.sub });
        if (!current) {
          throw new NotFoundException('Transfer not found');
        }

        assertNotStale(current.updatedAt, expectedUpdatedAt);
        await this.revertTransfer(user.sub, current.fromAccountId.toString(), current.toAccountId.toString(), current.amount, current.fee ?? 0);
        try {
          await current.deleteOne();
          return { success: true };
        } catch (error) {
          await this.applyTransfer(user.sub, current.fromAccountId.toString(), current.toAccountId.toString(), current.amount, current.fee ?? 0);
          throw error;
        }
      },
    );
  }

  private ensureAccountsDiffer(fromAccountId: string, toAccountId: string) {
    if (fromAccountId === toAccountId) {
      throw new BadRequestException('Choose two different accounts');
    }
  }

  private buildPayload(dto: CreateTransferDto, userId: string) {
    return {
      ...dto,
      fee: dto.fee ?? 0,
      userId,
      transferDate: parseDateInput(dto.transferDate) ?? new Date(dto.transferDate),
    };
  }

  private findDetailed(id: string) {
    return this.transfers.findById(id).populate('fromAccountId', 'name number').populate('toAccountId', 'name number').lean();
  }

  private async applyTransfer(userId: string, fromAccountId: string, toAccountId: string, amount: number, fee: number, session?: ClientSession) {
    await this.accounts.adjustBalance(fromAccountId, userId, -(amount + fee), session);

    try {
      await this.accounts.adjustBalance(toAccountId, userId, amount, session);
    } catch (error) {
      await this.accounts.adjustBalance(fromAccountId, userId, amount + fee, session);
      throw error;
    }
  }

  private async revertTransfer(userId: string, fromAccountId: string, toAccountId: string, amount: number, fee: number, session?: ClientSession) {
    await this.accounts.adjustBalance(toAccountId, userId, -amount, session);

    try {
      await this.accounts.adjustBalance(fromAccountId, userId, amount + fee, session);
    } catch (error) {
      await this.accounts.adjustBalance(toAccountId, userId, amount, session);
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

  private async applyBalanceDeltas(userId: string, deltas: Array<{ accountId: string; delta: number }>, session?: ClientSession) {
    const ordered = [...deltas].sort((left, right) => left.delta - right.delta);
    const applied: Array<{ accountId: string; delta: number }> = [];

    try {
      for (const item of ordered) {
        await this.accounts.adjustBalance(item.accountId, userId, item.delta, session);
        applied.push(item);
      }
    } catch (error) {
      await this.rollbackBalanceDeltas(userId, applied, session);
      throw error;
    }
  }

  private async rollbackBalanceDeltas(userId: string, deltas: Array<{ accountId: string; delta: number }>, session?: ClientSession) {
    for (const item of [...deltas].reverse()) {
      try {
        await this.accounts.adjustBalance(item.accountId, userId, -item.delta, session);
      } catch {
        // Best-effort rollback if a later step failed after partial balance updates.
      }
    }
  }
}
