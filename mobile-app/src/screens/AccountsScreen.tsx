import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Card, Chip, EmptyState, Field, Row, Screen, ScreenHeader, SectionTitle, Segmented, Sheet, Stat } from '../components/ui';
import { api } from '../services/api';
import { Account, Transfer } from '../types';
import { dateInputValue, dateLabel, money, refName } from '../utils/format';

type Mode = 'accounts' | 'transfers';

export function AccountsScreen() {
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

  async function load() {
    const [accountRows, transferRows] = await Promise.all([api<Account[]>('/accounts'), api<Transfer[]>('/transfers')]);
    setItems(accountRows);
    setTransfers(transferRows);
    setFromAccountId((current) => current || accountRows[0]?._id || '');
    setToAccountId((current) => current || accountRows[1]?._id || accountRows[0]?._id || '');
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
    <Screen>
      <ScreenHeader
        eyebrow="Wallets"
        title="Accounts"
        action={
          <Button label={mode === 'accounts' ? 'Add Account' : 'Transfer'} compact onPress={() => (mode === 'accounts' ? setAccountOpen(true) : setTransferOpen(true))} />
        }
      />

      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: 'accounts', label: 'Accounts' },
          { value: 'transfers', label: 'Transfers' },
        ]}
      />

      {mode === 'accounts' ? (
        <Card>
          {items.length ? (
            items.map((item) => <Row key={item._id} title={item.name} subtitle={item.number || item.details} amount={money(item.currentBalance)} />)
          ) : (
            <EmptyState title="No accounts yet" subtitle="Add a wallet, cash account, or bank account to begin." />
          )}
        </Card>
      ) : (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <Stat label="Transferred" value={money(transferSummary.totalAmount)} />
            <Stat label="Transfer Fee" value={money(transferSummary.totalFee)} tone="expense" />
          </View>
          <Card>
            <SectionTitle title="Transfer History" />
            {transfers.length ? (
              transfers.map((item) => (
                <Row
                  key={item._id}
                  title={`${refName(item.fromAccountId)} -> ${refName(item.toAccountId)}`}
                  subtitle={`${item.note} - ${dateLabel(item.transferDate)}${item.fee ? ` - Fee ${money(item.fee)}` : ''}`}
                  amount={money(item.amount)}
                />
              ))
            ) : (
              <EmptyState title="No transfers yet" subtitle="Move money between accounts and track the fee here." />
            )}
          </Card>
        </>
      )}

      <Sheet visible={accountOpen} title="Add Account" onClose={() => setAccountOpen(false)}>
        <Field label="Name" value={name} onChangeText={setName} />
        <Field label="Number" value={number} onChangeText={setNumber} />
        <Field label="Details" value={details} onChangeText={setDetails} />
        <Field label="Initial Deposit" value={balance} onChangeText={setBalance} numeric />
        {error ? <EmptyState title={error} /> : null}
        <Button label="Save" onPress={save} disabled={!name} />
      </Sheet>

      <Sheet visible={transferOpen} title="Transfer Money" onClose={() => setTransferOpen(false)}>
        <Field label="Date" value={transferDate} onChangeText={setTransferDate} placeholder="YYYY-MM-DD" />
        <Field label="Amount" value={transferAmount} onChangeText={setTransferAmount} numeric />
        <Field label="Transfer Fee" value={fee} onChangeText={setFee} numeric />
        <Field label="Note" value={note} onChangeText={setNote} />
        <SectionTitle title="From Account" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {items.map((item) => (
              <Chip key={`from-${item._id}`} label={item.name} active={fromAccountId === item._id} onPress={() => setFromAccountId(item._id)} />
            ))}
          </View>
        </ScrollView>
        <SectionTitle title="To Account" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
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
