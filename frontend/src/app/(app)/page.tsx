'use client';

import { AlertCircle, ArrowDownRight, ArrowUpRight, Banknote, RefreshCw, WalletCards } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { PeriodTabs, type PeriodValue } from '@/components/PeriodTabs';
import { http } from '@/lib/api';
import { money, shortDate } from '@/lib/format';
import type { DashboardSummary } from '@/lib/types';

const pieColors = ['#2563eb', '#f97316'];

function dateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function StatTile({
  label,
  value,
  tone = 'default',
  icon,
}: {
  label: string;
  value: string;
  tone?: 'default' | 'income' | 'expense';
  icon: ReactNode;
}) {
  return (
    <article className={`dashboardStatCard ${tone}`}>
      <div className="dashboardStatMeta">
        <span>{label}</span>
        <div className="dashboardStatIcon">{icon}</div>
      </div>
      <strong>{value}</strong>
    </article>
  );
}

function PanelEmpty({ title }: { title: string }) {
  return (
    <div className="dashboardEmpty">
      <AlertCircle size={18} />
      <span>{title}</span>
    </div>
  );
}

function rangeLabel(summary: DashboardSummary | null) {
  if (!summary) {
    return '';
  }

  const from = shortDate(summary.range.from);
  const to = shortDate(summary.range.to);
  return from === to ? from : `${from} - ${to}`;
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<PeriodValue>('monthly');
  const [from, setFrom] = useState(dateInputValue());
  const [to, setTo] = useState(dateInputValue());
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestIdRef = useRef(0);
  const isCustom = period === 'custom';

  const loadSummary = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({ period });
      if (period === 'custom') {
        if (from) {
          params.set('from', from);
        }
        if (to) {
          params.set('to', to);
        }
      }

      const response = await http.get<DashboardSummary>(`/dashboard/summary?${params.toString()}`);
      if (requestId !== requestIdRef.current) {
        return;
      }
      setSummary(response);
    } catch (err) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      setError(err instanceof Error ? err.message : 'Could not load dashboard');
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [from, period, to]);

  useEffect(() => {
    loadSummary().catch(console.error);
  }, [loadSummary]);

  const totals = summary?.totals;
  const categoryExpenses = summary?.categoryExpenses ?? [];
  const loanPeople = summary?.loanPeople ?? [];
  const transactionTrend = summary?.trend ?? [];
  const compare = useMemo(() => (summary?.compare ?? []).filter((item) => item.value > 0), [summary]);

  const hasTrendData = transactionTrend.some((item) => item.income > 0 || item.expense > 0);
  const hasCompareData = compare.length > 0;
  const hasExpenseData = categoryExpenses.length > 0;
  const hasLoanData = loanPeople.length > 0 || (totals?.receivable ?? 0) > 0 || (totals?.payable ?? 0) > 0;
  const currentRange = rangeLabel(summary);

  return (
    <div className="dashboardPage">
      <section className="dashboardHeaderCard">
        <div className="dashboardTopRow">
          <div className="dashboardTopRowInfo">
            <span className="summaryHeroEyebrow">Overview</span>
            <strong>{currentRange || 'Selected period'}</strong>
            <p className="dashboardOverviewNote">
              {summary?.accounts.accounts ?? 0} accounts | Balance {money(totals?.accountBalance ?? 0)}
              {loading ? ' | Updating...' : ''}
            </p>
          </div>
          <div className="dashboardTopRowFilters">
            <div className="dashboardFilterGroup">
              <PeriodTabs value={period} onChange={setPeriod} disabled={loading} />
              {isCustom ? (
                <div className="dashboardCustomFilters">
                  <div className="field dashboardDateField">
                    <label>From</label>
                    <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} disabled={loading} />
                  </div>
                  <div className="field dashboardDateField">
                    <label>To</label>
                    <input type="date" value={to} onChange={(event) => setTo(event.target.value)} disabled={loading} />
                  </div>
                  <button
                    className="ghostButton"
                    type="button"
                    onClick={() => {
                      const today = dateInputValue();
                      setFrom(today);
                      setTo(today);
                    }}
                    disabled={loading}
                  >
                    Today
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {error ? (
          <div className="dashboardBanner">
            <span>{error}</span>
            <button className="ghostButton" type="button" onClick={() => loadSummary().catch(console.error)}>
              <RefreshCw size={16} />
              Retry
            </button>
          </div>
        ) : null}

        <div className="dashboardStatsRow">
          <StatTile label="Available Balance" value={money(totals?.accountBalance ?? 0)} icon={<WalletCards size={16} />} />
          <StatTile label="Income" value={money(totals?.income ?? 0)} tone="income" icon={<ArrowDownRight size={16} />} />
          <StatTile label="Expense" value={money(totals?.expense ?? 0)} tone="expense" icon={<ArrowUpRight size={16} />} />
          <StatTile label="To Receive" value={money(totals?.receivable ?? 0)} icon={<Banknote size={16} />} />
          <StatTile label="To Pay" value={money(totals?.payable ?? 0)} icon={<ArrowUpRight size={16} />} />
        </div>
      </section>

      <section className="dashboardPanels">
        <article className="chartPanel dashboardPanel">
          <div className="dashboardPanelHead">
            <h2>Cash Flow</h2>
            <span>{currentRange || 'Selected period'}</span>
          </div>
          <div className="chartBox dashboardChartBox">
            {loading ? (
              <PanelEmpty title="Loading data..." />
            ) : hasTrendData ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={transactionTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" minTickGap={18} />
                  <YAxis tickFormatter={(value) => String(value)} width={70} />
                  <Tooltip formatter={(value) => money(Number(value))} />
                  <Legend />
                  <Line type="monotone" dataKey="income" name="Income" stroke="#16a34a" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="expense" name="Expense" stroke="#dc2626" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <PanelEmpty title="No income or expense data in this period." />
            )}
          </div>
        </article>

        <article className="chartPanel dashboardPanel">
          <div className="dashboardPanelHead">
            <h2>Income vs Expense</h2>
            <span>{currentRange || 'Selected period'}</span>
          </div>
          <div className="chartBox dashboardChartBox">
            {loading ? (
              <PanelEmpty title="Loading data..." />
            ) : hasCompareData ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={compare} dataKey="value" nameKey="name" outerRadius={88} innerRadius={56}>
                    {compare.map((item, index) => (
                      <Cell key={item.name} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => money(Number(value))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <PanelEmpty title="No transaction totals to compare." />
            )}
          </div>
        </article>

        <article className="chartPanel dashboardPanel">
          <div className="dashboardPanelHead">
            <h2>Expense Categories</h2>
            <span>{currentRange || 'Selected period'}</span>
          </div>
          <div className="chartBox dashboardChartBox">
            {loading ? (
              <PanelEmpty title="Loading data..." />
            ) : hasExpenseData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryExpenses}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" minTickGap={10} />
                  <YAxis width={70} />
                  <Tooltip formatter={(value) => money(Number(value))} />
                  <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <PanelEmpty title="No expense categories found for this period." />
            )}
          </div>

          {hasExpenseData ? (
            <div className="dashboardList">
              {categoryExpenses.slice(0, 5).map((item) => (
                <div key={item.categoryId} className="dashboardListRow">
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.count} entries</span>
                  </div>
                  <strong className="amountExpense">{money(item.value)}</strong>
                </div>
              ))}
            </div>
          ) : null}
        </article>

        <article className="chartPanel dashboardPanel">
          <div className="dashboardPanelHead">
            <h2>Loan Position</h2>
            <span>All time</span>
          </div>

          <div className="dashboardLoanGrid">
            <div className="dashboardLoanStat">
              <span>Given</span>
              <strong>{money(totals?.loanLent ?? 0)}</strong>
            </div>
            <div className="dashboardLoanStat">
              <span>Taken</span>
              <strong>{money(totals?.loanBorrowed ?? 0)}</strong>
            </div>
            <div className="dashboardLoanStat">
              <span>To Receive</span>
              <strong>{money(totals?.receivable ?? 0)}</strong>
            </div>
            <div className="dashboardLoanStat">
              <span>To Pay</span>
              <strong>{money(totals?.payable ?? 0)}</strong>
            </div>
          </div>

          {loading ? (
            <PanelEmpty title="Loading data..." />
          ) : hasLoanData ? (
            <div className="dashboardList">
              {loanPeople.slice(0, 5).map((person) => (
                <div key={person.personId} className="dashboardListRow">
                  <div>
                    <strong>{person.name}</strong>
                    <span>
                      Given {money(person.lent)} | Taken {money(person.borrowed)}
                    </span>
                  </div>
                  <strong className={person.net >= 0 ? 'amountIncome' : 'amountExpense'}>{money(person.net)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <PanelEmpty title="No loan data found yet." />
          )}
        </article>
      </section>
    </div>
  );
}
