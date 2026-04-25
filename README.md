# Money Journal

Personal finance tracker built with NestJS, MongoDB, Next.js, and Expo.

## Apps

- `backend`: NestJS API with JWT auth, user-scoped accounts, categories, incomes, expenses, loans, dashboard, and reports.
- `frontend`: Next.js web app with modern dashboard, CRUD screens, signup, forgot/reset password, and PDF reports.
- `mobile-app`: Expo mobile app with refreshed UI, signup/login/reset flows, and the same backend integration.

## Local Setup

```bash
npm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
npm run dev
```

API runs on `http://localhost:4000` and web runs on `http://localhost:3000`.

## Database

Make sure MongoDB is running locally and your backend env uses:

```env
MONGODB_URI=mongodb://localhost:27017/expense-tracker-personal
```

One command to run migrations and seed starter data:

```bash
npm run db:setup
```

Optional seed env values:

```env
SEED_EMAIL=demo@example.com
SEED_PASSWORD=password123
SEED_NAME=Demo User
```

## Mobile App

```bash
cd mobile-app
npm install
cp .env.example .env
npm start
```

- Android emulator: `EXPO_PUBLIC_API_URL=http://10.0.2.2:4000/api`
- Physical phone: use your computer LAN IP, for example `http://192.168.0.100:4000/api`

## Current Flow

- Signup creates a personal workspace with a default wallet and starter categories.
- Login, forgot password, and reset password are available on web and mobile.
- Account balances update automatically when incomes, expenses, and loans are created, edited, or deleted.
- Dashboard shows daily, weekly, monthly, yearly, and custom-range insights.
- Reports support weekly, monthly, yearly, and custom filters with PDF export on the web app.
