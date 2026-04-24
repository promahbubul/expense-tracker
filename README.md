# Expense Tracker

Full-stack expense tracker using NestJS, MongoDB, and Next.js.

## Apps

- `backend`: NestJS API with MongoDB/Mongoose, JWT auth, company scoping, accounts, categories, incomes, expenses, loans, dashboard, and reports.
- `frontend`: Next.js App Router frontend with dashboard charts, CRUD screens, loan workflows, reports, companies, users, and settings.
- `mobile-app`: Expo mobile app with compact screens and bottom navigation for the same backend.

## Manual Setup

```bash
npm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
npm run dev
```

API runs on `http://localhost:4000` and web runs on `http://localhost:3000`.
The frontend currency defaults to `BDT` and can be changed with `NEXT_PUBLIC_CURRENCY`.

Before running `npm run dev`, start MongoDB manually and make sure `backend/.env` has the correct URI:

```env
MONGODB_URI=mongodb://localhost:27017/expense-tracker
```

You can also use MongoDB Atlas by replacing `MONGODB_URI` with your Atlas connection string.

## Mobile App

```bash
cd mobile-app
npm install
cp .env.example .env
npm run start
```

Set `EXPO_PUBLIC_API_URL` to the backend API. Android emulator usually needs `http://10.0.2.2:4000/api`; physical devices need your computer's LAN IP.

## Implemented Flow

- Signup/login with JWT; signup creates a company automatically.
- Super admins can list companies; admins see and manage their own workspace. Add owner emails in `SUPER_ADMIN_EMAILS`.
- Account balances update when incomes, expenses, and loans are created, edited, or deleted.
- Expenses and incomes support account/category/date/amount entry plus date range filtering.
- Loan accounts store person/contact details; loan entries support lent and borrowed money.
- Dashboard exposes daily, yesterday, weekly, monthly, and yearly income/expense totals, income-vs-expense comparison, category expense totals, and account balance totals.
- Reports support weekly, monthly, yearly, and custom ranges with all/income/expense/loan filters plus PDF download/share from the web app.

This workspace currently has no local Node/npm installation available, so dependencies could not be installed or verified here.
