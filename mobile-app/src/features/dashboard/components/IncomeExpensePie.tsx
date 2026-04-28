import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { EmptyState } from '../../../components/ui';
import { ThemePalette, useAppTheme, useThemedStyles } from '../../../theme';
import { DashboardSummary } from '../../../types';
import { money } from '../../../utils/format';

function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function describePieSlice(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [`M ${cx} ${cy}`, `L ${start.x} ${start.y}`, `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`, 'Z'].join(' ');
}

export function IncomeExpensePie({ data }: { data: DashboardSummary['compare'] }) {
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
  const radius = size / 2 - 6;
  const total = items.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = 0;

  return (
    <View style={styles.pieWrap}>
      <View style={styles.pieChartBlock}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle cx={size / 2} cy={size / 2} r={radius} fill={palette.chartGrid} />
          {items.map((item) => {
            const sweepAngle = (item.value / total) * 360;
            const path = describePieSlice(size / 2, size / 2, radius, currentAngle, currentAngle + sweepAngle);
            currentAngle += sweepAngle;
            return (
              <Path
                key={item.name}
                d={path}
                fill={item.color}
              />
            );
          })}
        </Svg>
      </View>

      <View style={styles.pieSummary}>
        <Text style={styles.pieCenterLabel}>Total</Text>
        <Text style={styles.pieCenterValue}>{money(total)}</Text>
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

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    pieWrap: {
      gap: 18,
      marginTop: 4,
    },
    pieChartBlock: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 6,
    },
    pieSummary: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: -4,
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
  });
