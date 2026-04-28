import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, DateField, EmptyState, Field, IconButton, LoadingBlock, LoadingFooter, Row, Screen, ScreenHeader, SectionTitle, Segmented, Sheet, Stat, SelectField } from '../components/ui';
import { useInfiniteList } from '../hooks/useInfiniteList';
import { api } from '../services/api';
import { ThemePalette, useThemedStyles } from '../theme';
import { Account, Loan, LoanPerson } from '../types';
import { dateInputValue, dateLabel, money, refName } from '../utils/format';

type Mode = 'people' | 'loans';
type LoanFilter = 'all' | 'LENT' | 'BORROWED';

const directionOptions: Array<{ value: LoanFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'LENT', label: 'Given' },
  { value: 'BORROWED', label: 'Taken' },
];

export function LoansScreen() {
  const styles = useThemedStyles(createStyles);
  const [mode, setMode] = useState<Mode>('loans');
  const [people, setPeople] = useState<LoanPerson[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [open, setOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<LoanPerson | null>(null);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
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
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [peopleDeletingId, setPeopleDeletingId] = useState<string | null>(null);
  const [loanDeletingId, setLoanDeletingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const peoplePager = useInfiniteList(people);
  const loanPager = useInfiniteList(loans);

  async function load(options?: { refresh?: boolean }) {
    if (options?.refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load loans');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load().catch(console.error);
  }, [filterDirection, filterPersonId]);

  function resetPersonForm(nextPeople: LoanPerson[] = people) {
    setEditingPerson(null);
    setName('');
    setPhone('');
    setPersonId(nextPeople[0]?._id || '');
  }

  function resetLoanForm(nextPeople: LoanPerson[] = people, nextAccounts: Account[] = accounts) {
    setEditingLoan(null);
    setPurpose('');
    setAmount('');
    setDirection('LENT');
    setLoanDate(dateInputValue());
    setPersonId(nextPeople[0]?._id || '');
    setAccountId(nextAccounts[0]?._id || '');
  }

  function openCreate() {
    if (mode === 'people') {
      resetPersonForm();
    } else {
      resetLoanForm();
    }
    setError('');
    setOpen(true);
  }

  function openPersonEdit(item: LoanPerson) {
    setEditingPerson(item);
    setName(item.name);
    setPhone(item.phone || '');
    setError('');
    setOpen(true);
  }

  function openLoanEdit(item: Loan) {
    setEditingLoan(item);
    setPurpose(item.purpose);
    setAmount(String(item.amount));
    setDirection(item.direction);
    setLoanDate(dateInputValue(item.loanDate));
    setPersonId(typeof item.personId === 'string' ? item.personId : item.personId._id);
    setAccountId(typeof item.accountId === 'string' ? item.accountId : item.accountId._id);
    setError('');
    setOpen(true);
  }

  async function save() {
    setError('');
    setSaving(true);
    try {
      if (mode === 'people') {
        await api(editingPerson ? `/loan/accounts/${editingPerson._id}` : '/loan/accounts', {
          method: editingPerson ? 'PATCH' : 'POST',
          body: {
            name,
            phone,
            ...(editingPerson?.updatedAt ? { expectedUpdatedAt: editingPerson.updatedAt } : {}),
          },
        });
        resetPersonForm();
      } else {
        await api(editingLoan ? `/loan/loads/${editingLoan._id}` : '/loan/loads', {
          method: editingLoan ? 'PATCH' : 'POST',
          body: {
            personId,
            accountId,
            direction,
            purpose,
            amount: Number(amount),
            loanDate,
            ...(editingLoan?.updatedAt ? { expectedUpdatedAt: editingLoan.updatedAt } : {}),
          },
        });
        resetLoanForm();
      }
      setOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function closeSheet() {
    setOpen(false);
    setEditingPerson(null);
    setEditingLoan(null);
    setError('');
  }

  function removePerson(item: LoanPerson) {
    Alert.alert('Delete person', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setPeopleDeletingId(item._id);
          try {
            await api(`/loan/accounts/${item._id}${item.updatedAt ? `?expectedUpdatedAt=${encodeURIComponent(item.updatedAt)}` : ''}`, { method: 'DELETE' });
            await load();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Delete failed');
          } finally {
            setPeopleDeletingId(null);
          }
        },
      },
    ]);
  }

  function removeLoan(item: Loan) {
    Alert.alert('Delete loan', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setLoanDeletingId(item._id);
          try {
            await api(`/loan/loads/${item._id}${item.updatedAt ? `?expectedUpdatedAt=${encodeURIComponent(item.updatedAt)}` : ''}`, { method: 'DELETE' });
            await load();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Delete failed');
          } finally {
            setLoanDeletingId(null);
          }
        },
      },
    ]);
  }

  const given = loans.filter((item) => item.direction === 'LENT').reduce((sum, item) => sum + item.amount, 0);
  const taken = loans.filter((item) => item.direction === 'BORROWED').reduce((sum, item) => sum + item.amount, 0);
  const net = given - taken;

  return (
    <Screen onScroll={mode === 'people' ? peoplePager.onScroll : loanPager.onScroll} onRefresh={() => load({ refresh: true }).catch(console.error)} refreshing={refreshing}>
      <ScreenHeader title="Loans" action={<IconButton icon="add-outline" tone="primary" onPress={openCreate} />} />

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
          <Card>
            <View style={styles.filterRow}>
              <View style={styles.filterField}>
                <SelectField label="Type" value={filterDirection} options={directionOptions} onChange={setFilterDirection} />
              </View>
              <View style={styles.filterField}>
                <SelectField
                  label="Person"
                  value={filterPersonId}
                  options={[{ value: 'all', label: 'All people' }, ...people.map((item) => ({ value: item._id, label: item.name }))]}
                  onChange={setFilterPersonId}
                />
              </View>
            </View>
          </Card>

          <View style={styles.statsGrid}>
            <Stat label="Given" value={money(given)} tone="expense" />
            <Stat label="Taken" value={money(taken)} tone="income" />
            <Stat label="Net" value={money(Math.abs(net))} tone={net >= 0 ? 'loan' : 'expense'} />
          </View>
        </>
      ) : null}

      {error ? <EmptyState title={error} /> : null}

      <Card>
        {loading && !(mode === 'people' ? people.length : loans.length) ? (
          <LoadingBlock label={`Loading ${mode}...`} />
        ) : mode === 'people' ? (
          people.length ? (
            <>
              {peoplePager.visibleItems.map((item) => (
                <Row
                  key={item._id}
                  title={item.name}
                  caption={item.phone || 'Loan contact'}
                  actions={
                    <>
                      <IconButton icon="create-outline" onPress={() => openPersonEdit(item)} disabled={saving || Boolean(peopleDeletingId)} />
                      <IconButton icon="trash-outline" onPress={() => removePerson(item)} loading={peopleDeletingId === item._id} disabled={saving || Boolean(peopleDeletingId)} />
                    </>
                  }
                />
              ))}
              <LoadingFooter visible={peoplePager.loadingMore || loading} />
            </>
          ) : (
            <EmptyState title="No loan people yet" subtitle="Add someone you lend to or borrow from." />
          )
        ) : loans.length ? (
          <>
            {loanPager.visibleItems.map((item) => (
              <Row
                key={item._id}
                title={item.purpose}
                meta={[item.direction === 'LENT' ? 'Given' : 'Taken', refName(item.personId), refName(item.accountId)]}
                caption={dateLabel(item.loanDate)}
                amount={money(item.amount)}
                danger={item.direction === 'LENT'}
                  actions={
                    <>
                      <IconButton icon="create-outline" onPress={() => openLoanEdit(item)} disabled={saving || Boolean(loanDeletingId)} />
                      <IconButton icon="trash-outline" onPress={() => removeLoan(item)} loading={loanDeletingId === item._id} disabled={saving || Boolean(loanDeletingId)} />
                    </>
                  }
                />
            ))}
            <LoadingFooter visible={loanPager.loadingMore || loading} />
          </>
        ) : (
          <EmptyState title="No loan entries yet" subtitle="Track borrowed and lent money from this screen." />
        )}
        {(mode === 'people' ? people.length : loans.length) ? (
          <Text style={styles.listMeta}>
            {mode === 'people' ? `${peoplePager.visibleCount} of ${peoplePager.totalCount}` : `${loanPager.visibleCount} of ${loanPager.totalCount}`}
          </Text>
        ) : null}
      </Card>

      <Sheet visible={open} title={mode === 'people' ? (editingPerson ? 'Edit Loan Person' : 'Add Loan Person') : editingLoan ? 'Edit Loan' : 'Add Loan'} onClose={closeSheet}>
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
            <DateField label="Date" value={loanDate} onChange={setLoanDate} placeholder="Select date" />
            <Field label="Purpose" value={purpose} onChangeText={setPurpose} multiline />
            <Field label="Amount" value={amount} onChangeText={setAmount} numeric />
            <SectionTitle title="Person" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {people.map((item) => (
                  <Chip key={item._id} label={item.name} active={personId === item._id} onPress={() => setPersonId(item._id)} />
                ))}
              </View>
            </ScrollView>
            <SectionTitle title="Account" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {accounts.map((item) => (
                  <Chip key={item._id} label={item.name} active={accountId === item._id} onPress={() => setAccountId(item._id)} />
                ))}
              </View>
            </ScrollView>
          </>
        )}
        {error ? <EmptyState title={error} /> : null}
        <Button
          label={mode === 'people' ? (editingPerson ? 'Update' : 'Save') : editingLoan ? 'Update' : 'Save'}
          onPress={save}
          loading={saving}
          disabled={mode === 'people' ? !name : !personId || !accountId || !purpose || !amount || !loanDate}
        />
      </Sheet>
    </Screen>
  );
}

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    filterRow: {
      flexDirection: 'row',
      gap: 8,
    },
    filterField: {
      flex: 1,
    },
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
