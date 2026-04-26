import { useEffect, useState } from 'react';
import { Button, Card, EmptyState, Field, Row, Screen, ScreenHeader, SectionTitle, Segmented, Sheet } from '../components/ui';
import { api } from '../services/api';
import { AuthUser, Category } from '../types';

type Mode = 'settings' | 'categories';
type CategoryMode = 'expense' | 'income';

export function MoreScreen({ user, onLogout }: { user: AuthUser | null; onLogout: () => void }) {
  const [mode, setMode] = useState<Mode>('settings');
  const [categoryMode, setCategoryMode] = useState<CategoryMode>('expense');
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (mode !== 'categories') return;
    api<Category[]>(`/categories?type=${categoryMode === 'income' ? 'INCOME' : 'EXPENSE'}`).then(setCategories).catch(console.error);
  }, [categoryMode, mode]);

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
      setCategories(await api<Category[]>(`/categories?type=${categoryMode === 'income' ? 'INCOME' : 'EXPENSE'}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  }

  return (
    <Screen>
      <ScreenHeader eyebrow="Profile" title="More" action={mode === 'categories' ? <Button label="Add Category" compact onPress={() => setOpen(true)} /> : undefined} />

      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: 'settings', label: 'Settings' },
          { value: 'categories', label: 'Categories' },
        ]}
      />
      {mode === 'settings' ? (
        <Card>
          <SectionTitle title="Account" action={<Button label="Logout" ghost compact onPress={onLogout} />} />
          <Row title={user?.name ?? 'User'} subtitle={user?.email} />
          <Row title="Workspace" subtitle="Personal finance profile" />
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
            <SectionTitle title={categoryMode === 'income' ? 'Income Categories' : 'Expense Categories'} />
            {categories.length ? (
              categories.map((item) => <Row key={item._id} title={item.name} subtitle={item.type} />)
            ) : (
              <EmptyState title="No categories here" subtitle="Add a category to start organizing this section." />
            )}
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
