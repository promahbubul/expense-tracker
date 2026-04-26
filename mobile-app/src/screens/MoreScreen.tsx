import { useEffect, useState } from 'react';
import { Button, Card, EmptyState, Field, IconButton, LoadingBlock, LoadingFooter, Row, Screen, ScreenHeader, SectionTitle, Segmented, SelectField, Sheet } from '../components/ui';
import { useInfiniteList } from '../hooks/useInfiniteList';
import { api } from '../services/api';
import { ThemeMode, useAppTheme, useThemedStyles, ThemePalette } from '../theme';
import { AuthUser, Category } from '../types';
import { StyleSheet, Text } from 'react-native';

type Mode = 'settings' | 'categories';
type CategoryMode = 'expense' | 'income';

export function MoreScreen({ user, onLogout }: { user: AuthUser | null; onLogout: () => void }) {
  const styles = useThemedStyles(createStyles);
  const { mode: themeMode, setMode: setThemeMode } = useAppTheme();
  const [screenMode, setScreenMode] = useState<Mode>('settings');
  const [categoryMode, setCategoryMode] = useState<CategoryMode>('expense');
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [themeLoading, setThemeLoading] = useState(false);
  const [loading, setLoading] = useState(false);
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
    try {
      await api('/categories', {
        method: 'POST',
        body: {
          name,
          type: categoryMode === 'income' ? 'INCOME' : 'EXPENSE',
        },
      });
      setName('');
      setOpen(false);
      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
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
      <ScreenHeader title="More" action={screenMode === 'categories' ? <IconButton icon="add-outline" tone="primary" onPress={() => setOpen(true)} /> : undefined} />

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
                {pager.visibleItems.map((item) => <Row key={item._id} title={item.name} caption={item.type} />)}
                <LoadingFooter visible={pager.loadingMore} />
              </>
            ) : (
              <EmptyState title="No categories here" subtitle="Add a category to organize this section." />
            )}
            {categories.length ? <Text style={styles.listMeta}>{pager.visibleCount} of {pager.totalCount}</Text> : null}
          </Card>
        </>
      )}

      <Sheet visible={open} title="Add Category" onClose={() => setOpen(false)}>
        <Field label="Name" value={name} onChangeText={setName} />
        {error ? <EmptyState title={error} /> : null}
        <Button label="Save" onPress={saveCategory} disabled={!name} />
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
