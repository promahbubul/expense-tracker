import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AccountsService } from '../accounts/accounts.service';
import { JwtUser } from '../common/types';
import { buildDateFilter, parseDateInput } from '../common/utils/date-range';
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

    const nextFromAccountId = dto.fromAccountId ?? current.fromAccountId.toString();
    const nextToAccountId = dto.toAccountId ?? current.toAccountId.toString();
    const nextAmount = dto.amount ?? current.amount;
    const nextFee = dto.fee ?? current.fee ?? 0;

    this.ensureAccountsDiffer(nextFromAccountId, nextToAccountId);

    await this.revertTransfer(user.sub, current.fromAccountId.toString(), current.toAccountId.toString(), current.amount, current.fee ?? 0);

    try {
      await this.applyTransfer(user.sub, nextFromAccountId, nextToAccountId, nextAmount, nextFee);
      current.set({
        ...dto,
        fee: nextFee,
        transferDate: dto.transferDate ? (parseDateInput(dto.transferDate) ?? new Date(dto.transferDate)) : current.transferDate,
      });
      await current.save();
      return this.transfers.findById(current._id).populate('fromAccountId', 'name number').populate('toAccountId', 'name number').lean();
    } catch (error) {
      await this.applyTransfer(
        user.sub,
        current.fromAccountId.toString(),
        current.toAccountId.toString(),
        current.amount,
        current.fee ?? 0,
      );
      throw error;
    }
  }

  async remove(id: string, user: JwtUser) {
    const current = await this.transfers.findOne({ _id: id, userId: user.sub });
    if (!current) {
      throw new NotFoundException('Transfer not found');
    }

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
}
