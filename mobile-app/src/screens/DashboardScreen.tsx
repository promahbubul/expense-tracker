import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../components/icons';
import { Button, Card, DateField, EmptyState, LoadingBlock, Row, Screen, ScreenHeader, SectionTitle, SelectField, Stat } from '../components/ui';
import { CashFlowChart } from '../features/dashboard/components/CashFlowChart';
import { IncomeExpensePie } from '../features/dashboard/components/IncomeExpensePie';
import { api } from '../services/api';
import { ThemePalette, useAppTheme, useThemedStyles } from '../theme';
import { DashboardSummary } from '../types';
import { dateInputValue, dateLabel, money } from '../utils/format';

type Period = 'today' | 'yesterday' | 'weekly' | 'monthly' | 'yearly' | 'custom';

const periodOptions: Array<{ value: Period; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom' },
];

function rangeLabel(data: DashboardSummary | null) {
  if (!data?.range) {
    return 'Overview';
  }

  const from = dateLabel(data.range.from);
  const to = dateLabel(data.range.to);
  return from === to ? from : `${from} - ${to}`;
}

export function DashboardScreen() {
  const { palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [period, setPeriod] = useState<Period>('monthly');
  const [from, setFrom] = useState(dateInputValue());
  const [to, setTo] = useState(dateInputValue());
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  async function load(nextPeriod: Period = period, nextFrom: string = from, nextTo: string = to, options?: { refresh?: boolean }) {
    if (options?.refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
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
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (period === 'custom') {
      return;
    }
    load(period, from, to).catch(console.error);
  }, [period]);

  const topPeople = useMemo(() => (data?.loanPeople ?? []).slice(0, 4), [data?.loanPeople]);

  return (
    <Screen onRefresh={() => load(period, from, to, { refresh: true }).catch(console.error)} refreshing={refreshing}>
      <ScreenHeader title="Overview" subtitle={rangeLabel(data)} />

      <Card>
        <View style={styles.filterRow}>
          <View style={styles.filterGrow}>
            <SelectField label="Period" value={period} options={periodOptions} onChange={setPeriod} />
          </View>
          {period === 'custom' ? (
            <Button label="Apply" ghost onPress={() => load(period, from, to).catch(console.error)} disabled={!from || !to || loading} />
          ) : null}
        </View>

        {period === 'custom' ? (
          <View style={styles.inlineFields}>
            <View style={styles.inlineField}>
              <DateField label="From" value={from} onChange={setFrom} placeholder="Select date" />
            </View>
            <View style={styles.inlineField}>
              <DateField label="To" value={to} onChange={setTo} placeholder="Select date" />
            </View>
          </View>
        ) : null}
      </Card>

      {error ? <EmptyState title={error} /> : null}

      {loading && !data ? <LoadingBlock label="Loading overview..." /> : null}

      <Card>
        <View style={styles.heroTop}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroLabel}>Available balance</Text>
            <Text style={styles.heroValue}>{money(data?.totals.accountBalance ?? 0)}</Text>
          </View>
          <View style={styles.heroIcon}>
            <AppIcon name="wallet-outline" size={20} color={palette.primary} />
          </View>
        </View>
        <View style={styles.heroMeta}>
          <Text style={styles.heroMetaText}>{data?.accounts.accounts ?? 0} accounts</Text>
          <Text style={styles.heroMetaText}>Range: {rangeLabel(data)}</Text>
        </View>
      </Card>

      <View style={styles.statsGrid}>
        <Stat label="Income" value={money(data?.totals.income ?? 0)} tone="income" />
        <Stat label="Expense" value={money(data?.totals.expense ?? 0)} tone="expense" />
        <Stat label="To Receive" value={money(data?.totals.receivable ?? 0)} tone="loan" />
        <Stat label="To Pay" value={money(data?.totals.payable ?? 0)} tone="expense" />
      </View>

      <Card>
        <SectionTitle title="Cash Flow" />
        {(data?.trend ?? []).length ? <CashFlowChart data={data?.trend ?? []} /> : <EmptyState title={loading ? 'Loading chart...' : 'No cash flow yet'} />}
      </Card>

      <Card>
        <SectionTitle title="Income vs Expense" />
        <IncomeExpensePie data={data?.compare ?? []} />
      </Card>

      <Card>
        <SectionTitle title="Top Categories" />
        {(data?.categoryExpenses ?? []).length ? (
          (data?.categoryExpenses ?? []).slice(0, 4).map((item) => (
            <Row key={item.categoryId} title={item.name} meta={[`${item.count} entries`]} amount={money(item.value)} danger caption="Expense category" />
          ))
        ) : (
          <EmptyState title="No expense categories yet" subtitle="Add expenses to see category insights." />
        )}
      </Card>

      <Card>
        <SectionTitle title="Loan Position" />
        <View style={styles.statsGrid}>
          <Stat label="Given" value={money(data?.totals.loanLent ?? 0)} tone="loan" />
          <Stat label="Taken" value={money(data?.totals.loanBorrowed ?? 0)} tone="income" />
        </View>
        {topPeople.length ? (
          <View style={styles.loanList}>
            {topPeople.map((item) => (
              <Row
                key={item.personId}
                title={item.name}
                meta={[`Given ${money(item.lent)}`, `Taken ${money(item.borrowed)}`]}
                amount={money(Math.abs(item.net))}
                danger={item.net < 0}
                caption="Net position"
              />
            ))}
          </View>
        ) : (
          <EmptyState title="No loan summaries yet" subtitle="Loan activity will appear here." />
        )}
      </Card>
    </Screen>
  );
}

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    filterRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 10,
    },
    filterGrow: { flex: 1 },
    inlineFields: {
      flexDirection: 'row',
      gap: 10,
    },
    inlineField: { flex: 1 },
    heroTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    heroCopy: {
      flex: 1,
    },
    heroLabel: {
      color: palette.muted,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.7,
    },
    heroValue: {
      marginTop: 8,
      color: palette.text,
      fontSize: 26,
      lineHeight: 30,
      fontWeight: '800',
    },
    heroIcon: {
      width: 38,
      height: 38,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.primarySoft,
    },
    heroMeta: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 14,
      marginTop: 14,
    },
    heroMetaText: {
      color: palette.muted,
      fontSize: 11,
      fontWeight: '600',
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    loanList: {
      marginTop: 10,
    },
  });
