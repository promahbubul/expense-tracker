import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, DateField, EmptyState, Field, IconButton, LoadingBlock, LoadingFooter, Row, Screen, ScreenHeader, SectionTitle, Segmented, Sheet, Stat } from '../components/ui';
import { useInfiniteList } from '../hooks/useInfiniteList';
import { api } from '../services/api';
import { ThemePalette, useThemedStyles } from '../theme';
import { Account, Transfer } from '../types';
import { dateInputValue, dateLabel, money, refName } from '../utils/format';

type Mode = 'accounts' | 'transfers';

export function AccountsScreen() {
  const styles = useThemedStyles(createStyles);
  const [mode, setMode] = useState<Mode>('accounts');
  const [items, setItems] = useState<Account[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [accountOpen, setAccountOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [balance, setBalance] = useState('');
  const [details, setDetails] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [fee, setFee] = useState('');
  const [note, setNote] = useState('');
  const [transferDate, setTransferDate] = useState(dateInputValue());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const accountPager = useInfiniteList(items);
  const transferPager = useInfiniteList(transfers);

  async function load(options?: { refresh?: boolean }) {
    if (options?.refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [accountRows, transferRows] = await Promise.all([api<Account[]>('/accounts'), api<Transfer[]>('/transfers')]);
      setItems(accountRows);
      setTransfers(transferRows);
      setFromAccountId((current) => current || accountRows[0]?._id || '');
      setToAccountId((current) => current || accountRows[1]?._id || accountRows[0]?._id || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load accounts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function save() {
    setError('');
    try {
      await api('/accounts', {
        method: 'POST',
        body: { name, number, details, initialBalance: Number(balance || 0) },
      });
      setName('');
      setNumber('');
      setDetails('');
      setBalance('');
      setAccountOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  }

  async function saveTransfer() {
    setError('');
    try {
      await api('/transfers', {
        method: 'POST',
        body: {
          fromAccountId,
          toAccountId,
          amount: Number(transferAmount || 0),
          fee: Number(fee || 0),
          note,
          transferDate,
        },
      });
      setTransferAmount('');
      setFee('');
      setNote('');
      setTransferDate(dateInputValue());
      setTransferOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  }

  const transferSummary = useMemo(
    () => ({
      totalAmount: transfers.reduce((sum, item) => sum + item.amount, 0),
      totalFee: transfers.reduce((sum, item) => sum + item.fee, 0),
    }),
    [transfers],
  );

  return (
    <Screen
      onScroll={mode === 'accounts' ? accountPager.onScroll : transferPager.onScroll}
      onRefresh={() => load({ refresh: true }).catch(console.error)}
      refreshing={refreshing}
    >
      <ScreenHeader title="Accounts" action={<IconButton icon={mode === 'accounts' ? 'add-outline' : 'swap-horizontal-outline'} tone="primary" onPress={() => (mode === 'accounts' ? setAccountOpen(true) : setTransferOpen(true))} />} />

      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: 'accounts', label: 'Accounts' },
          { value: 'transfers', label: 'Transfers' },
        ]}
      />

      {mode === 'transfers' ? (
        <View style={styles.statsGrid}>
          <Stat label="Transferred" value={money(transferSummary.totalAmount)} />
          <Stat label="Transfer Fee" value={money(transferSummary.totalFee)} tone="expense" />
        </View>
      ) : null}

      {error ? <EmptyState title={error} /> : null}

      <Card>
        {loading && !(mode === 'accounts' ? items.length : transfers.length) ? (
          <LoadingBlock label={`Loading ${mode}...`} />
        ) : mode === 'accounts' ? (
          items.length ? (
            <>
              {accountPager.visibleItems.map((item) => (
                <Row key={item._id} title={item.name} meta={[item.number || 'No number']} caption={item.details || 'Account balance'} amount={money(item.currentBalance)} />
              ))}
              <LoadingFooter visible={accountPager.loadingMore} />
            </>
          ) : (
            <EmptyState title="No accounts yet" subtitle="Add a bank, wallet, or cash account to begin." />
          )
        ) : transfers.length ? (
          <>
            {transferPager.visibleItems.map((item) => (
              <Row
                key={item._id}
                title={item.note || 'Account transfer'}
                meta={[refName(item.fromAccountId), refName(item.toAccountId)]}
                caption={`${dateLabel(item.transferDate)}${item.fee ? ` • Fee ${money(item.fee)}` : ''}`}
                amount={money(item.amount)}
              />
            ))}
            <LoadingFooter visible={transferPager.loadingMore} />
          </>
        ) : (
          <EmptyState title="No transfers yet" subtitle="Move money between accounts from this screen." />
        )}
        {(mode === 'accounts' ? items.length : transfers.length) ? (
          <Text style={styles.listMeta}>
            {mode === 'accounts' ? `${accountPager.visibleCount} of ${accountPager.totalCount}` : `${transferPager.visibleCount} of ${transferPager.totalCount}`}
          </Text>
        ) : null}
      </Card>

      <Sheet visible={accountOpen} title="Add Account" onClose={() => setAccountOpen(false)}>
        <Field label="Name" value={name} onChangeText={setName} />
        <Field label="Number" value={number} onChangeText={setNumber} />
        <Field label="Details" value={details} onChangeText={setDetails} multiline />
        <Field label="Initial Deposit" value={balance} onChangeText={setBalance} numeric />
        {error ? <EmptyState title={error} /> : null}
        <Button label="Save" onPress={save} disabled={!name} />
      </Sheet>

      <Sheet visible={transferOpen} title="Transfer Money" onClose={() => setTransferOpen(false)}>
        <DateField label="Date" value={transferDate} onChange={setTransferDate} placeholder="Select date" />
        <Field label="Amount" value={transferAmount} onChangeText={setTransferAmount} numeric />
        <Field label="Transfer Fee" value={fee} onChangeText={setFee} numeric />
        <Field label="Note" value={note} onChangeText={setNote} multiline />

        <SectionTitle title="From Account" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {items.map((item) => (
              <Chip key={`from-${item._id}`} label={item.name} active={fromAccountId === item._id} onPress={() => setFromAccountId(item._id)} />
            ))}
          </View>
        </ScrollView>

        <SectionTitle title="To Account" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {items.map((item) => (
              <Chip key={`to-${item._id}`} label={item.name} active={toAccountId === item._id} onPress={() => setToAccountId(item._id)} />
            ))}
          </View>
        </ScrollView>

        {error ? <EmptyState title={error} /> : null}
        <Button
          label="Save Transfer"
          onPress={saveTransfer}
          disabled={items.length < 2 || !fromAccountId || !toAccountId || fromAccountId === toAccountId || !transferAmount || !note}
        />
      </Sheet>
    </Screen>
  );
}

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingBottom: 4,
    },
    listMeta: {
      paddingTop: 8,
      color: palette.muted,
      fontSize: 10,
      fontWeight: '700',
      textAlign: 'right',
    },
  });
