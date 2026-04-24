import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Card, Row, Screen, SectionTitle, Segmented, Stat } from '../components/ui';
import { api } from '../services/api';
import { DashboardSummary } from '../types';
import { money } from '../utils/format';

type Period = 'today' | 'yesterday' | 'weekly' | 'monthly' | 'yearly';

export function DashboardScreen() {
  const [period, setPeriod] = useState<Period>('today');
  const [data, setData] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    api<DashboardSummary>(`/dashboard/summary?period=${period}`).then(setData).catch(console.error);
  }, [period]);

  return (
    <Screen>
      <Segmented
        value={period}
        onChange={setPeriod}
        options={[
          { value: 'today', label: 'Today' },
          { value: 'yesterday', label: 'Last' },
          { value: 'weekly', label: 'Week' },
          { value: 'monthly', label: 'Month' },
          { value: 'yearly', label: 'Year' },
        ]}
      />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Stat label="Income" value={money(data?.totals.income ?? 0)} tone="income" />
        <Stat label="Expense" value={money(data?.totals.expense ?? 0)} tone="expense" />
        <Stat label="Receivable" value={money(data?.totals.receivable ?? 0)} tone="loan" />
        <Stat label="Balance" value={money(data?.totals.accountBalance ?? 0)} />
      </View>

      <Card>
        <SectionTitle title="Top Expense Categories" />
        {(data?.categoryExpenses ?? []).slice(0, 6).map((item) => (
          <Row key={item.categoryId} title={item.name} subtitle={`${item.count} entries`} amount={money(item.value)} danger />
        ))}
      </Card>
    </Screen>
  );
}
