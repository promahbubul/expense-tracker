import { useEffect, useState } from 'react';
import { Card, EmptyState, Row, Screen, ScreenHeader, SectionTitle, Segmented, Stat } from '../components/ui';
import { api } from '../services/api';
import { ReportStatement } from '../types';
import { dateLabel, money } from '../utils/format';

type Period = 'weekly' | 'monthly' | 'yearly';

export function ReportsScreen() {
  const [period, setPeriod] = useState<Period>('monthly');
  const [data, setData] = useState<ReportStatement | null>(null);

  useEffect(() => {
    api<ReportStatement>(`/reports/statement?period=${period}&type=all`).then(setData).catch(console.error);
  }, [period]);

  return (
    <Screen>
      <ScreenHeader eyebrow="Statements" title="Reports" subtitle="A compact view of your recent activity." />

      <Segmented
        value={period}
        onChange={setPeriod}
        options={[
          { value: 'weekly', label: 'Week' },
          { value: 'monthly', label: 'Month' },
          { value: 'yearly', label: 'Year' },
        ]}
      />
      <Card>
        <SectionTitle title="Summary" />
        <Stat label="Income" value={money(data?.totals.income ?? 0)} tone="income" />
        <Stat label="Expense" value={money(data?.totals.expense ?? 0)} tone="expense" />
      </Card>
      <Card>
        <SectionTitle title="Statement" />
        {(data?.rows ?? []).length ? (
          (data?.rows ?? []).slice(0, 30).map((item) => (
            <Row key={item.id} title={item.description} subtitle={`${item.kind} - ${dateLabel(item.date)}`} amount={money(item.amount)} danger={item.kind.includes('expense')} />
          ))
        ) : (
          <EmptyState title="No report rows yet" subtitle="Once you add records, they will appear here." />
        )}
      </Card>
    </Screen>
  );
}
