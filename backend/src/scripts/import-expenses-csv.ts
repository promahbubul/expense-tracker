import 'reflect-metadata';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import mongoose, { type Model, type Types } from 'mongoose';
import { parse } from 'date-fns';
import { Account, AccountSchema } from '../accounts/account.schema';
import { Category, CategorySchema } from '../categories/category.schema';
import { CategoryType, TransactionType } from '../common/types';
import { Transaction, TransactionSchema } from '../transactions/transaction.schema';
import { User, UserSchema } from '../users/user.schema';

type ParsedExpenseRow = {
  rawDate: string;
  transactionDate: Date;
  categoryName: string;
  description: string;
  amount: number;
};

type AppModels = {
  UserModel: Model<User>;
  AccountModel: Model<Account>;
  CategoryModel: Model<Category>;
  TransactionModel: Model<Transaction>;
};

function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env');
  const examplePath = path.resolve(process.cwd(), '.env.example');
  const targetPath = existsSync(envPath) ? envPath : examplePath;

  if (!existsSync(targetPath)) {
    return;
  }

  const content = readFileSync(targetPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function getModels(): AppModels {
  return {
    UserModel: mongoose.models[User.name] as Model<User> ?? mongoose.model(User.name, UserSchema),
    AccountModel: mongoose.models[Account.name] as Model<Account> ?? mongoose.model(Account.name, AccountSchema),
    CategoryModel: mongoose.models[Category.name] as Model<Category> ?? mongoose.model(Category.name, CategorySchema),
    TransactionModel: mongoose.models[Transaction.name] as Model<Transaction> ?? mongoose.model(Transaction.name, TransactionSchema),
  };
}

function parseArgs(argv: string[]) {
  const values = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith('--')) {
      continue;
    }

    const key = current.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      values.set(key, 'true');
      continue;
    }

    values.set(key, next);
    index += 1;
  }

  return {
    file: values.get('file') ?? '',
    email: values.get('email')?.trim().toLowerCase() ?? '',
  };
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function parseCsvLine(line: string) {
  const columns: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      columns.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  columns.push(current);
  return columns;
}

function parseExpenseRows(filePath: string) {
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => line.startsWith('Date,Topic,Details,Expense'));
  if (headerIndex === -1) {
    throw new Error('Could not find the Date,Topic,Details,Expense header in the CSV.');
  }

  const rows: ParsedExpenseRow[] = [];
  let currentDate = '';

  for (let index = headerIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) {
      continue;
    }

    const columns = parseCsvLine(line);
    const rawDate = (columns[0] ?? '').trim();
    const topic = (columns[1] ?? '').trim();
    const details = (columns[2] ?? '').trim();
    const expense = (columns[3] ?? '').trim();

    if (rawDate) {
      currentDate = rawDate;
    }

    if (!currentDate || !topic || !expense) {
      continue;
    }

    const amount = Number(expense.replace(/,/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) {
      continue;
    }

    const transactionDate = parse(currentDate, 'd-M-yy', new Date());
    if (Number.isNaN(transactionDate.getTime())) {
      throw new Error(`Could not parse date "${currentDate}" from the CSV.`);
    }

    rows.push({
      rawDate: currentDate,
      transactionDate,
      categoryName: topic,
      description: details || topic,
      amount,
    });
  }

  return rows;
}

async function resolveTargetUser(models: AppModels, email: string) {
  if (email) {
    const user = await models.UserModel.findOne({ email, isActive: true }).lean();
    if (!user) {
      throw new Error(`Active user not found for email ${email}`);
    }
    return user;
  }

  const users = await models.UserModel.find({ isActive: true }).sort({ createdAt: -1 }).lean();
  const nonDemoUsers = users.filter((user) => normalizeText(user.email) !== 'demo@example.com');

  if (nonDemoUsers.length === 1) {
    return nonDemoUsers[0];
  }

  if (users.length === 1) {
    return users[0];
  }

  throw new Error('Multiple active users found. Re-run with --email <user email>.');
}

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function broadKey(date: Date, categoryName: string, amount: number) {
  return `${dateKey(date)}|${normalizeText(categoryName)}|${amount.toFixed(2)}`;
}

function exactKey(date: Date, categoryName: string, amount: number, description: string) {
  return `${broadKey(date, categoryName, amount)}|${normalizeText(description)}`;
}

async function main() {
  loadEnvFile();
  const args = parseArgs(process.argv.slice(2));

  if (!args.file) {
    throw new Error('Missing --file <absolute-or-relative-csv-path>.');
  }

  const filePath = path.resolve(args.file);
  if (!existsSync(filePath)) {
    throw new Error(`CSV file not found: ${filePath}`);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is missing.');
  }

  await mongoose.connect(uri);

  const models = getModels();
  const user = await resolveTargetUser(models, args.email);
  const wallet = await models.AccountModel.findOne({ userId: user._id, name: 'Main Wallet', isActive: true });
  if (!wallet) {
    throw new Error(`Main Wallet account not found for ${user.email}`);
  }

  const parsedRows = parseExpenseRows(filePath);
  if (!parsedRows.length) {
    throw new Error('No expense rows found in the CSV.');
  }

  const minDate = parsedRows.reduce((min, row) => (row.transactionDate < min ? row.transactionDate : min), parsedRows[0].transactionDate);
  const maxDate = parsedRows.reduce((max, row) => (row.transactionDate > max ? row.transactionDate : max), parsedRows[0].transactionDate);

  const categories = await models.CategoryModel.find({
    userId: user._id,
    type: CategoryType.EXPENSE,
    isActive: true,
  });

  const categoriesByNormalizedName = new Map<string, Category>();
  const categoryNameById = new Map<string, string>();
  for (const category of categories) {
    categoriesByNormalizedName.set(normalizeText(category.name), category);
    categoryNameById.set(category._id.toString(), category.name);
  }

  const existingTransactions = await models.TransactionModel.find({
    userId: user._id,
    type: TransactionType.EXPENSE,
    accountId: wallet._id,
    transactionDate: {
      $gte: new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()),
      $lte: new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate(), 23, 59, 59, 999),
    },
  }).lean();

  const existingBroadCounts = new Map<string, number>();
  const existingExactCounts = new Map<string, number>();

  for (const transaction of existingTransactions) {
    const categoryName = categoryNameById.get(transaction.categoryId.toString()) ?? '';
    const broad = broadKey(transaction.transactionDate, categoryName, transaction.amount);
    const exact = exactKey(transaction.transactionDate, categoryName, transaction.amount, transaction.description);

    existingBroadCounts.set(broad, (existingBroadCounts.get(broad) ?? 0) + 1);
    existingExactCounts.set(exact, (existingExactCounts.get(exact) ?? 0) + 1);
  }

  const consumedBroadCounts = new Map<string, number>();
  const consumedExactCounts = new Map<string, number>();

  const skippedExact: ParsedExpenseRow[] = [];
  const skippedLikelyDuplicate: ParsedExpenseRow[] = [];
  const rowsToInsert: Array<{
    description: string;
    categoryId: Types.ObjectId;
    accountId: Types.ObjectId;
    amount: number;
    transactionDate: Date;
    type: TransactionType;
    userId: Types.ObjectId;
  }> = [];
  const createdCategories: string[] = [];

  for (const row of parsedRows) {
    let category = categoriesByNormalizedName.get(normalizeText(row.categoryName));

    if (!category) {
      category = await models.CategoryModel.create({
        name: row.categoryName,
        type: CategoryType.EXPENSE,
        userId: user._id,
        isActive: true,
      });
      categoriesByNormalizedName.set(normalizeText(category.name), category);
      categoryNameById.set(category._id.toString(), category.name);
      createdCategories.push(category.name);
    }

    const broad = broadKey(row.transactionDate, category.name, row.amount);
    const exact = exactKey(row.transactionDate, category.name, row.amount, row.description);

    const usedExact = consumedExactCounts.get(exact) ?? 0;
    const seenExact = existingExactCounts.get(exact) ?? 0;
    if (usedExact < seenExact) {
      consumedExactCounts.set(exact, usedExact + 1);
      consumedBroadCounts.set(broad, (consumedBroadCounts.get(broad) ?? 0) + 1);
      skippedExact.push(row);
      continue;
    }

    const usedBroad = consumedBroadCounts.get(broad) ?? 0;
    const seenBroad = existingBroadCounts.get(broad) ?? 0;
    if (usedBroad < seenBroad) {
      consumedBroadCounts.set(broad, usedBroad + 1);
      skippedLikelyDuplicate.push(row);
      continue;
    }

    rowsToInsert.push({
      description: row.description,
      categoryId: category._id,
      accountId: wallet._id,
      amount: row.amount,
      transactionDate: row.transactionDate,
      type: TransactionType.EXPENSE,
      userId: user._id,
    });
  }

  const importTotal = rowsToInsert.reduce((sum, row) => sum + row.amount, 0);

  if (importTotal > wallet.currentBalance) {
    throw new Error(
      `Main Wallet balance is ${wallet.currentBalance}, but imported expense total is ${importTotal}. Import stopped to avoid negative balance.`,
    );
  }

  if (rowsToInsert.length) {
    await models.TransactionModel.insertMany(rowsToInsert);
    wallet.currentBalance -= importTotal;
    await wallet.save();
  }

  console.log(
    JSON.stringify(
      {
        user: { id: user._id.toString(), email: user.email, name: user.name },
        account: { id: wallet._id.toString(), name: wallet.name },
        sourceFile: filePath,
        parsedExpenseRows: parsedRows.length,
        createdCategories,
        importedExpenseRows: rowsToInsert.length,
        importedExpenseTotal: importTotal,
        skippedExactDuplicates: skippedExact.length,
        skippedLikelyDuplicates: skippedLikelyDuplicate.length,
        updatedMainWalletBalance: wallet.currentBalance,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error: unknown) => {
    console.error('Expense CSV import failed');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
