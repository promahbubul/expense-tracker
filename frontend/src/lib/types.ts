export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'UPDATER' | 'HANDLER';
export type CategoryType = 'INCOME' | 'EXPENSE';
export type TransactionType = 'INCOME' | 'EXPENSE';
export type LoanDirection = 'LENT' | 'BORROWED';

export type EntityRef = {
  _id: string;
  name: string;
  number?: string;
  phone?: string;
  type?: string;
};

export type AuthUser = {
  sub: string;
  email: string;
  name: string;
  companyId: string;
  role: UserRole;
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
  categoryId: EntityRef | string;
  accountId: EntityRef | string;
  amount: number;
  transactionDate: string;
  type: TransactionType;
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
  personId: EntityRef | string;
  accountId: EntityRef | string;
  direction: LoanDirection;
  amount: number;
  purpose: string;
  loanDate: string;
};

export type Company = {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  details?: string;
  status: 'ACTIVE' | 'DISABLED';
};

export type ManagedUser = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
};

export type DashboardSummary = {
  period: string;
  range: { from: string; to: string };
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
  compare: Array<{ name: string; value: number }>;
  categoryExpenses: Array<{ categoryId: string; name: string; value: number; count: number }>;
  loanPeople: Array<{ personId: string; name: string; phone?: string; lent: number; borrowed: number; net: number }>;
  accounts: { totalBalance: number; accounts: number };
};

export type ReportStatement = {
  range: { from: string; to: string };
  type: string;
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
