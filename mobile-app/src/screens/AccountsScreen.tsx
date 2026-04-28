import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);
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
  const [accountSaving, setAccountSaving] = useState(false);
  const [transferSaving, setTransferSaving] = useState(false);
  const [accountDeletingId, setAccountDeletingId] = useState<string | null>(null);
  const [transferDeletingId, setTransferDeletingId] = useState<string | null>(null);
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

  function resetAccountForm(nextAccounts: Account[] = items) {
    setEditingAccount(null);
    setName('');
    setNumber('');
    setDetails('');
    setBalance('');
    setFromAccountId(nextAccounts[0]?._id || '');
    setToAccountId(nextAccounts[1]?._id || nextAccounts[0]?._id || '');
  }

  function openAccountCreate() {
    resetAccountForm();
    setError('');
    setAccountOpen(true);
  }

  function openAccountEdit(item: Account) {
    setEditingAccount(item);
    setName(item.name);
    setNumber(item.number || '');
    setDetails(item.details || '');
    setBalance(String(item.initialBalance || 0));
    setError('');
    setAccountOpen(true);
  }

  async function saveAccount() {
    setError('');
    setAccountSaving(true);
    try {
      await api(editingAccount ? `/accounts/${editingAccount._id}` : '/accounts', {
        method: editingAccount ? 'PATCH' : 'POST',
        body: {
          name,
          number,
          details,
          ...(!editingAccount ? { initialBalance: Number(balance || 0) } : {}),
          ...(editingAccount?.updatedAt ? { expectedUpdatedAt: editingAccount.updatedAt } : {}),
        },
      });
      resetAccountForm();
      setAccountOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setAccountSaving(false);
    }
  }

  function openTransferCreate() {
    setEditingTransfer(null);
    setTransferAmount('');
    setFee('');
    setNote('');
    setTransferDate(dateInputValue());
    setFromAccountId(items[0]?._id || '');
    setToAccountId(items[1]?._id || items[0]?._id || '');
    setError('');
    setTransferOpen(true);
  }

  function openTransferEdit(item: Transfer) {
    setEditingTransfer(item);
    setTransferAmount(String(item.amount));
    setFee(String(item.fee || 0));
    setNote(item.note);
    setTransferDate(dateInputValue(item.transferDate));
    setFromAccountId(typeof item.fromAccountId === 'string' ? item.fromAccountId : item.fromAccountId._id);
    setToAccountId(typeof item.toAccountId === 'string' ? item.toAccountId : item.toAccountId._id);
    setError('');
    setTransferOpen(true);
  }

  async function saveTransfer() {
    setError('');
    setTransferSaving(true);
    try {
      await api(editingTransfer ? `/transfers/${editingTransfer._id}` : '/transfers', {
        method: editingTransfer ? 'PATCH' : 'POST',
        body: {
          fromAccountId,
          toAccountId,
          amount: Number(transferAmount || 0),
          fee: Number(fee || 0),
          note,
          transferDate,
          ...(editingTransfer?.updatedAt ? { expectedUpdatedAt: editingTransfer.updatedAt } : {}),
        },
      });
      setEditingTransfer(null);
      setTransferAmount('');
      setFee('');
      setNote('');
      setTransferDate(dateInputValue());
      setTransferOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setTransferSaving(false);
    }
  }

  function closeAccountSheet() {
    setAccountOpen(false);
    setEditingAccount(null);
    setError('');
  }

  function closeTransferSheet() {
    setTransferOpen(false);
    setEditingTransfer(null);
    setError('');
  }

  function removeAccount(item: Account) {
    Alert.alert('Delete account', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setAccountDeletingId(item._id);
          try {
            await api(`/accounts/${item._id}${item.updatedAt ? `?expectedUpdatedAt=${encodeURIComponent(item.updatedAt)}` : ''}`, { method: 'DELETE' });
            await load();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Delete failed');
          } finally {
            setAccountDeletingId(null);
          }
        },
      },
    ]);
  }

  function removeTransfer(item: Transfer) {
    Alert.alert('Delete transfer', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setTransferDeletingId(item._id);
          try {
            await api(`/transfers/${item._id}${item.updatedAt ? `?expectedUpdatedAt=${encodeURIComponent(item.updatedAt)}` : ''}`, { method: 'DELETE' });
            await load();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Delete failed');
          } finally {
            setTransferDeletingId(null);
          }
        },
      },
    ]);
  }

  const transferSummary = useMemo(
    () => ({
      totalAmount: transfers.reduce((sum, item) => sum + item.amount, 0),
      totalFee: transfers.reduce((sum, item) => sum + item.fee, 0),
    }),
    [transfers],
  );

  return (
    <Screen onScroll={mode === 'accounts' ? accountPager.onScroll : transferPager.onScroll} onRefresh={() => load({ refresh: true }).catch(console.error)} refreshing={refreshing}>
      <ScreenHeader
        title="Accounts"
        action={<IconButton icon={mode === 'accounts' ? 'add-outline' : 'swap-horizontal-outline'} tone="primary" onPress={() => (mode === 'accounts' ? openAccountCreate() : openTransferCreate())} />}
      />

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
                <Row
                  key={item._id}
                  title={item.name}
                  meta={[item.number || 'No number']}
                  caption={item.details || 'Account balance'}
                  amount={money(item.currentBalance)}
                  actions={
                    <>
                      <IconButton icon="create-outline" onPress={() => openAccountEdit(item)} disabled={accountSaving || Boolean(accountDeletingId)} />
                      <IconButton icon="trash-outline" onPress={() => removeAccount(item)} loading={accountDeletingId === item._id} disabled={accountSaving || Boolean(accountDeletingId)} />
                    </>
                  }
                />
              ))}
              <LoadingFooter visible={accountPager.loadingMore || loading} />
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
                caption={`${dateLabel(item.transferDate)}${item.fee ? ` - Fee ${money(item.fee)}` : ''}`}
                amount={money(item.amount)}
                  actions={
                    <>
                      <IconButton icon="create-outline" onPress={() => openTransferEdit(item)} disabled={transferSaving || Boolean(transferDeletingId)} />
                      <IconButton icon="trash-outline" onPress={() => removeTransfer(item)} loading={transferDeletingId === item._id} disabled={transferSaving || Boolean(transferDeletingId)} />
                    </>
                  }
                />
            ))}
            <LoadingFooter visible={transferPager.loadingMore || loading} />
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

      <Sheet visible={accountOpen} title={editingAccount ? 'Edit Account' : 'Add Account'} onClose={closeAccountSheet}>
        <Field label="Name" value={name} onChangeText={setName} />
        <Field label="Number" value={number} onChangeText={setNumber} />
        <Field label="Details" value={details} onChangeText={setDetails} multiline />
        {!editingAccount ? <Field label="Initial Deposit" value={balance} onChangeText={setBalance} numeric /> : null}
        {error ? <EmptyState title={error} /> : null}
        <Button label={editingAccount ? 'Update' : 'Save'} onPress={saveAccount} loading={accountSaving} disabled={!name} />
      </Sheet>

      <Sheet visible={transferOpen} title={editingTransfer ? 'Edit Transfer' : 'Transfer Money'} onClose={closeTransferSheet}>
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
          label={editingTransfer ? 'Update Transfer' : 'Save Transfer'}
          onPress={saveTransfer}
          loading={transferSaving}
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
