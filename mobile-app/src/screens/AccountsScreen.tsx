import { useEffect, useState } from 'react';
import { Button, Card, Field, Row, Screen, SectionTitle, Sheet } from '../components/ui';
import { api } from '../services/api';
import { Account } from '../types';
import { money } from '../utils/format';

export function AccountsScreen() {
  const [items, setItems] = useState<Account[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [balance, setBalance] = useState('');

  async function load() {
    setItems(await api<Account[]>('/accounts'));
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function save() {
    await api('/accounts', {
      method: 'POST',
      body: { name, number, initialBalance: Number(balance || 0) },
    });
    setName('');
    setNumber('');
    setBalance('');
    setOpen(false);
    await load();
  }

  return (
    <Screen>
      <Card>
        <SectionTitle title="Accounts" action={<Button label="Add" onPress={() => setOpen(true)} />} />
        {items.map((item) => (
          <Row key={item._id} title={item.name} subtitle={item.number} amount={money(item.currentBalance)} />
        ))}
      </Card>
      <Sheet visible={open} title="Add Account" onClose={() => setOpen(false)}>
        <Field label="Name" value={name} onChangeText={setName} />
        <Field label="Number" value={number} onChangeText={setNumber} />
        <Field label="Initial Deposit" value={balance} onChangeText={setBalance} numeric />
        <Button label="Save" onPress={save} />
      </Sheet>
    </Screen>
  );
}
