import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Card, DateField, EmptyState, IconButton, LoadingBlock, LoadingFooter, Screen, ScreenHeader, SelectField, StickyBar } from '../components/ui';
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

function kindLabel(kind: string) {
  return (
    {
      income: 'Income',
      expense: 'Expense',
      'loan-borrowed': 'Borrowed',
      'loan-lent': 'Given',
      transfer: 'Transfer',
      'transfer-fee': 'Transfer Fee',
    } as Record<string, string>
  )[kind] ?? kind;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildReportHtml(data: ReportStatement) {
  const summaryRows = [
    ['Income', money(data.totals.income)],
    ['Expense', money(data.totals.expense)],
    ['Borrowed', money(data.totals.loanBorrowed)],
    ['Given', money(data.totals.loanLent)],
    ['Transfers', money(data.totals.transferAmount)],
    ['Transfer Fee', money(data.totals.transferFee)],
  ];

  const rows = data.rows
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(dateLabel(item.date))}</td>
          <td>${escapeHtml(kindLabel(item.kind))}</td>
          <td>${escapeHtml(item.description)}</td>
          <td>${escapeHtml(item.category)}</td>
          <td>${escapeHtml(item.account)}</td>
          <td class="amount">${escapeHtml(money(item.amount))}</td>
        </tr>
      `,
    )
    .join('');

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 12mm; }
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; color: #102033; margin: 0; }
          .page { width: 100%; }
          .band {
            background: #0f172a;
            color: #ffffff;
            padding: 16px 18px;
            border-radius: 12px 12px 0 0;
          }
          .title { margin: 0; font-size: 22px; font-weight: 700; }
          .band-meta { margin-top: 6px; font-size: 10px; opacity: 0.9; }
          .meta-row { margin: 14px 0 0; font-size: 10px; color: #64748b; }
          .meta-row span { margin-right: 18px; }
          .summary {
            margin-top: 14px;
            display: table;
            width: 100%;
            border-spacing: 4px;
          }
          .summary-row { display: table-row; }
          .card {
            display: table-cell;
            width: 33.333%;
            border: 1px solid #d8e1ee;
            border-radius: 10px;
            padding: 10px;
            background: #f8fafc;
          }
          .card span {
            display: block;
            font-size: 9px;
            color: #62748b;
            text-transform: uppercase;
            letter-spacing: .06em;
            margin-bottom: 6px;
          }
          .card strong { font-size: 12px; color: #102033; }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
            margin-top: 14px;
          }
          thead { display: table-header-group; }
          tbody { display: table-row-group; }
          th {
            background: #1d4ed8;
            color: #ffffff;
            text-transform: uppercase;
            font-size: 9px;
            letter-spacing: .05em;
            padding: 8px 6px;
            text-align: left;
          }
          td {
            border-bottom: 1px solid #e2e8f0;
            padding: 8px 6px;
            text-align: left;
            vertical-align: top;
          }
          tr:nth-child(even) td { background: #f8fafc; }
          .amount { text-align: right; white-space: nowrap; }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="band">
            <h1 class="title">Expense Tracker Report</h1>
            <div class="band-meta">Generated ${escapeHtml(dateLabel(new Date().toISOString()))}</div>
          </div>
          <div class="meta-row">
            <span>Range: ${escapeHtml(dateLabel(data.range.from))} - ${escapeHtml(dateLabel(data.range.to))}</span>
          </div>
          <div class="summary">
            <div class="summary-row">
              ${summaryRows
                .slice(0, 3)
                .map(([label, value]) => `<div class="card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`)
                .join('')}
            </div>
            <div class="summary-row">
              ${summaryRows
                .slice(3)
                .map(([label, value]) => `<div class="card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`)
                .join('')}
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th>Category / Person</th>
                <th>Account</th>
                <th class="amount">Amount</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </body>
    </html>
  `;
}

function fileStamp() {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(
    now.getHours(),
  ).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
}

async function createPdfFile(data: ReportStatement) {
  const printed = await Print.printToFileAsync({
    html: buildReportHtml(data),
  });

  const directory = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
  if (!directory) {
    return printed.uri;
  }

  const destination = `${directory}expense-report-${fileStamp()}.pdf`;
  await FileSystem.copyAsync({ from: printed.uri, to: destination });
  return destination;
}

export function ReportsScreen() {
  const styles = useThemedStyles(createStyles);
  const [period, setPeriod] = useState<Period>('monthly');
  const [type, setType] = useState<ReportType>('all');
  const [from, setFrom] = useState(dateInputValue());
  const [to, setTo] = useState(dateInputValue());
  const [data, setData] = useState<ReportStatement | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const pager = useInfiniteList(data?.rows ?? []);

  async function load(nextPeriod: Period = period, nextType: ReportType = type, nextFrom: string = from, nextTo: string = to, options?: { refresh?: boolean }) {
    if (options?.refresh) {
      setRefreshing(true);
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
            <IconButton icon="download-outline" onPress={() => downloadPdf().catch(console.error)} disabled={downloading || sharing || !(data?.rows?.length)} />
            <IconButton icon="share-social-outline" onPress={() => sharePdf().catch(console.error)} disabled={sharing || downloading || !(data?.rows?.length)} />
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
                  <IconButton icon="checkmark-outline" onPress={() => load(period, type, from, to).catch(console.error)} disabled={!from || !to || loading} />
                </View>
              </>
            ) : null}
          </Card>

          <View style={styles.statusRow}>
            <View style={styles.statusCard}>
              <Text style={styles.statusLabel}>Income</Text>
              <Text style={[styles.statusValue, styles.incomeValue]}>{money(data?.totals.income ?? 0)}</Text>
            </View>
            <View style={styles.statusCard}>
              <Text style={styles.statusLabel}>Expense</Text>
              <Text style={[styles.statusValue, styles.expenseValue]}>{money(data?.totals.expense ?? 0)}</Text>
            </View>
            <View style={styles.statusCard}>
              <Text style={styles.statusLabel}>Borrowed</Text>
              <Text style={[styles.statusValue, styles.primaryValue]}>{money(data?.totals.loanBorrowed ?? 0)}</Text>
            </View>
            <View style={styles.statusCard}>
              <Text style={styles.statusLabel}>Given</Text>
              <Text style={[styles.statusValue, styles.loanValue]}>{money(data?.totals.loanLent ?? 0)}</Text>
            </View>
          </View>
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
            <LoadingFooter visible={pager.loadingMore} />
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
    statusRow: {
      flexDirection: 'row',
      gap: 6,
    },
    statusCard: {
      flex: 1,
      minWidth: 0,
      padding: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
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
