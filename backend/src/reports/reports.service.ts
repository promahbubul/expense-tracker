import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LoanDirection, JwtUser, TransactionType } from '../common/types';
import { RangePreset, resolveDateRange } from '../common/utils/date-range';
import { Loan } from '../loans/loan.schema';
import { Transaction } from '../transactions/transaction.schema';

type ReportType = 'all' | 'income' | 'expense' | 'loan';
type ReportRow = {
  id: string;
  kind: string;
  date: Date;
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
          description: item.purpose,
          account: this.displayName(item.accountId),
          category: this.displayName(item.personId),
          amount: item.amount,
        })),
      );
    }

    rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      range,
      type,
      rows,
      totals: {
        income: rows.filter((row) => row.kind === 'income').reduce((sum, row) => sum + row.amount, 0),
        expense: rows.filter((row) => row.kind === 'expense').reduce((sum, row) => sum + row.amount, 0),
        loanBorrowed: rows.filter((row) => row.kind === 'loan-borrowed').reduce((sum, row) => sum + row.amount, 0),
        loanLent: rows.filter((row) => row.kind === 'loan-lent').reduce((sum, row) => sum + row.amount, 0),
      },
    };
  }

  private displayName(value: unknown) {
    if (value && typeof value === 'object' && 'name' in value) {
      return String((value as { name: string }).name);
    }
    return '';
  }
}
