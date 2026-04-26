import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Card, Chip, EmptyState, Field, Row, Screen, ScreenHeader, SectionTitle, Segmented, Stat } from '../components/ui';
import { api } from '../services/api';
import { ReportStatement } from '../types';
import { dateInputValue, dateLabel, money } from '../utils/format';

type Period = 'weekly' | 'monthly' | 'yearly' | 'custom';
type ReportType = 'all' | 'income' | 'expense' | 'loan' | 'transfer';

function kindLabel(kind: string) {
  return (
    {
      income: 'Income',
      expense: 'Expense',
      'loan-borrowed': 'Taken',
      'loan-lent': 'Given',
      transfer: 'Transfer',
      'transfer-fee': 'Transfer Fee',
    } as Record<string, string>
  )[kind] ?? kind;
}

export function ReportsScreen() {
  const [period, setPeriod] = useState<Period>('monthly');
  const [type, setType] = useState<ReportType>('all');
  const [from, setFrom] = useState(dateInputValue());
  const [to, setTo] = useState(dateInputValue());
  const [data, setData] = useState<ReportStatement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function load(nextPeriod: Period = period, nextType: ReportType = type, nextFrom: string = from, nextTo: string = to) {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ period: nextPeriod, type: nextType });
      if (nextPeriod === 'custom') {
        if (nextFrom) params.set('from', nextFrom);
        if (nextTo) params.set('to', nextTo);
      }
      setData(await api<ReportStatement>(`/reports/statement?${params.toString()}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load reports');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(period, type, from, to).catch(console.error);
  }, [period, type]);

  function clearFilters() {
    const today = dateInputValue();
    setPeriod('monthly');
    setType('all');
    setFrom(today);
    setTo(today);
    load('monthly', 'all', today, today).catch(console.error);
  }

  return (
    <Screen>
      <ScreenHeader eyebrow="Statements" title="Reports" subtitle={data?.range ? `${dateLabel(data.range.from)} - ${dateLabel(data.range.to)}` : 'Recent activity'} />

      <Segmented
        value={period}
        onChange={setPeriod}
        options={[
          { value: 'weekly', label: 'Week' },
          { value: 'monthly', label: 'Month' },
          { value: 'yearly', label: 'Year' },
          { value: 'custom', label: 'Custom' },
        ]}
      />

      <Card>
        <SectionTitle title="Type Filter" action={<Button label="Reset" ghost compact onPress={clearFilters} />} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {[
              ['all', 'All'],
              ['income', 'Income'],
              ['expense', 'Expense'],
              ['loan', 'Loan'],
              ['transfer', 'Transfer'],
            ].map(([value, label]) => (
              <Chip key={value} label={label} active={type === value} onPress={() => setType(value as ReportType)} />
            ))}
          </View>
        </ScrollView>
      </Card>

      {period === 'custom' ? (
        <Card>
          <SectionTitle title="Custom Range" />
          <Field label="From" value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" />
          <Field label="To" value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" />
          <Button label="Apply" ghost onPress={() => load(period, type, from, to).catch(console.error)} disabled={!from || !to || loading} />
        </Card>
      ) : null}

      {error ? <EmptyState title={error} /> : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Stat label="Income" value={money(data?.totals.income ?? 0)} tone="income" />
        <Stat label="Expense" value={money(data?.totals.expense ?? 0)} tone="expense" />
        <Stat label="Given" value={money(data?.totals.loanLent ?? 0)} tone="loan" />
        <Stat label="Taken" value={money(data?.totals.loanBorrowed ?? 0)} tone="income" />
        <Stat label="Transfers" value={money(data?.totals.transferAmount ?? 0)} />
        <Stat label="Fee" value={money(data?.totals.transferFee ?? 0)} tone="expense" />
      </View>

      <Card>
        <SectionTitle title="Statement" />
        {(data?.rows ?? []).length ? (
          (data?.rows ?? []).slice(0, 40).map((item) => (
            <Row
              key={item.id}
              title={item.description}
              subtitle={`${kindLabel(item.kind)} - ${item.category} - ${dateLabel(item.date)}`}
              amount={money(item.amount)}
              danger={item.kind === 'expense' || item.kind === 'loan-lent' || item.kind === 'transfer-fee'}
            />
          ))
        ) : (
          <EmptyState title={loading ? 'Loading reports...' : 'No report rows yet'} subtitle="Once you add records, they will appear here." />
        )}
      </Card>
    </Screen>
  );
}
