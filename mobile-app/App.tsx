import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AccountsScreen } from './src/screens/AccountsScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { LoansScreen } from './src/screens/LoansScreen';
import { MoneyScreen } from './src/screens/MoneyScreen';
import { MoreScreen } from './src/screens/MoreScreen';
import { ReportsScreen } from './src/screens/ReportsScreen';
import { api, setToken } from './src/services/api';
import { AuthUser } from './src/types';

type Tab = 'dashboard' | 'money' | 'accounts' | 'loans' | 'reports' | 'more';

const tabs: Array<{ key: Tab; label: string }> = [
  { key: 'dashboard', label: 'Home' },
  { key: 'money', label: 'Money' },
  { key: 'accounts', label: 'Accounts' },
  { key: 'loans', label: 'Loans' },
  { key: 'reports', label: 'Reports' },
  { key: 'more', label: 'More' },
];

export default function App() {
  const [booting, setBooting] = useState(true);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function boot() {
      const token = await AsyncStorage.getItem('expense_token');
      const rawUser = await AsyncStorage.getItem('expense_user');
      if (token && rawUser) {
        setToken(token);
        setUser(JSON.parse(rawUser));
      }
      setBooting(false);
    }
    boot();
  }, []);

  async function login() {
    setError('');
    try {
      const response = await api<{ accessToken: string; user: AuthUser }>('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      setToken(response.accessToken);
      setUser(response.user);
      await AsyncStorage.setItem('expense_token', response.accessToken);
      await AsyncStorage.setItem('expense_user', JSON.stringify(response.user));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  }

  async function logout() {
    setToken('');
    setUser(null);
    await AsyncStorage.multiRemove(['expense_token', 'expense_user']);
  }

  const screen = useMemo(() => {
    if (tab === 'dashboard') return <DashboardScreen />;
    if (tab === 'money') return <MoneyScreen />;
    if (tab === 'accounts') return <AccountsScreen />;
    if (tab === 'loans') return <LoansScreen />;
    if (tab === 'reports') return <ReportsScreen />;
    return <MoreScreen user={user} onLogout={logout} />;
  }, [tab, user]);

  if (booting) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.auth}>
        <StatusBar style="dark" />
        <Text style={styles.title}>Expense Tracker</Text>
        <Text style={styles.subtitle}>Login to your workspace</Text>
        <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={styles.primaryButton} onPress={login}>
          <Text style={styles.primaryText}>Login</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.app}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{user.name}</Text>
          <Text style={styles.headerSub}>{user.role.replace('_', ' ')}</Text>
        </View>
      </View>
      <View style={styles.body}>{screen}</View>
      <View style={styles.bottomNav}>
        {tabs.map((item) => (
          <TouchableOpacity key={item.key} style={[styles.navItem, tab === item.key && styles.navActive]} onPress={() => setTab(item.key)}>
            <Text style={[styles.navText, tab === item.key && styles.navTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: '#f5f7fb' },
  auth: { flex: 1, justifyContent: 'center', padding: 22, backgroundColor: '#f5f7fb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 30, fontWeight: '800', color: '#0f172a' },
  subtitle: { marginTop: 6, marginBottom: 22, color: '#64748b' },
  input: { height: 48, borderWidth: 1, borderColor: '#d8e0ea', borderRadius: 12, paddingHorizontal: 14, marginBottom: 12, backgroundColor: '#fff' },
  error: { color: '#dc4c3f', marginBottom: 10 },
  primaryButton: { height: 48, borderRadius: 12, backgroundColor: '#0f6b8d', alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontWeight: '800' },
  header: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 12, backgroundColor: '#f5f7fb' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  headerSub: { color: '#64748b', fontSize: 12, marginTop: 2 },
  body: { flex: 1 },
  bottomNav: { flexDirection: 'row', gap: 6, padding: 10, paddingBottom: 12, borderTopWidth: 1, borderTopColor: '#d8e0ea', backgroundColor: '#fff' },
  navItem: { flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  navActive: { backgroundColor: '#0f6b8d' },
  navText: { color: '#64748b', fontSize: 11, fontWeight: '700' },
  navTextActive: { color: '#fff' },
});
