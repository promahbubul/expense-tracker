import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Account } from '../accounts/account.schema';
import { Category } from '../categories/category.schema';
import { CategoryType, JwtUser, LoanDirection, TransactionType } from '../common/types';
import { RangePreset, resolveDateRange } from '../common/utils/date-range';
import { LoanPerson } from '../loans/loan-person.schema';
import { Loan } from '../loans/loan.schema';
import { Transaction } from '../transactions/transaction.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Transaction.name) private readonly transactions: Model<Transaction>,
    @InjectModel(Account.name) private readonly accounts: Model<Account>,
    @InjectModel(Category.name) private readonly categories: Model<Category>,
    @InjectModel(Loan.name) private readonly loans: Model<Loan>,
    @InjectModel(LoanPerson.name) private readonly loanPeople: Model<LoanPerson>,
  ) {}

  async summary(user: JwtUser, period: RangePreset = 'today') {
    const range = resolveDateRange(period);
    const [transactionTotals, loanTotals, accountTotals, trend, categoryExpenses, loanPeople] = await Promise.all([
      this.transactionTotals(user.sub, range.from, range.to),
      this.loanTotals(user.sub, range.from, range.to),
      this.accountTotals(user.sub),
      this.trend(user.sub, range.from, range.to),
      this.categoryExpenseTotals(user.sub, range.from, range.to),
      this.loanPeopleSummary(user.sub, range.from, range.to),
    ]);

    return {
      period,
      range,
      totals: {
        income: transactionTotals.income,
        expense: transactionTotals.expense,
        loanBorrowed: loanTotals.borrowed,
        loanLent: loanTotals.lent,
        receivable: loanTotals.lent,
        payable: loanTotals.borrowed,
        accountBalance: accountTotals.totalBalance,
      },
      compare: [
        { name: 'Income', value: transactionTotals.income },
        { name: 'Expense', value: transactionTotals.expense },
      ],
      trend,
      categoryExpenses,
      loanPeople,
      accounts: accountTotals,
    };
  }

  private async transactionTotals(userId: string, from: Date, to: Date) {
    const rows = await this.transactions.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          transactionDate: { $gte: from, $lte: to },
        },
      },
      { $group: { _id: '$type', total: { $sum: '$amount' } } },
    ]);

    return {
      income: rows.find((row) => row._id === TransactionType.INCOME)?.total ?? 0,
      expense: rows.find((row) => row._id === TransactionType.EXPENSE)?.total ?? 0,
    };
  }

  private async loanTotals(userId: string, from: Date, to: Date) {
    const rows = await this.loans.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          loanDate: { $gte: from, $lte: to },
        },
      },
      { $group: { _id: '$direction', total: { $sum: '$amount' } } },
    ]);

    return {
      borrowed: rows.find((row) => row._id === LoanDirection.BORROWED)?.total ?? 0,
      lent: rows.find((row) => row._id === LoanDirection.LENT)?.total ?? 0,
    };
  }

  private async accountTotals(userId: string) {
    const rows = await this.accounts.aggregate([
      { $match: { userId: new Types.ObjectId(userId), isActive: true } },
      { $group: { _id: null, totalBalance: { $sum: '$currentBalance' }, accounts: { $sum: 1 } } },
    ]);
    return rows[0] ?? { totalBalance: 0, accounts: 0 };
  }

  private async trend(userId: string, from: Date, to: Date) {
    const rows = await this.transactions.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          transactionDate: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$transactionDate' } },
            type: '$type',
          },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]);

    const byDate = new Map<string, { date: string; income: number; expense: number }>();
    for (const row of rows) {
      const date = row._id.date;
      const current = byDate.get(date) ?? { date, income: 0, expense: 0 };
      if (row._id.type === TransactionType.INCOME) {
        current.income = row.total;
      }
      if (row._id.type === TransactionType.EXPENSE) {
        current.expense = row.total;
      }
      byDate.set(date, current);
    }
    return Array.from(byDate.values());
  }

  private async categoryExpenseTotals(userId: string, from: Date, to: Date) {
    const rows = await this.transactions.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          type: TransactionType.EXPENSE,
          transactionDate: { $gte: from, $lte: to },
        },
      },
      { $group: { _id: '$categoryId', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]);

    const categories = await this.categories.find({ userId, type: CategoryType.EXPENSE }).lean();
    return rows.map((row) => ({
      categoryId: row._id.toString(),
      name: categories.find((category) => category._id.toString() === row._id.toString())?.name ?? 'Uncategorized',
      value: row.total,
      count: row.count,
    }));
  }

  private async loanPeopleSummary(userId: string, from: Date, to: Date) {
    const rows = await this.loans.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          loanDate: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: { personId: '$personId', direction: '$direction' },
          total: { $sum: '$amount' },
        },
      },
    ]);

    const personIds = rows.map((row) => row._id.personId);
    const people = await this.loanPeople.find({ _id: { $in: personIds }, userId }).lean();
    const grouped = new Map<string, { personId: string; name: string; phone?: string; lent: number; borrowed: number; net: number }>();

    for (const row of rows) {
      const personId = row._id.personId.toString();
      const person = people.find((item) => item._id.toString() === personId);
      const current = grouped.get(personId) ?? {
        personId,
        name: person?.name ?? 'Unknown',
        phone: person?.phone,
        lent: 0,
        borrowed: 0,
        net: 0,
      };
      if (row._id.direction === LoanDirection.LENT) {
        current.lent = row.total;
      }
      if (row._id.direction === LoanDirection.BORROWED) {
        current.borrowed = row.total;
      }
      current.net = current.lent - current.borrowed;
      grouped.set(personId, current);
    }

    return Array.from(grouped.values()).sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  }
}
