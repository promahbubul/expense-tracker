import { useEffect, useState } from 'react';
import { Button, Card, EmptyState, Field, IconButton, LoadingBlock, LoadingFooter, Row, Screen, ScreenHeader, SectionTitle, Segmented, SelectField, Sheet } from '../components/ui';
import { useInfiniteList } from '../hooks/useInfiniteList';
import { api } from '../services/api';
import { ThemeMode, useAppTheme, useThemedStyles, ThemePalette } from '../theme';
import { Category } from '../types';
import { Alert, StyleSheet, Text } from 'react-native';

type Mode = 'settings' | 'categories';
type CategoryMode = 'expense' | 'income';

export function MoreScreen({ onLogout }: { onLogout: () => void }) {
  const styles = useThemedStyles(createStyles);
  const { mode: themeMode, setMode: setThemeMode } = useAppTheme();
  const [screenMode, setScreenMode] = useState<Mode>('settings');
  const [categoryMode, setCategoryMode] = useState<CategoryMode>('expense');
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [themeLoading, setThemeLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const pager = useInfiniteList(categories);

  useEffect(() => {
    if (screenMode !== 'categories') return;
    loadCategories().catch(console.error);
  }, [categoryMode, screenMode]);

  async function loadCategories(options?: { refresh?: boolean }) {
    if (options?.refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      setCategories(await api<Category[]>(`/categories?type=${categoryMode === 'income' ? 'INCOME' : 'EXPENSE'}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load categories');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function saveCategory() {
    setError('');
    setSaving(true);
    try {
      await api(editingCategory ? `/categories/${editingCategory._id}` : '/categories', {
        method: editingCategory ? 'PATCH' : 'POST',
        body: {
          name,
          ...(editingCategory ? {} : { type: categoryMode === 'income' ? 'INCOME' : 'EXPENSE' }),
          ...(editingCategory?.updatedAt ? { expectedUpdatedAt: editingCategory.updatedAt } : {}),
        },
      });
      setName('');
      setEditingCategory(null);
      setOpen(false);
      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function openCreateCategory() {
    setEditingCategory(null);
    setName('');
    setError('');
    setOpen(true);
  }

  function openEditCategory(item: Category) {
    setEditingCategory(item);
    setName(item.name);
    setError('');
    setOpen(true);
  }

  function closeCategorySheet() {
    setOpen(false);
    setEditingCategory(null);
    setError('');
  }

  function removeCategory(item: Category) {
    Alert.alert('Delete category', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeletingId(item._id);
          try {
            await api(`/categories/${item._id}${item.updatedAt ? `?expectedUpdatedAt=${encodeURIComponent(item.updatedAt)}` : ''}`, { method: 'DELETE' });
            await loadCategories();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Delete failed');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  }

  async function changeTheme(nextTheme: ThemeMode) {
    setThemeLoading(true);
    try {
      await setThemeMode(nextTheme);
    } finally {
      setThemeLoading(false);
    }
  }

  return (
    <Screen
      onScroll={screenMode === 'categories' ? pager.onScroll : undefined}
      onRefresh={screenMode === 'categories' ? () => loadCategories({ refresh: true }).catch(console.error) : undefined}
      refreshing={screenMode === 'categories' ? refreshing : false}
    >
      <ScreenHeader title="More" action={screenMode === 'categories' ? <IconButton icon="add-outline" tone="primary" onPress={openCreateCategory} /> : undefined} />

      <Segmented
        value={screenMode}
        onChange={setScreenMode}
        options={[
          { value: 'settings', label: 'Settings' },
          { value: 'categories', label: 'Categories' },
        ]}
      />

      {screenMode === 'settings' ? (
        <Card>
          <SectionTitle title="Appearance" />
          <SelectField
            label="Theme"
            value={themeMode}
            onChange={(value) => {
              changeTheme(value).catch(console.error);
            }}
            options={[
              { value: 'system', label: 'System default' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
          <Row title="Theme sync" caption={themeLoading ? 'Applying appearance...' : 'Follows system by default, or use an override here.'} />
          <Button label="Logout" ghost onPress={onLogout} />
        </Card>
      ) : (
        <>
          <Segmented
            value={categoryMode}
            onChange={setCategoryMode}
            options={[
              { value: 'expense', label: 'Expense' },
              { value: 'income', label: 'Income' },
            ]}
          />
          <Card>
            {loading && !categories.length ? (
              <LoadingBlock label="Loading categories..." />
            ) : categories.length ? (
              <>
                {pager.visibleItems.map((item) => (
                  <Row
                    key={item._id}
                    title={item.name}
                    caption={item.type}
                    actions={
                      <>
                        <IconButton icon="create-outline" onPress={() => openEditCategory(item)} disabled={saving || Boolean(deletingId)} />
                        <IconButton icon="trash-outline" onPress={() => removeCategory(item)} loading={deletingId === item._id} disabled={saving || Boolean(deletingId)} />
                      </>
                    }
                  />
                ))}
                <LoadingFooter visible={pager.loadingMore || loading} />
              </>
            ) : (
              <EmptyState title="No categories here" subtitle="Add a category to organize this section." />
            )}
            {categories.length ? <Text style={styles.listMeta}>{pager.visibleCount} of {pager.totalCount}</Text> : null}
          </Card>
        </>
      )}

      <Sheet visible={open} title={editingCategory ? 'Edit Category' : 'Add Category'} onClose={closeCategorySheet}>
        <Field label="Name" value={name} onChangeText={setName} />
        {error ? <EmptyState title={error} /> : null}
        <Button label={editingCategory ? 'Update' : 'Save'} onPress={saveCategory} loading={saving} disabled={!name} />
      </Sheet>
    </Screen>
  );
}

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    listMeta: {
      paddingTop: 8,
      color: palette.muted,
      fontSize: 10,
      fontWeight: '700',
      textAlign: 'right',
    },
  });
