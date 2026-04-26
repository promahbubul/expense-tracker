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
};

export type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};

export type PasswordResetSession = {
  success: boolean;
  resetToken: string;
  expiresAt: string;
  message: string;
};

export type Account = {
  _id: string;
  name: string;
  number?: string;
  details?: string;
  initialBalance: number;
  currentBalance: number;
};

export type Transfer = {
  _id: string;
  fromAccountId: EntityRef | string;
  toAccountId: EntityRef | string;
  amount: number;
  fee: number;
  note: string;
  transferDate: string;
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
    transferAmount: number;
    transferFee: number;
  };
};
