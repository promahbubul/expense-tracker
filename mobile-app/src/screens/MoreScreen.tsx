import { useEffect, useState } from 'react';
import { Button, Card, EmptyState, Row, Screen, ScreenHeader, SectionTitle, Segmented } from '../components/ui';
import { api } from '../services/api';
import { AuthUser, Category } from '../types';

type Mode = 'settings' | 'income' | 'expense';

export function MoreScreen({ user, onLogout }: { user: AuthUser | null; onLogout: () => void }) {
  const [mode, setMode] = useState<Mode>('settings');
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (mode === 'settings') return;
    api<Category[]>(`/categories?type=${mode === 'income' ? 'INCOME' : 'EXPENSE'}`).then(setCategories).catch(console.error);
  }, [mode]);

  return (
    <Screen>
      <ScreenHeader eyebrow="Profile" title="More" />

      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: 'settings', label: 'Settings' },
          { value: 'income', label: 'Income Cat' },
          { value: 'expense', label: 'Expense Cat' },
        ]}
      />
      {mode === 'settings' ? (
        <Card>
          <SectionTitle title="Account" action={<Button label="Logout" ghost compact onPress={onLogout} />} />
          <Row title={user?.name ?? 'User'} subtitle={user?.email} />
          <Row title="Workspace" subtitle="Personal finance profile" />
        </Card>
      ) : (
        <Card>
          <SectionTitle title={mode === 'income' ? 'Income Categories' : 'Expense Categories'} />
          {categories.length ? (
            categories.map((item) => <Row key={item._id} title={item.name} subtitle={item.type} />)
          ) : (
            <EmptyState title="No categories here" subtitle="This section will fill up as your workspace grows." />
          )}
        </Card>
      )}
    </Screen>
  );
}
