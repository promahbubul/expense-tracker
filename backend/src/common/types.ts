export enum CategoryType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum LoanDirection {
  LENT = 'LENT',
  BORROWED = 'BORROWED',
}

export type JwtUser = {
  sub: string;
  email: string;
  name: string;
};
