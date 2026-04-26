import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LoanDirection, JwtUser, TransactionType } from '../common/types';
import { RangePreset, resolveDateRange } from '../common/utils/date-range';
import { Loan } from '../loans/loan.schema';
import { Transfer } from '../transfers/transfer.schema';
import { Transaction } from '../transactions/transaction.schema';

type ReportType = 'all' | 'income' | 'expense' | 'loan' | 'transfer';
type ReportRow = {
  id: string;
  kind: string;
  date: Date;
  createdAt: Date;
  description: string;
  account: string;
  category: string;
  amount: number;
};

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Transaction.name) private readonly transactions: Model<Transaction>,
    @InjectModel(Loan.name) private readonly loans: Model<Loan>,
    @InjectModel(Transfer.name) private readonly transfers: Model<Transfer>,
  ) {}

  async statement(user: JwtUser, period: RangePreset = 'monthly', type: ReportType = 'all', from?: string, to?: string) {
    const range = resolveDateRange(period, from, to);
    const rows: ReportRow[] = [];

    if (type === 'all' || type === 'income' || type === 'expense') {
      const transactionFilter: Record<string, unknown> = {
        userId: user.sub,
        transactionDate: { $gte: range.from, $lte: range.to },
      };
      if (type === 'income') {
        transactionFilter.type = TransactionType.INCOME;
      }
      if (type === 'expense') {
        transactionFilter.type = TransactionType.EXPENSE;
      }

      const transactions = await this.transactions
        .find(transactionFilter)
        .populate('categoryId', 'name type')
        .populate('accountId', 'name number')
        .lean();

      rows.push(
        ...transactions.map((item) => ({
          id: item._id.toString(),
          kind: item.type.toLowerCase(),
          date: item.transactionDate,
          createdAt: this.createdAtValue(item),
          description: item.description,
          account: this.displayName(item.accountId),
          category: this.displayName(item.categoryId),
          amount: item.amount,
        })),
      );
    }

    if (type === 'all' || type === 'loan') {
      const loans = await this.loans
        .find({
          userId: user.sub,
          loanDate: { $gte: range.from, $lte: range.to },
        })
        .populate('personId', 'name phone')
        .populate('accountId', 'name number')
        .lean();

      rows.push(
        ...loans.map((item) => ({
          id: item._id.toString(),
          kind: item.direction === LoanDirection.BORROWED ? 'loan-borrowed' : 'loan-lent',
          date: item.loanDate,
          createdAt: this.createdAtValue(item),
          description: item.purpose,
          account: this.displayName(item.accountId),
          category: this.displayName(item.personId),
          amount: item.amount,
        })),
      );
    }

    if (type === 'all' || type === 'transfer' || type === 'expense') {
      const transfers = await this.transfers
        .find({
          userId: user.sub,
          transferDate: { $gte: range.from, $lte: range.to },
        })
        .populate('fromAccountId', 'name number')
        .populate('toAccountId', 'name number')
        .lean();

      if (type === 'all' || type === 'transfer') {
        rows.push(
          ...transfers.map((item) => ({
            id: item._id.toString(),
            kind: 'transfer',
            date: item.transferDate,
            createdAt: this.createdAtValue(item),
            description: item.note,
            account: this.displayName(item.fromAccountId),
            category: `${this.displayName(item.fromAccountId)} -> ${this.displayName(item.toAccountId)}`,
            amount: item.amount,
          })),
        );
      }

      rows.push(
        ...transfers
          .filter((item) => item.fee > 0)
          .map((item) => ({
            id: `${item._id.toString()}-fee`,
            kind: 'transfer-fee',
            date: item.transferDate,
            createdAt: this.createdAtValue(item),
            description: item.note,
            account: this.displayName(item.fromAccountId),
            category: 'Transfer Fee',
            amount: item.fee,
          })),
      );
    }

    rows.sort((a, b) => {
      const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateCompare !== 0) {
        return dateCompare;
      }

      const createdCompare = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (createdCompare !== 0) {
        return createdCompare;
      }

      return b.id.localeCompare(a.id);
    });

    return {
      range,
      type,
      rows: rows.map(({ createdAt: _createdAt, ...row }) => row),
      totals: {
        income: rows.filter((row) => row.kind === 'income').reduce((sum, row) => sum + row.amount, 0),
        expense: rows.filter((row) => row.kind === 'expense' || row.kind === 'transfer-fee').reduce((sum, row) => sum + row.amount, 0),
        loanBorrowed: rows.filter((row) => row.kind === 'loan-borrowed').reduce((sum, row) => sum + row.amount, 0),
        loanLent: rows.filter((row) => row.kind === 'loan-lent').reduce((sum, row) => sum + row.amount, 0),
        transferAmount: rows.filter((row) => row.kind === 'transfer').reduce((sum, row) => sum + row.amount, 0),
        transferFee: rows.filter((row) => row.kind === 'transfer-fee').reduce((sum, row) => sum + row.amount, 0),
      },
    };
  }

  private displayName(value: unknown) {
    if (value && typeof value === 'object' && 'name' in value) {
      return String((value as { name: string }).name);
    }
    return '';
  }

  private createdAtValue(value: unknown) {
    if (value && typeof value === 'object' && 'createdAt' in value) {
      const raw = (value as { createdAt?: Date | string }).createdAt;
      if (raw) {
        return new Date(raw);
      }
    }

    return new Date(0);
  }
}
