export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'UPDATER' | 'HANDLER';
export type CategoryType = 'INCOME' | 'EXPENSE';

export type AuthUser = {
  sub: string;
  email: string;
  name: string;
  companyId: string;
  role: UserRole;
};

export type Ref = {
  _id: string;
  name: string;
  number?: string;
  phone?: string;
};

export type Account = {
  _id: string;
  name: string;
  number?: string;
  details?: string;
  initialBalance: number;
  currentBalance: number;
};

export type Category = {
  _id: string;
  name: string;
  type: CategoryType;
};

export type Transaction = {
  _id: string;
  description: string;
  categoryId: Ref | string;
  accountId: Ref | string;
  amount: number;
  transactionDate: string;
  type: 'INCOME' | 'EXPENSE';
};

export type LoanPerson = {
  _id: string;
  name: string;
  phone?: string;
  address?: string;
  details?: string;
};

export type Loan = {
  _id: string;
  personId: Ref | string;
  accountId: Ref | string;
  direction: 'LENT' | 'BORROWED';
  amount: number;
  purpose: string;
  loanDate: string;
};

export type DashboardSummary = {
  totals: {
    income: number;
    expense: number;
    loanBorrowed: number;
    loanLent: number;
    receivable: number;
    payable: number;
    accountBalance: number;
  };
  trend: Array<{ date: string; income: number; expense: number }>;
  categoryExpenses: Array<{ categoryId: string; name: string; value: number; count: number }>;
};

export type ReportStatement = {
  rows: Array<{
    id: string;
    kind: string;
    date: string;
    description: string;
    account: string;
    category: string;
    amount: number;
  }>;
  totals: {
    income: number;
    expense: number;
    loanBorrowed: number;
    loanLent: number;
  };
};
