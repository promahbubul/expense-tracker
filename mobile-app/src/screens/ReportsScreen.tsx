import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Card, DateField, EmptyState, IconButton, LoadingBlock, LoadingFooter, Screen, ScreenHeader, SelectField, StickyBar } from '../components/ui';
import { ReportStatusCards } from '../features/reports/ReportStatusCards';
import { createPdfFile, kindLabel } from '../features/reports/report-pdf';
import { useInfiniteList } from '../hooks/useInfiniteList';
import { api } from '../services/api';
import { ThemePalette, useThemedStyles } from '../theme';
import { ReportStatement } from '../types';
import { dateInputValue, dateLabel, money } from '../utils/format';

type Period = 'weekly' | 'monthly' | 'yearly' | 'custom';
type ReportType = 'all' | 'income' | 'expense' | 'loan' | 'transfer';

const periodOptions: Array<{ value: Period; label: string }> = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom' },
];

const typeOptions: Array<{ value: ReportType; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
  { value: 'loan', label: 'Loan' },
  { value: 'transfer', label: 'Transfer' },
];

export function ReportsScreen() {
  const styles = useThemedStyles(createStyles);
  const [period, setPeriod] = useState<Period>('monthly');
  const [type, setType] = useState<ReportType>('all');
  const [from, setFrom] = useState(dateInputValue());
  const [to, setTo] = useState(dateInputValue());
  const [data, setData] = useState<ReportStatement | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const pager = useInfiniteList(data?.rows ?? []);

  async function load(nextPeriod: Period = period, nextType: ReportType = type, nextFrom: string = from, nextTo: string = to, options?: { refresh?: boolean; filter?: boolean }) {
    if (options?.refresh) {
      setRefreshing(true);
    } else if (options?.filter) {
      setFilterLoading(true);
    } else {
      setLoading(true);
    }

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
      setFilterLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (period === 'custom') {
      return;
    }
    load(period, type, from, to).catch(console.error);
  }, [period, type]);

  async function downloadPdf() {
    if (!data?.rows.length) {
      Alert.alert('No Data', 'Add some records first.');
      return;
    }

    setDownloading(true);
    try {
      const savedUri = await createPdfFile(data);
      Alert.alert('PDF Saved', `Saved to:\n${savedUri}`);
    } catch (err) {
      Alert.alert('Save Failed', err instanceof Error ? err.message : 'Could not save the report PDF.');
    } finally {
      setDownloading(false);
    }
  }

  async function sharePdf() {
    if (!data?.rows.length) {
      Alert.alert('No Data', 'Add some records first.');
      return;
    }

    setSharing(true);
    try {
      const savedUri = await createPdfFile(data);
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Share Unavailable', `PDF saved to:\n${savedUri}`);
        return;
      }

      await Sharing.shareAsync(savedUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Report PDF',
        UTI: 'com.adobe.pdf',
      });
    } catch (err) {
      Alert.alert('Share Failed', err instanceof Error ? err.message : 'Could not create the report PDF.');
    } finally {
      setSharing(false);
    }
  }

  return (
    <Screen
      onScroll={pager.onScroll}
      onRefresh={() => load(period, type, from, to, { refresh: true }).catch(console.error)}
      refreshing={refreshing}
      stickyHeaderIndices={[1]}
    >
      <ScreenHeader
        title="Reports"
        subtitle={data?.range ? `${dateLabel(data.range.from)} - ${dateLabel(data.range.to)}` : 'Statements'}
        action={
          <View style={styles.headerActions}>
            <IconButton icon="download-outline" onPress={() => downloadPdf().catch(console.error)} loading={downloading} disabled={downloading || sharing || !(data?.rows?.length)} />
            <IconButton icon="share-social-outline" onPress={() => sharePdf().catch(console.error)} loading={sharing} disabled={sharing || downloading || !(data?.rows?.length)} />
          </View>
        }
      />

      <StickyBar>
        <View style={styles.stickyStack}>
          <Card>
            <View style={styles.filterRow}>
              <View style={styles.filterField}>
                <SelectField label="Period" value={period} options={periodOptions} onChange={setPeriod} />
              </View>
              <View style={styles.filterField}>
                <SelectField label="Type" value={type} options={typeOptions} onChange={setType} />
              </View>
            </View>

            {period === 'custom' ? (
              <>
                <View style={styles.filterRow}>
                  <View style={styles.filterField}>
                    <DateField label="From" value={from} onChange={setFrom} placeholder="Select date" />
                  </View>
                  <View style={styles.filterField}>
                    <DateField label="To" value={to} onChange={setTo} placeholder="Select date" />
                  </View>
                </View>
                <View style={styles.filterActions}>
                  <IconButton icon="checkmark-outline" onPress={() => load(period, type, from, to, { filter: true }).catch(console.error)} loading={filterLoading} disabled={!from || !to || loading || sharing || downloading} />
                </View>
              </>
            ) : null}
          </Card>

          <ReportStatusCards totals={data?.totals} />
        </View>
      </StickyBar>

      {error ? <EmptyState title={error} /> : null}

      <Card>
        {loading && !(data?.rows ?? []).length ? (
          <LoadingBlock label="Loading reports..." />
        ) : (data?.rows ?? []).length ? (
          <>
            {pager.visibleItems.map((item) => (
              <View key={item.id} style={styles.rowWrap}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {item.description}
                </Text>
                <View style={styles.itemMeta}>
                  <Text style={[styles.metaText, styles.kindText]}>{kindLabel(item.kind)}</Text>
                  <Text style={[styles.metaText, styles.categoryText]}>{item.category}</Text>
                  <Text style={[styles.metaText, styles.accountText]}>{item.account}</Text>
                </View>
                <View style={styles.itemBottom}>
                  <Text style={styles.itemDate}>{dateLabel(item.date)}</Text>
                  <Text
                    style={[
                      styles.itemAmount,
                      item.kind === 'expense' || item.kind === 'loan-lent' || item.kind === 'transfer-fee'
                        ? styles.itemAmountDanger
                        : styles.itemAmountSafe,
                    ]}
                  >
                    {money(item.amount)}
                  </Text>
                </View>
              </View>
            ))}
            <LoadingFooter visible={pager.loadingMore || loading || filterLoading} />
            <Text style={styles.listMeta}>
              {pager.visibleCount} of {pager.totalCount}
            </Text>
          </>
        ) : (
          <EmptyState title="No report rows yet" subtitle="Once you add records, they will appear here." />
        )}
      </Card>
    </Screen>
  );
}

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    stickyStack: {
      gap: 8,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    filterRow: {
      flexDirection: 'row',
      gap: 8,
    },
    filterField: {
      flex: 1,
    },
    filterActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingTop: 4,
    },
    rowWrap: {
      gap: 3,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: palette.rowBorder,
    },
    itemTitle: {
      color: palette.text,
      fontSize: 13,
      lineHeight: 17,
      fontWeight: '700',
    },
    itemMeta: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    metaText: {
      fontSize: 10,
      fontWeight: '700',
    },
    kindText: {
      color: palette.loan,
    },
    categoryText: {
      color: palette.danger,
    },
    accountText: {
      color: palette.primary,
    },
    itemBottom: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
    },
    itemDate: {
      color: palette.muted,
      fontSize: 10,
      fontWeight: '600',
    },
    itemAmount: {
      fontSize: 12,
      fontWeight: '800',
    },
    itemAmountDanger: {
      color: palette.danger,
    },
    itemAmountSafe: {
      color: palette.success,
    },
    listMeta: {
      paddingTop: 8,
      color: palette.muted,
      fontSize: 10,
      fontWeight: '700',
      textAlign: 'right',
    },
  });
