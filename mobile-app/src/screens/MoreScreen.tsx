import { useEffect, useState } from 'react';
import { Button, Card, Row, Screen, SectionTitle, Segmented } from '../components/ui';
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
          <SectionTitle title="Account" action={<Button label="Logout" ghost onPress={onLogout} />} />
          <Row title={user?.name ?? 'User'} subtitle={user?.email} />
          <Row title="Role" subtitle={user?.role.replace('_', ' ')} />
        </Card>
      ) : (
        <Card>
          <SectionTitle title={mode === 'income' ? 'Income Categories' : 'Expense Categories'} />
          {categories.map((item) => (
            <Row key={item._id} title={item.name} subtitle={item.type} />
          ))}
        </Card>
      )}
    </Screen>
  );
}
