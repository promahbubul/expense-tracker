import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, DateField, EmptyState, Field, IconButton, LoadingBlock, LoadingFooter, Screen, ScreenHeader, SectionTitle, Segmented, Sheet, StickyBar } from '../components/ui';
import { useInfiniteList } from '../hooks/useInfiniteList';
import { api } from '../services/api';
import { ThemePalette, useThemedStyles } from '../theme';
import { Account, Category, Transaction } from '../types';
import { dateInputValue, dateLabel, money, refName } from '../utils/format';

type Mode = 'expenses' | 'incomes';

export function MoneyScreen() {
  const styles = useThemedStyles(createStyles);
  const [mode, setMode] = useState<Mode>('expenses');
  const [items, setItems] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Transaction | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [entryDate, setEntryDate] = useState(dateInputValue());
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [filtering, setFiltering] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const pager = useInfiniteList(items);

  async function load(nextFrom: string = from, nextTo: string = to, options?: { refresh?: boolean; filter?: boolean }) {
    if (options?.refresh) {
      setRefreshing(true);
    } else if (options?.filter) {
      setFiltering(true);
    } else {
      setLoading(true);
    }

    try {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load money data');
    } finally {
      setLoading(false);
      setFiltering(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load().catch(console.error);
  }, [mode]);

  function resetForm(nextAccounts: Account[] = accounts, nextCategories: Category[] = categories) {
    setEditingItem(null);
    setDescription('');
    setAmount('');
    setEntryDate(dateInputValue());
    setAccountId(nextAccounts[0]?._id || '');
    setCategoryId(nextCategories[0]?._id || '');
  }

  function openCreate() {
    resetForm();
    setOpen(true);
  }

  function openEdit(item: Transaction) {
    setEditingItem(item);
    setDescription(item.description);
    setAmount(String(item.amount));
    setEntryDate(dateInputValue(item.transactionDate));
    setAccountId(typeof item.accountId === 'string' ? item.accountId : item.accountId._id);
    setCategoryId(typeof item.categoryId === 'string' ? item.categoryId : item.categoryId._id);
    setOpen(true);
  }

  async function save() {
    setError('');
    setSaving(true);
    try {
      const path = editingItem ? `/${mode}/${editingItem._id}` : `/${mode}`;
      await api(path, {
        method: editingItem ? 'PATCH' : 'POST',
        body: {
          description,
          amount: Number(amount),
          accountId,
          categoryId,
          transactionDate: entryDate,
          ...(editingItem?.updatedAt ? { expectedUpdatedAt: editingItem.updatedAt } : {}),
        },
      });
      resetForm();
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
    setEditingItem(null);
    setError('');
  }

  function removeItem(item: Transaction) {
    Alert.alert(`Delete ${mode === 'expenses' ? 'expense' : 'income'}`, 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeletingId(item._id);
          try {
            await api(`/${mode}/${item._id}${item.updatedAt ? `?expectedUpdatedAt=${encodeURIComponent(item.updatedAt)}` : ''}`, { method: 'DELETE' });
            await load();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Delete failed');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  }

  function clearFilters() {
    setFrom('');
    setTo('');
    load('', '', { filter: true }).catch(console.error);
  }

  return (
    <Screen onScroll={pager.onScroll} onRefresh={() => load(from, to, { refresh: true }).catch(console.error)} refreshing={refreshing} stickyHeaderIndices={[1]}>
      <ScreenHeader title="Money" action={<IconButton icon="add-outline" tone="primary" onPress={openCreate} />} />

      <StickyBar>
        <View style={styles.stickyStack}>
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: 'expenses', label: 'Expenses' },
              { value: 'incomes', label: 'Incomes' },
            ]}
          />

          <View style={styles.filterBar}>
            <View style={styles.filterFields}>
              <View style={styles.filterField}>
                <DateField label="From" value={from} onChange={setFrom} placeholder="Select date" />
              </View>
              <View style={styles.filterField}>
                <DateField label="To" value={to} onChange={setTo} placeholder="Select date" />
              </View>
            </View>
            <View style={styles.filterActions}>
              <IconButton icon="checkmark-outline" onPress={() => load(from, to, { filter: true }).catch(console.error)} loading={filtering} disabled={saving || Boolean(deletingId)} />
              <IconButton icon="close-outline" onPress={clearFilters} disabled={(!from && !to) || filtering || saving || Boolean(deletingId)} />
            </View>
          </View>
        </View>
      </StickyBar>

      {error ? <EmptyState title={error} /> : null}

      <Card>
        {loading && !items.length ? (
          <LoadingBlock label={`Loading ${mode}...`} />
        ) : items.length ? (
          <>
            {pager.visibleItems.map((item) => (
              <View key={item._id} style={styles.itemRow}>
                <View style={styles.itemCopy}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {item.description}
                  </Text>
                  <View style={styles.itemMetaRow}>
                    <Text style={styles.itemCategory} numberOfLines={1}>
                      {refName(item.categoryId)}
                    </Text>
                    <Text style={styles.itemAccount} numberOfLines={1}>
                      {refName(item.accountId)}
                    </Text>
                  </View>
                  <Text style={styles.itemDate}>{dateLabel(item.transactionDate)}</Text>
                </View>
                <View style={styles.itemSide}>
                  <Text style={[styles.itemAmount, mode === 'expenses' ? styles.itemAmountExpense : styles.itemAmountIncome]}>{money(item.amount)}</Text>
                  <View style={styles.itemActions}>
                    <IconButton icon="create-outline" onPress={() => openEdit(item)} disabled={saving || Boolean(deletingId)} />
                    <IconButton icon="trash-outline" onPress={() => removeItem(item)} loading={deletingId === item._id} disabled={saving || Boolean(deletingId)} />
                  </View>
                </View>
              </View>
            ))}
            <LoadingFooter visible={pager.loadingMore || loading || filtering} />
            <Text style={styles.listMeta}>
              {pager.visibleCount} of {pager.totalCount}
            </Text>
          </>
        ) : (
          <EmptyState title={`No ${mode} yet`} subtitle="Add an entry to start tracking here." />
        )}
      </Card>

      <Sheet visible={open} title={editingItem ? (mode === 'expenses' ? 'Edit Expense' : 'Edit Income') : mode === 'expenses' ? 'Add Expense' : 'Add Income'} onClose={closeSheet}>
        <Field label="Description" value={description} onChangeText={setDescription} multiline />
        <Field label="Amount" value={amount} onChangeText={setAmount} numeric />
        <DateField label="Date" value={entryDate} onChange={setEntryDate} placeholder="Select date" />

        <SectionTitle title="Account" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {accounts.map((item) => (
              <Chip key={item._id} label={item.name} active={accountId === item._id} onPress={() => setAccountId(item._id)} />
            ))}
          </View>
        </ScrollView>

        <SectionTitle title="Category" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {categories.map((item) => (
              <Chip key={item._id} label={item.name} active={categoryId === item._id} onPress={() => setCategoryId(item._id)} />
            ))}
          </View>
        </ScrollView>

        {error ? <EmptyState title={error} /> : null}
        <Button label={editingItem ? 'Update' : 'Save'} onPress={save} loading={saving} disabled={!description || !amount || !accountId || !categoryId || !entryDate} />
      </Sheet>
    </Screen>
  );
}

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    stickyStack: {
      gap: 8,
    },
    filterBar: {
      gap: 6,
    },
    filterFields: {
      flexDirection: 'row',
      gap: 8,
    },
    filterField: {
      flex: 1,
    },
    filterActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 6,
      paddingTop: 2,
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: palette.rowBorder,
    },
    itemCopy: {
      flex: 1,
      gap: 3,
    },
    itemTitle: {
      color: palette.text,
      fontSize: 13,
      lineHeight: 17,
      fontWeight: '700',
    },
    itemMetaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    itemCategory: {
      color: palette.danger,
      fontSize: 10,
      fontWeight: '700',
    },
    itemAccount: {
      color: palette.primary,
      fontSize: 10,
      fontWeight: '700',
    },
    itemDate: {
      color: palette.muted,
      fontSize: 10,
      fontWeight: '600',
    },
    itemAmount: {
      marginTop: 1,
      fontSize: 12,
      fontWeight: '800',
    },
    itemSide: {
      alignItems: 'flex-end',
      gap: 6,
      paddingLeft: 8,
    },
    itemActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    itemAmountExpense: {
      color: palette.danger,
    },
    itemAmountIncome: {
      color: palette.success,
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
