import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { EmptyState } from '../../../components/ui';
import { ThemePalette, useAppTheme, useThemedStyles } from '../../../theme';
import { DashboardSummary } from '../../../types';
import { dateLabel } from '../../../utils/format';

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

export function CashFlowChart({ data }: { data: DashboardSummary['trend'] }) {
  const { palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const trend = data.slice(-7);

  if (!trend.length) {
    return <EmptyState title="No cash flow yet" subtitle="Income and expense trends will show here." />;
  }

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

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
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
      borderRadius: 20,
      backgroundColor: palette.surfaceMuted,
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
  });
