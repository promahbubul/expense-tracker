import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Card, Chip, EmptyState, Field, Row, Screen, ScreenHeader, SectionTitle, Segmented, Sheet } from '../components/ui';
import { api } from '../services/api';
import { Account, Loan, LoanPerson } from '../types';
import { dateLabel, money, refName } from '../utils/format';

type Mode = 'people' | 'loans';

export function LoansScreen() {
  const [mode, setMode] = useState<Mode>('loans');
  const [people, setPeople] = useState<LoanPerson[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [purpose, setPurpose] = useState('');
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<'LENT' | 'BORROWED'>('LENT');
  const [personId, setPersonId] = useState('');
  const [accountId, setAccountId] = useState('');

  async function load() {
    const [personRows, accountRows, loanRows] = await Promise.all([
      api<LoanPerson[]>('/loan/accounts'),
      api<Account[]>('/accounts'),
      api<Loan[]>('/loan/loads'),
    ]);
    setPeople(personRows);
    setAccounts(accountRows);
    setLoans(loanRows);
    setPersonId(personRows[0]?._id ?? '');
    setAccountId(accountRows[0]?._id ?? '');
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function save() {
    if (mode === 'people') {
      await api('/loan/accounts', { method: 'POST', body: { name, phone } });
      setName('');
      setPhone('');
    } else {
      await api('/loan/loads', {
        method: 'POST',
        body: { personId, accountId, direction, purpose, amount: Number(amount), loanDate: new Date().toISOString() },
      });
      setPurpose('');
      setAmount('');
    }
    setOpen(false);
    await load();
  }

  return (
    <Screen>
      <ScreenHeader
        eyebrow="Lending"
        title={mode === 'people' ? 'Loan People' : 'Loans'}
        action={<Button label="Add" compact onPress={() => setOpen(true)} />}
      />

      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: 'loans', label: 'Loans' },
          { value: 'people', label: 'People' },
        ]}
      />

      <Card>
        {mode === 'people' ? (
          people.length ? (
            people.map((item) => <Row key={item._id} title={item.name} subtitle={item.phone} />)
          ) : (
            <EmptyState title="No loan people yet" subtitle="Add someone you lend to or borrow from." />
          )
        ) : loans.length ? (
          loans.map((item) => (
            <Row
              key={item._id}
              title={item.purpose}
              subtitle={`${refName(item.personId)} - ${refName(item.accountId)} - ${dateLabel(item.loanDate)}`}
              amount={money(item.amount)}
              danger={item.direction === 'LENT'}
            />
          ))
        ) : (
          <EmptyState title="No loan entries yet" subtitle="Track borrowed and lent money from this screen." />
        )}
      </Card>

      <Sheet visible={open} title={mode === 'people' ? 'Add Loan Account' : 'Add Loan'} onClose={() => setOpen(false)}>
        {mode === 'people' ? (
          <>
            <Field label="Name" value={name} onChangeText={setName} />
            <Field label="Phone" value={phone} onChangeText={setPhone} />
          </>
        ) : (
          <>
            <Segmented
              value={direction}
              onChange={setDirection}
              options={[
                { value: 'LENT', label: 'Lent' },
                { value: 'BORROWED', label: 'Borrowed' },
              ]}
            />
            <Field label="Purpose" value={purpose} onChangeText={setPurpose} />
            <Field label="Amount" value={amount} onChangeText={setAmount} numeric />
            <SectionTitle title="Person" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row' }}>
                {people.map((item) => (
                  <Chip key={item._id} label={item.name} active={personId === item._id} onPress={() => setPersonId(item._id)} />
                ))}
              </View>
            </ScrollView>
            <SectionTitle title="Account" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row' }}>
                {accounts.map((item) => (
                  <Chip key={item._id} label={item.name} active={accountId === item._id} onPress={() => setAccountId(item._id)} />
                ))}
              </View>
            </ScrollView>
          </>
        )}
        <Button label="Save" onPress={save} />
      </Sheet>
    </Screen>
  );
}
