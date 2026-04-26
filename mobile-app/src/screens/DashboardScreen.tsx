import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { Button, Card, DateField, EmptyState, LoadingBlock, Row, Screen, ScreenHeader, SectionTitle, SelectField, Stat } from '../components/ui';
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

function buildPolylinePoints(values: number[], width: number, height: number, paddingX: number, paddingY: number, maxValue: number) {
  const usableWidth = width - paddingX * 2;
  const usableHeight = height - paddingY * 2;
  const stepX = values.length > 1 ? usableWidth / (values.length - 1) : 0;

  return values
    .map((value, index) => {
      const x = paddingX + stepX * index;
      const y = height - paddingY - (value / maxValue) * usableHeight;
      return `${x},${y}`;
    })
    .join(' ');
}

function CashFlowChart({ data }: { data: DashboardSummary['trend'] }) {
  const { palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const trend = data.slice(-7);
  const chartWidth = 320;
  const chartHeight = 168;
  const paddingX = 16;
  const paddingY = 18;
  const combinedMax = Math.max(1, ...trend.flatMap((item) => [item.income, item.expense]));
  const incomePoints = buildPolylinePoints(
    trend.map((item) => item.income),
    chartWidth,
    chartHeight,
    paddingX,
    paddingY,
    combinedMax,
  );
  const expensePoints = buildPolylinePoints(
    trend.map((item) => item.expense),
    chartWidth,
    chartHeight,
    paddingX,
    paddingY,
    combinedMax,
  );

  return (
    <View style={styles.chartPanel}>
      <View style={styles.chartLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: palette.success }]} />
          <Text style={styles.legendText}>Income</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: palette.danger }]} />
          <Text style={styles.legendText}>Expense</Text>
        </View>
      </View>

      <View style={styles.lineChartFrame}>
        <Svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
          {[0, 1, 2, 3].map((step) => {
            const y = paddingY + ((chartHeight - paddingY * 2) / 3) * step;
            return <Line key={step} x1={paddingX} y1={y} x2={chartWidth - paddingX} y2={y} stroke={palette.chartGrid} strokeWidth={1} />;
          })}

          <Polyline points={expensePoints} fill="none" stroke={palette.danger} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
          <Polyline points={incomePoints} fill="none" stroke={palette.success} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />

          {trend.flatMap((item, index) => {
            const usableWidth = chartWidth - paddingX * 2;
            const usableHeight = chartHeight - paddingY * 2;
            const stepX = trend.length > 1 ? usableWidth / (trend.length - 1) : 0;
            const x = paddingX + stepX * index;
            const incomeY = chartHeight - paddingY - (item.income / combinedMax) * usableHeight;
            const expenseY = chartHeight - paddingY - (item.expense / combinedMax) * usableHeight;

            return [
              <Circle key={`${item.date}-income`} cx={x} cy={incomeY} r={4} fill={palette.success} />,
              <Circle key={`${item.date}-expense`} cx={x} cy={expenseY} r={4} fill={palette.danger} />,
            ];
          })}
        </Svg>
      </View>

      <View style={styles.chartLabelsRow}>
        {trend.map((item) => (
          <Text key={item.date} style={styles.chartLabel}>
            {dateLabel(item.date).replace(',', '')}
          </Text>
        ))}
      </View>
    </View>
  );
}

function IncomeExpensePie({ data }: { data: DashboardSummary['compare'] }) {
  const { palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const items = data
    .filter((item) => item.value > 0)
    .map((item, index) => ({
      ...item,
      color: index === 0 ? palette.success : palette.danger,
    }));

  if (!items.length) {
    return <EmptyState title="No compare data yet" subtitle="Income and expense summary will appear here." />;
  }

  const size = 150;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = items.reduce((sum, item) => sum + item.value, 0);
  let offset = 0;

  return (
    <View style={styles.pieWrap}>
      <View style={styles.pieChartBlock}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={palette.chartGrid}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {items.map((item) => {
            const segment = (item.value / total) * circumference;
            const circle = (
              <Circle
                key={item.name}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={item.color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${segment} ${circumference - segment}`}
                strokeDashoffset={-offset}
                rotation={-90}
                origin={`${size / 2}, ${size / 2}`}
              />
            );
            offset += segment;
            return circle;
          })}
        </Svg>

        <View style={styles.pieCenter}>
          <Text style={styles.pieCenterLabel}>Total</Text>
          <Text style={styles.pieCenterValue}>{money(total)}</Text>
        </View>
      </View>

      <View style={styles.pieLegendList}>
        {items.map((item) => (
          <View key={item.name} style={styles.pieLegendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={styles.legendLabel}>{item.name}</Text>
            </View>
            <View style={styles.legendValues}>
              <Text style={styles.legendValue}>{money(item.value)}</Text>
              <Text style={styles.legendPercent}>{Math.round((item.value / total) * 100)}%</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
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
            <Ionicons name="wallet-outline" size={20} color={palette.primary} />
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
    chartPanel: {
      gap: 12,
      marginTop: 4,
    },
    chartLegend: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 999,
    },
    legendText: {
      color: palette.muted,
      fontSize: 11,
      fontWeight: '700',
    },
    lineChartFrame: {
      borderRadius: 18,
      backgroundColor: palette.surfaceMuted,
      borderWidth: 1,
      borderColor: palette.border,
      paddingVertical: 12,
      paddingHorizontal: 8,
    },
    chartLabelsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 6,
    },
    chartLabel: {
      flex: 1,
      color: palette.muted,
      fontSize: 9,
      fontWeight: '600',
      textAlign: 'center',
    },
    pieWrap: {
      gap: 18,
      marginTop: 4,
    },
    pieChartBlock: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 6,
    },
    pieCenter: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
    },
    pieCenterLabel: {
      color: palette.muted,
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.7,
    },
    pieCenterValue: {
      marginTop: 6,
      color: palette.text,
      fontSize: 16,
      fontWeight: '800',
      textAlign: 'center',
    },
    pieLegendList: {
      gap: 10,
    },
    pieLegendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: palette.rowBorder,
    },
    legendLabel: {
      color: palette.text,
      fontSize: 13,
      fontWeight: '700',
    },
    legendValues: {
      alignItems: 'flex-end',
      gap: 2,
    },
    legendValue: {
      color: palette.text,
      fontSize: 12,
      fontWeight: '700',
    },
    legendPercent: {
      color: palette.muted,
      fontSize: 10,
      fontWeight: '700',
    },
    loanList: {
      marginTop: 10,
    },
  });
