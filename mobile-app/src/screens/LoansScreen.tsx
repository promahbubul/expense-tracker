import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Card, Chip, EmptyState, Field, Row, Screen, ScreenHeader, SectionTitle, Segmented, Sheet, Stat } from '../components/ui';
import { api } from '../services/api';
import { Account, Loan, LoanPerson } from '../types';
import { dateInputValue, dateLabel, money, refName } from '../utils/format';

type Mode = 'people' | 'loans';
type LoanFilter = 'all' | 'LENT' | 'BORROWED';

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
  const [loanDate, setLoanDate] = useState(dateInputValue());
  const [filterPersonId, setFilterPersonId] = useState('all');
  const [filterDirection, setFilterDirection] = useState<LoanFilter>('all');
  const [error, setError] = useState('');

  async function load() {
    const params = new URLSearchParams();
    if (filterPersonId !== 'all') params.set('personId', filterPersonId);
    if (filterDirection !== 'all') params.set('direction', filterDirection);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    const [personRows, accountRows, loanRows] = await Promise.all([
      api<LoanPerson[]>('/loan/accounts'),
      api<Account[]>('/accounts'),
      api<Loan[]>(`/loan/loads${suffix}`),
    ]);
    setPeople(personRows);
    setAccounts(accountRows);
    setLoans(loanRows);
    setPersonId((current) => current || personRows[0]?._id || '');
    setAccountId((current) => current || accountRows[0]?._id || '');
  }

  useEffect(() => {
    load().catch(console.error);
  }, [filterDirection, filterPersonId]);

  async function save() {
    setError('');
    try {
      if (mode === 'people') {
        await api('/loan/accounts', { method: 'POST', body: { name, phone } });
        setName('');
        setPhone('');
      } else {
        await api('/loan/loads', {
          method: 'POST',
          body: { personId, accountId, direction, purpose, amount: Number(amount), loanDate },
        });
        setPurpose('');
        setAmount('');
        setLoanDate(dateInputValue());
      }
      setOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  }

  const given = loans.filter((item) => item.direction === 'LENT').reduce((sum, item) => sum + item.amount, 0);
  const taken = loans.filter((item) => item.direction === 'BORROWED').reduce((sum, item) => sum + item.amount, 0);
  const net = given - taken;

  return (
    <Screen>
      <ScreenHeader
        eyebrow="Lending"
        title={mode === 'people' ? 'Loan People' : 'Loans'}
        action={<Button label={mode === 'people' ? 'Add Person' : 'Add Loan'} compact onPress={() => setOpen(true)} />}
      />

      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: 'loans', label: 'Loans' },
          { value: 'people', label: 'People' },
        ]}
      />

      {mode === 'loans' ? (
        <>
          <Segmented
            value={filterDirection}
            onChange={setFilterDirection}
            options={[
              { value: 'all', label: 'All' },
              { value: 'LENT', label: 'Given' },
              { value: 'BORROWED', label: 'Taken' },
            ]}
          />

          <Card>
            <SectionTitle title="People Filter" action={<Button label="Reset" ghost compact onPress={() => setFilterPersonId('all')} disabled={filterPersonId === 'all'} />} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <Chip label="All" active={filterPersonId === 'all'} onPress={() => setFilterPersonId('all')} />
                {people.map((item) => (
                  <Chip key={item._id} label={item.name} active={filterPersonId === item._id} onPress={() => setFilterPersonId(item._id)} />
                ))}
              </View>
            </ScrollView>
          </Card>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <Stat label="Given" value={money(given)} tone="expense" />
            <Stat label="Taken" value={money(taken)} tone="income" />
            <Stat label="Net" value={money(Math.abs(net))} tone={net >= 0 ? 'loan' : 'expense'} />
          </View>
        </>
      ) : null}

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
              subtitle={`${item.direction === 'LENT' ? 'Given' : 'Taken'} - ${refName(item.personId)} - ${refName(item.accountId)} - ${dateLabel(item.loanDate)}`}
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
                { value: 'LENT', label: 'Given' },
                { value: 'BORROWED', label: 'Taken' },
              ]}
            />
            <Field label="Date" value={loanDate} onChangeText={setLoanDate} placeholder="YYYY-MM-DD" />
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
        {error ? <EmptyState title={error} /> : null}
        <Button label="Save" onPress={save} disabled={mode === 'people' ? !name : !personId || !accountId || !purpose || !amount || !loanDate} />
      </Sheet>
    </Screen>
  );
}
