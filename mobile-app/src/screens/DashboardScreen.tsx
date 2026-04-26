import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button, Card, EmptyState, Field, Row, Screen, ScreenHeader, SectionTitle, Segmented, Stat } from '../components/ui';
import { api } from '../services/api';
import { DashboardSummary } from '../types';
import { dateInputValue, dateLabel, money } from '../utils/format';

type Period = 'today' | 'yesterday' | 'weekly' | 'monthly' | 'yearly' | 'custom';

function rangeLabel(data: DashboardSummary | null) {
  if (!data?.range) {
    return 'Overview';
  }

  const from = dateLabel(data.range.from);
  const to = dateLabel(data.range.to);
  return from === to ? from : `${from} - ${to}`;
}

export function DashboardScreen() {
  const [period, setPeriod] = useState<Period>('monthly');
  const [from, setFrom] = useState(dateInputValue());
  const [to, setTo] = useState(dateInputValue());
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function load(nextPeriod: Period = period, nextFrom: string = from, nextTo: string = to) {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ period: nextPeriod });
      if (nextPeriod === 'custom') {
        if (nextFrom) params.set('from', nextFrom);
        if (nextTo) params.set('to', nextTo);
      }
      setData(await api<DashboardSummary>(`/dashboard/summary?${params.toString()}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load dashboard');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(period, from, to).catch(console.error);
  }, [period]);

  return (
    <Screen>
      <ScreenHeader eyebrow="Summary" title="Overview" subtitle={rangeLabel(data)} />

      <Segmented
        value={period}
        onChange={setPeriod}
        options={[
          { value: 'today', label: 'Today' },
          { value: 'yesterday', label: 'Yesterday' },
          { value: 'weekly', label: 'Week' },
          { value: 'monthly', label: 'Month' },
          { value: 'yearly', label: 'Year' },
          { value: 'custom', label: 'Custom' },
        ]}
      />

      {period === 'custom' ? (
        <Card>
          <SectionTitle title="Custom Range" />
          <Field label="From" value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" />
          <Field label="To" value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Button label="Apply" ghost onPress={() => load(period, from, to).catch(console.error)} disabled={!from || !to || loading} />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label="Today"
                ghost
                onPress={() => {
                  const today = dateInputValue();
                  setFrom(today);
                  setTo(today);
                  load('custom', today, today).catch(console.error);
                }}
                disabled={loading}
              />
            </View>
          </View>
        </Card>
      ) : null}

      {error ? <EmptyState title={error} /> : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Stat label="Balance" value={money(data?.totals.accountBalance ?? 0)} />
        <Stat label="Income" value={money(data?.totals.income ?? 0)} tone="income" />
        <Stat label="Expense" value={money(data?.totals.expense ?? 0)} tone="expense" />
        <Stat label="To Receive" value={money(data?.totals.receivable ?? 0)} tone="loan" />
        <Stat label="To Pay" value={money(data?.totals.payable ?? 0)} tone="expense" />
      </View>

      <Card>
        <SectionTitle title="Loan Position" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <Stat label="Given" value={money(data?.totals.loanLent ?? 0)} tone="loan" />
          <Stat label="Taken" value={money(data?.totals.loanBorrowed ?? 0)} tone="income" />
        </View>
      </Card>

      <Card>
        <SectionTitle title="Top Expense Categories" />
        {(data?.categoryExpenses ?? []).length ? (
          (data?.categoryExpenses ?? []).slice(0, 6).map((item) => (
            <Row key={item.categoryId} title={item.name} subtitle={`${item.count} entries`} amount={money(item.value)} danger />
          ))
        ) : (
          <EmptyState title={loading ? 'Loading dashboard...' : 'No expense activity yet'} subtitle="Add a few expenses to see category insights here." />
        )}
      </Card>

      <Card>
        <SectionTitle title="Loan People" />
        {(data?.loanPeople ?? []).length ? (
          (data?.loanPeople ?? []).slice(0, 5).map((item) => (
            <Row
              key={item.personId}
              title={item.name}
              subtitle={`Given ${money(item.lent)} - Taken ${money(item.borrowed)}`}
              amount={money(Math.abs(item.net))}
              danger={item.net < 0}
            />
          ))
        ) : (
          <EmptyState title="No loan positions yet" subtitle="Loan summaries will appear here once you start tracking them." />
        )}
      </Card>
    </Screen>
  );
}
