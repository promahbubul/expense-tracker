import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, Field, Segmented } from './src/components/ui';
import { AccountsScreen } from './src/screens/AccountsScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { LoansScreen } from './src/screens/LoansScreen';
import { MoneyScreen } from './src/screens/MoneyScreen';
import { MoreScreen } from './src/screens/MoreScreen';
import { ReportsScreen } from './src/screens/ReportsScreen';
import { api, setToken } from './src/services/api';
import { AuthResponse, AuthUser } from './src/types';

type Tab = 'dashboard' | 'money' | 'accounts' | 'loans' | 'reports' | 'more';
type AuthMode = 'login' | 'signup';

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
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
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

  async function persistSession(response: AuthResponse) {
    setToken(response.accessToken);
    setUser(response.user);
    await AsyncStorage.setItem('expense_token', response.accessToken);
    await AsyncStorage.setItem('expense_user', JSON.stringify(response.user));
  }

  async function login() {
    setLoading(true);
    setError('');

    try {
      const response = await api<AuthResponse>('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      await persistSession(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function signup() {
    setLoading(true);
    setError('');

    try {
      const response = await api<AuthResponse>('/auth/signup', {
        method: 'POST',
        body: { name, phone, email, password },
      });
      await persistSession(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setToken('');
    setUser(null);
    setAuthMode('login');
    setName('');
    setPhone('');
    setEmail('');
    setPassword('');
    setError('');
    await AsyncStorage.multiRemove(['expense_token', 'expense_user']);
  }

  const currentTabLabel = tabs.find((item) => item.key === tab)?.label ?? 'Home';
  const firstName = user?.name?.trim().split(/\s+/)[0] ?? 'You';

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
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#165d54" />
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.authPage}>
        <StatusBar style="dark" />
        <View style={styles.authGlowTop} />
        <View style={styles.authGlowBottom} />
        <View style={styles.authCard}>
          <Text style={styles.authEyebrow}>Expense Tracker</Text>
          <Text style={styles.authTitle}>{authMode === 'login' ? 'Welcome back' : 'Create account'}</Text>
          <Text style={styles.authSubtitle}>Clean money tracking without the noise.</Text>

          <Segmented
            value={authMode}
            onChange={(value) => {
              setAuthMode(value);
              setError('');
            }}
            options={[
              { value: 'login', label: 'Login' },
              { value: 'signup', label: 'Signup' },
            ]}
          />

          <View style={styles.authForm}>
            {authMode === 'signup' ? (
              <>
                <Field label="Name" value={name} onChangeText={setName} placeholder="Your name" />
                <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="Phone" />
              </>
            ) : null}

            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secure
              autoCapitalize="none"
              autoCorrect={false}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button
              label={
                loading
                  ? authMode === 'login'
                    ? 'Logging in...'
                    : 'Creating...'
                  : authMode === 'login'
                    ? 'Login'
                    : 'Create account'
              }
              onPress={authMode === 'login' ? login : signup}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.app}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View style={styles.headerCard}>
          <View style={styles.headerCopy}>
            <Text style={styles.headerEyebrow}>Expense Tracker</Text>
            <Text style={styles.headerTitle}>Hi, {firstName}</Text>
            <Text style={styles.headerSub}>{user.email}</Text>
          </View>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{currentTabLabel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>{screen}</View>

      <View style={styles.bottomNavWrap}>
        <View style={styles.bottomNav}>
          {tabs.map((item) => (
            <TouchableOpacity key={item.key} style={[styles.navItem, tab === item.key && styles.navActive]} onPress={() => setTab(item.key)} activeOpacity={0.9}>
              <Text style={[styles.navText, tab === item.key && styles.navTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: '#f4efe6' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4efe6' },
  authPage: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f4efe6' },
  authGlowTop: {
    position: 'absolute',
    top: -90,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(22, 93, 84, 0.12)',
  },
  authGlowBottom: {
    position: 'absolute',
    bottom: -100,
    left: -80,
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: 'rgba(212, 158, 92, 0.16)',
  },
  authCard: {
    padding: 24,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 252, 246, 0.98)',
    borderWidth: 1,
    borderColor: 'rgba(82, 66, 46, 0.10)',
    shadowColor: '#22170e',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.09,
    shadowRadius: 26,
    elevation: 8,
  },
  authEyebrow: {
    alignSelf: 'flex-start',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(22, 93, 84, 0.08)',
    color: '#165d54',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  authTitle: { marginTop: 16, color: '#19231f', fontSize: 30, lineHeight: 34, fontWeight: '900' },
  authSubtitle: { marginTop: 8, marginBottom: 16, color: '#6f6a60', lineHeight: 20 },
  authForm: { marginTop: 16 },
  error: { color: '#dc5b4e', marginBottom: 12, fontWeight: '700' },
  header: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10, backgroundColor: '#f4efe6' },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
    padding: 18,
    borderRadius: 28,
    backgroundColor: '#16211f',
    shadowColor: '#0f1615',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
  headerCopy: { flex: 1 },
  headerEyebrow: {
    color: 'rgba(255, 247, 235, 0.72)',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  headerTitle: { marginTop: 10, color: '#fff9f1', fontSize: 24, fontWeight: '900' },
  headerSub: { marginTop: 5, color: 'rgba(255, 247, 235, 0.74)', fontSize: 13 },
  headerBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 247, 235, 0.12)',
  },
  headerBadgeText: { color: '#fff9f1', fontSize: 12, fontWeight: '800' },
  body: { flex: 1 },
  bottomNavWrap: { paddingHorizontal: 10, paddingTop: 8, paddingBottom: 14, backgroundColor: '#f4efe6' },
  bottomNav: {
    flexDirection: 'row',
    gap: 8,
    padding: 8,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 252, 246, 0.98)',
    borderWidth: 1,
    borderColor: 'rgba(82, 66, 46, 0.10)',
    shadowColor: '#22170e',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 5,
  },
  navItem: { flex: 1, minHeight: 48, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  navActive: { backgroundColor: '#165d54' },
  navText: { color: '#6f6a60', fontSize: 11, fontWeight: '800' },
  navTextActive: { color: '#fff' },
});
