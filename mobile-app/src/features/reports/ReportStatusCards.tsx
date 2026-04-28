import { StyleSheet, Text, View } from 'react-native';
import { ThemePalette, useThemedStyles } from '../../theme';
import { ReportStatement } from '../../types';
import { money } from '../../utils/format';

export function ReportStatusCards({ totals }: { totals?: ReportStatement['totals'] }) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.statusRow}>
      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>Income</Text>
        <Text style={[styles.statusValue, styles.incomeValue]}>{money(totals?.income ?? 0)}</Text>
      </View>
      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>Expense</Text>
        <Text style={[styles.statusValue, styles.expenseValue]}>{money(totals?.expense ?? 0)}</Text>
      </View>
      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>Borrowed</Text>
        <Text style={[styles.statusValue, styles.primaryValue]}>{money(totals?.loanBorrowed ?? 0)}</Text>
      </View>
      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>Given</Text>
        <Text style={[styles.statusValue, styles.loanValue]}>{money(totals?.loanLent ?? 0)}</Text>
      </View>
    </View>
  );
}

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    statusRow: {
      flexDirection: 'row',
      gap: 6,
    },
    statusCard: {
      flex: 1,
      minWidth: 0,
      padding: 8,
      borderRadius: 14,
      backgroundColor: palette.surfaceMuted,
    },
    statusLabel: {
      color: palette.muted,
      fontSize: 9,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    statusValue: {
      marginTop: 6,
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '800',
    },
    incomeValue: {
      color: palette.success,
    },
    expenseValue: {
      color: palette.danger,
    },
    loanValue: {
      color: palette.loan,
    },
    primaryValue: {
      color: palette.primary,
    },
  });
