import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Card, Chip, Field, Row, Screen, SectionTitle, Segmented, Sheet } from '../components/ui';
import { api } from '../services/api';
import { Account, Category, Transaction } from '../types';
import { dateLabel, money, refName } from '../utils/format';

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

  async function load() {
    const type = mode === 'expenses' ? 'EXPENSE' : 'INCOME';
    const [rows, accountRows, categoryRows] = await Promise.all([
      api<Transaction[]>(`/${mode}`),
      api<Account[]>('/accounts'),
      api<Category[]>(`/categories?type=${type}`),
    ]);
    setItems(rows);
    setAccounts(accountRows);
    setCategories(categoryRows);
    setAccountId(accountRows[0]?._id ?? '');
    setCategoryId(categoryRows[0]?._id ?? '');
  }

  useEffect(() => {
    load().catch(console.error);
  }, [mode]);

  async function save() {
    await api(`/${mode}`, {
      method: 'POST',
      body: {
        description,
        amount: Number(amount),
        accountId,
        categoryId,
        transactionDate: new Date().toISOString(),
      },
    });
    setDescription('');
    setAmount('');
    setOpen(false);
    await load();
  }

  return (
    <Screen>
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: 'expenses', label: 'Expenses' },
          { value: 'incomes', label: 'Incomes' },
        ]}
      />
      <Card>
        <SectionTitle title={mode === 'expenses' ? 'Expenses' : 'Incomes'} action={<Button label="Add" onPress={() => setOpen(true)} />} />
        {items.map((item) => (
          <Row
            key={item._id}
            title={item.description}
            subtitle={`${refName(item.categoryId)} - ${refName(item.accountId)} - ${dateLabel(item.transactionDate)}`}
            amount={money(item.amount)}
            danger={mode === 'expenses'}
          />
        ))}
      </Card>

      <Sheet visible={open} title={`Add ${mode === 'expenses' ? 'Expense' : 'Income'}`} onClose={() => setOpen(false)}>
        <Field label="Description" value={description} onChangeText={setDescription} />
        <Field label="Amount" value={amount} onChangeText={setAmount} numeric />
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
        <Button label="Save" onPress={save} />
      </Sheet>
    </Screen>
  );
}
