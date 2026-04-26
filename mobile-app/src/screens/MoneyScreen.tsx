import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Card, Chip, EmptyState, Field, Row, Screen, ScreenHeader, SectionTitle, Segmented, Sheet } from '../components/ui';
import { api } from '../services/api';
import { Account, Category, Transaction } from '../types';
import { dateInputValue, dateLabel, money, refName } from '../utils/format';

type Mode = 'expenses' | 'incomes';

export function MoneyScreen() {
  const [mode, setMode] = useState<Mode>('expenses');
  const [items, setItems] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [entryDate, setEntryDate] = useState(dateInputValue());
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState('');

  async function load(nextFrom: string = from, nextTo: string = to) {
    const type = mode === 'expenses' ? 'EXPENSE' : 'INCOME';
    const params = new URLSearchParams();
    if (nextFrom) params.set('from', nextFrom);
    if (nextTo) params.set('to', nextTo);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    const [rows, accountRows, categoryRows] = await Promise.all([
      api<Transaction[]>(`/${mode}${suffix}`),
      api<Account[]>('/accounts'),
      api<Category[]>(`/categories?type=${type}`),
    ]);
    setItems(rows);
    setAccounts(accountRows);
    setCategories(categoryRows);
    setAccountId((current) => current || accountRows[0]?._id || '');
    setCategoryId((current) => current || categoryRows[0]?._id || '');
  }

  useEffect(() => {
    load().catch(console.error);
  }, [mode]);

  async function save() {
    setError('');
    try {
      await api(`/${mode}`, {
        method: 'POST',
        body: {
          description,
          amount: Number(amount),
          accountId,
          categoryId,
          transactionDate: entryDate,
        },
      });
      setDescription('');
      setAmount('');
      setEntryDate(dateInputValue());
      setOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  }

  function clearFilters() {
    setFrom('');
    setTo('');
    load('', '').catch(console.error);
  }

  return (
    <Screen>
      <ScreenHeader
        eyebrow="Transactions"
        title={mode === 'expenses' ? 'Expenses' : 'Incomes'}
        action={<Button label="Add" compact onPress={() => setOpen(true)} />}
      />

      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: 'expenses', label: 'Expenses' },
          { value: 'incomes', label: 'Incomes' },
        ]}
      />

      <Card>
        <SectionTitle title="Filter" />
        <Field label="From" value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" />
        <Field label="To" value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button label="Apply" ghost onPress={() => load().catch(console.error)} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Clear" ghost onPress={clearFilters} disabled={!from && !to} />
          </View>
        </View>
      </Card>

      <Card>
        {items.length ? (
          items.map((item) => (
            <Row
              key={item._id}
              title={item.description}
              subtitle={`${refName(item.categoryId)} - ${refName(item.accountId)} - ${dateLabel(item.transactionDate)}`}
              amount={money(item.amount)}
              danger={mode === 'expenses'}
            />
          ))
        ) : (
          <EmptyState title={`No ${mode} yet`} subtitle="Create your first entry to start tracking this section." />
        )}
      </Card>

      <Sheet visible={open} title={`Add ${mode === 'expenses' ? 'Expense' : 'Income'}`} onClose={() => setOpen(false)}>
        <Field label="Description" value={description} onChangeText={setDescription} />
        <Field label="Amount" value={amount} onChangeText={setAmount} numeric />
        <Field label="Date" value={entryDate} onChangeText={setEntryDate} placeholder="YYYY-MM-DD" />
        <SectionTitle title="Account" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {accounts.map((item) => (
              <Chip key={item._id} label={item.name} active={accountId === item._id} onPress={() => setAccountId(item._id)} />
            ))}
          </View>
        </ScrollView>
        <SectionTitle title="Category" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {categories.map((item) => (
              <Chip key={item._id} label={item.name} active={categoryId === item._id} onPress={() => setCategoryId(item._id)} />
            ))}
          </View>
        </ScrollView>
        {error ? <EmptyState title={error} /> : null}
        <Button label="Save" onPress={save} disabled={!description || !amount || !accountId || !categoryId || !entryDate} />
      </Sheet>
    </Screen>
  );
}
