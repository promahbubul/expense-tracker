import 'reflect-metadata';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import * as bcrypt from 'bcryptjs';
import mongoose, { type Model, type Types } from 'mongoose';
import { Account, AccountSchema } from '../accounts/account.schema';
import { Category, CategorySchema } from '../categories/category.schema';
import { CategoryType } from '../common/types';
import { LoanPerson, LoanPersonSchema } from '../loans/loan-person.schema';
import { Loan, LoanSchema } from '../loans/loan.schema';
import { Transfer, TransferSchema } from '../transfers/transfer.schema';
import { Transaction, TransactionSchema } from '../transactions/transaction.schema';
import { User, UserSchema } from '../users/user.schema';

type AppModels = {
  UserModel: Model<User>;
  AccountModel: Model<Account>;
  CategoryModel: Model<Category>;
  TransactionModel: Model<Transaction>;
  LoanModel: Model<Loan>;
  LoanPersonModel: Model<LoanPerson>;
  TransferModel: Model<Transfer>;
};

type Migration = {
  id: string;
  run: (models: AppModels) => Promise<void>;
};

const starterCategories = [
  { name: 'Salary', type: CategoryType.INCOME },
  { name: 'Freelance', type: CategoryType.INCOME },
  { name: 'Business', type: CategoryType.INCOME },
  { name: 'Food', type: CategoryType.EXPENSE },
  { name: 'Transport', type: CategoryType.EXPENSE },
  { name: 'Bills', type: CategoryType.EXPENSE },
  { name: 'Shopping', type: CategoryType.EXPENSE },
];

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
    LoanModel: mongoose.models[Loan.name] as Model<Loan> ?? mongoose.model(Loan.name, LoanSchema),
    LoanPersonModel: mongoose.models[LoanPerson.name] as Model<LoanPerson> ?? mongoose.model(LoanPerson.name, LoanPersonSchema),
    TransferModel: mongoose.models[Transfer.name] as Model<Transfer> ?? mongoose.model(Transfer.name, TransferSchema),
  };
}

async function syncAllIndexes(models: AppModels) {
  const pairs: Array<[string, Model<unknown>]> = [
    ['users', models.UserModel as unknown as Model<unknown>],
    ['accounts', models.AccountModel as unknown as Model<unknown>],
    ['categories', models.CategoryModel as unknown as Model<unknown>],
    ['transactions', models.TransactionModel as unknown as Model<unknown>],
    ['loans', models.LoanModel as unknown as Model<unknown>],
    ['loan-people', models.LoanPersonModel as unknown as Model<unknown>],
    ['transfers', models.TransferModel as unknown as Model<unknown>],
  ];

  for (const [label, model] of pairs) {
    await model.syncIndexes();
    console.log(`- indexes synced for ${label}`);
  }
}

const migrations: Migration[] = [
  {
    id: '2026-04-25-normalize-user-emails',
    async run({ UserModel }) {
      const users = await UserModel.find({}, { _id: 1, email: 1, name: 1 }).lean();
      for (const user of users) {
        const rawEmail = typeof user.email === 'string' ? user.email : '';
        const email = rawEmail.trim().toLowerCase();
        const name = typeof user.name === 'string' && user.name.trim() ? user.name.trim() : email.split('@')[0] || 'User';

        if (email !== rawEmail || name !== user.name) {
          await UserModel.updateOne({ _id: user._id }, { $set: { email, name } });
        }
      }
    },
  },
  {
    id: '2026-04-25-backfill-active-flags',
    async run({ UserModel, AccountModel, CategoryModel, LoanPersonModel }) {
      await Promise.all([
        UserModel.updateMany({ isActive: { $exists: false } }, { $set: { isActive: true } }),
        AccountModel.updateMany({ isActive: { $exists: false } }, { $set: { isActive: true } }),
        CategoryModel.updateMany({ isActive: { $exists: false } }, { $set: { isActive: true } }),
        LoanPersonModel.updateMany({ isActive: { $exists: false } }, { $set: { isActive: true } }),
      ]);
    },
  },
  {
    id: '2026-04-25-backfill-account-balances',
    async run({ AccountModel }) {
      const accounts = await AccountModel.find(
        { $or: [{ currentBalance: { $exists: false } }, { currentBalance: null }] },
        { _id: 1, initialBalance: 1 },
      ).lean();

      for (const account of accounts) {
        await AccountModel.updateOne(
          { _id: account._id },
          { $set: { currentBalance: typeof account.initialBalance === 'number' ? account.initialBalance : 0 } },
        );
      }
    },
  },
];

async function runMigrations(models: AppModels) {
  const collection = mongoose.connection.collection('app_migrations');
  const applied = await collection.find({}, { projection: { _id: 0, id: 1 } }).toArray();
  const appliedIds = new Set(applied.map((entry) => String(entry.id)));

  for (const migration of migrations) {
    if (appliedIds.has(migration.id)) {
      console.log(`- migration skipped: ${migration.id}`);
      continue;
    }

    await migration.run(models);
    await collection.insertOne({ id: migration.id, executedAt: new Date() });
    console.log(`- migration applied: ${migration.id}`);
  }
}

function displayNameFromEmail(email: string) {
  const localPart = email.split('@')[0] ?? 'User';
  const cleaned = localPart.replace(/[._-]+/g, ' ').trim();
  if (!cleaned) {
    return 'User';
  }

  return cleaned
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

async function ensureWorkspace(models: AppModels, userId: Types.ObjectId) {
  const { AccountModel, CategoryModel } = models;

  await AccountModel.updateOne(
    { userId, name: 'Main Wallet', isActive: true },
    {
      $setOnInsert: {
        name: 'Main Wallet',
        details: 'Personal cash balance',
        initialBalance: 0,
        currentBalance: 0,
        userId,
        isActive: true,
      },
    },
    { upsert: true },
  );

  for (const category of starterCategories) {
    await CategoryModel.updateOne(
      { userId, type: category.type, name: category.name, isActive: true },
      {
        $setOnInsert: {
          userId,
          type: category.type,
          name: category.name,
          isActive: true,
        },
      },
      { upsert: true },
    );
  }
}

async function runSeed(models: AppModels) {
  const { UserModel } = models;
  const seedEmail = (process.env.SEED_EMAIL ?? 'demo@example.com').trim().toLowerCase();
  const seedPassword = (process.env.SEED_PASSWORD ?? 'password123').trim();
  const seedName = (process.env.SEED_NAME ?? displayNameFromEmail(seedEmail)).trim();
  const seedPhone = process.env.SEED_PHONE?.trim() || undefined;

  let user = await UserModel.findOne({ email: seedEmail });

  if (!user) {
    user = await UserModel.create({
      name: seedName,
      email: seedEmail,
      phone: seedPhone,
      password: await bcrypt.hash(seedPassword, 10),
      isActive: true,
    });
    console.log(`- seed user created: ${seedEmail}`);
  } else {
    const updates: Partial<Record<'name' | 'phone' | 'isActive', string | boolean | undefined>> = {};
    if (!user.name?.trim()) {
      updates.name = seedName;
    }
    if (!user.phone && seedPhone) {
      updates.phone = seedPhone;
    }
    if (!user.isActive) {
      updates.isActive = true;
    }
    if (Object.keys(updates).length) {
      await UserModel.updateOne({ _id: user._id }, { $set: updates });
    }
    console.log(`- seed user exists: ${seedEmail}`);
  }

  await ensureWorkspace(models, user._id);
  console.log('- starter wallet and categories ensured');
}

async function main() {
  loadEnvFile();

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is missing. Set it in backend/.env before running db:setup.');
  }

  console.log(`Connecting to ${uri}`);
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const models = getModels();

  console.log('Running migrations...');
  await runMigrations(models);

  console.log('Syncing indexes...');
  await syncAllIndexes(models);

  console.log('Running seed...');
  await runSeed(models);

  console.log('Database setup complete');
}

main()
  .catch((error: unknown) => {
    console.error('Database setup failed');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
