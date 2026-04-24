'use client';

import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Banknote, HandCoins, ReceiptText, TrendingUp, Users, WalletCards } from 'lucide-react';
import { PeriodTabs, type PeriodValue } from '@/components/PeriodTabs';
import { StatCard } from '@/components/StatCard';
import { http } from '@/lib/api';
import { money } from '@/lib/format';
import type { DashboardSummary } from '@/lib/types';

const pieColors = ['#1f9d73', '#d85c4a'];

export default function DashboardPage() {
  const [period, setPeriod] = useState<PeriodValue>('today');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    http.get<DashboardSummary>(`/dashboard/summary?period=${period}`).then(setSummary).catch(console.error);
  }, [period]);

  const totals = summary?.totals;
  const categoryExpenses = summary?.categoryExpenses ?? [];
  const loanPeople = summary?.loanPeople ?? [];

  return (
    <>
      <div className="pageHeader">
        <div>
          <h1>Dashboard</h1>
          <p>Income, expense, loan, category, and receivable position.</p>
        </div>
        <PeriodTabs value={period} onChange={setPeriod} />
      </div>

      <section className="metricGrid">
        <StatCard label="Incomes" value={money(totals?.income ?? 0)} tone="income" icon={TrendingUp} />
        <StatCard label="Expenses" value={money(totals?.expense ?? 0)} tone="expense" icon={ReceiptText} />
        <StatCard label="Loan Given" value={money(totals?.loanLent ?? 0)} tone="loan" icon={HandCoins} />
        <StatCard label="Receivable" value={money(totals?.receivable ?? 0)} tone="loan" icon={Users} detail="People owe you" />
        <StatCard label="Balance" value={money(totals?.accountBalance ?? 0)} icon={WalletCards} detail={`${summary?.accounts.accounts ?? 0} accounts`} />
      </section>

      <section className="dashboardGrid">
        <article className="chartPanel">
          <h2>Expenses vs Income</h2>
          <div className="chartBox">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={summary?.trend ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" minTickGap={18} />
                <YAxis tickFormatter={(value) => String(value)} width={70} />
                <Tooltip formatter={(value) => money(Number(value))} />
                <Legend />
                <Line type="monotone" dataKey="income" stroke="#1f9d73" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="expense" stroke="#d85c4a" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="chartPanel">
          <h2>Income vs Expense</h2>
          <div className="chartBox">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={summary?.compare ?? []} dataKey="value" nameKey="name" outerRadius={100} label>
                  {(summary?.compare ?? []).map((item, index) => (
                    <Cell key={item.name} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => money(Number(value))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="dashboardGrid">
        <div className="dashboardStack">
          <article className="chartPanel">
            <h2>Expense Categories</h2>
            <div className="chartBox">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryExpenses}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" minTickGap={10} />
                  <YAxis width={70} />
                  <Tooltip formatter={(value) => money(Number(value))} />
                  <Bar dataKey="value" fill="#166b8f" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Entries</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {categoryExpenses.map((item) => (
                  <tr key={item.categoryId}>
                    <td>{item.name}</td>
                    <td>{item.count}</td>
                    <td className="amountExpense">{money(item.value)}</td>
                  </tr>
                ))}
                {!categoryExpenses.length ? (
                  <tr>
                    <td colSpan={3} className="muted">
                      No expense category data.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="dashboardStack">
          <article className="chartPanel">
            <h2>Loan Position</h2>
            <div className="accountStat">
              <Banknote size={28} />
              <span>Borrowed</span>
              <strong>{money(totals?.loanBorrowed ?? 0)}</strong>
              <p className="muted">Payable: {money(totals?.payable ?? 0)}</p>
            </div>
          </article>

          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Given</th>
                  <th>Borrowed</th>
                  <th>Net</th>
                </tr>
              </thead>
              <tbody>
                {loanPeople.map((person) => (
                  <tr key={person.personId}>
                    <td title={person.phone}>{person.name}</td>
                    <td>{money(person.lent)}</td>
                    <td>{money(person.borrowed)}</td>
                    <td className={person.net >= 0 ? 'amountIncome' : 'amountExpense'}>{money(person.net)}</td>
                  </tr>
                ))}
                {!loanPeople.length ? (
                  <tr>
                    <td colSpan={4} className="muted">
                      No loan data found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
