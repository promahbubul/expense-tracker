export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  UPDATER = 'UPDATER',
  HANDLER = 'HANDLER',
}

export function normalizeUserRole(role?: string): UserRole {
  if (role === 'SUPER_USER') return UserRole.SUPER_ADMIN;
  if (role === 'COMPANY_USER') return UserRole.ADMIN;
  if (role === 'NORMAL_USER') return UserRole.HANDLER;
  if (role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN || role === UserRole.UPDATER || role === UserRole.HANDLER) {
    return role;
  }
  return UserRole.HANDLER;
}

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
  companyId: string;
  role: UserRole;
};
