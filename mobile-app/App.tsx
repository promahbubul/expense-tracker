import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Field } from './src/components/ui';
import { AccountsScreen } from './src/screens/AccountsScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { LoansScreen } from './src/screens/LoansScreen';
import { MoneyScreen } from './src/screens/MoneyScreen';
import { MoreScreen } from './src/screens/MoreScreen';
import { ReportsScreen } from './src/screens/ReportsScreen';
import { signInWithGoogle } from './src/services/google-auth';
import { api, setToken } from './src/services/api';
import { ThemePalette, ThemeProvider, useAppTheme } from './src/theme';
import { AuthResponse, AuthUser, PasswordResetSession } from './src/types';

type Tab = 'dashboard' | 'money' | 'accounts' | 'loans' | 'reports' | 'more';
type AuthMode = 'login' | 'signup';
const brandLogo = require('./src/assets/logo.png');

const tabs: Array<{ key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'dashboard', label: 'Home', icon: 'home-outline' },
  { key: 'money', label: 'Money', icon: 'swap-horizontal-outline' },
  { key: 'accounts', label: 'Accounts', icon: 'wallet-outline' },
  { key: 'loans', label: 'Loans', icon: 'people-outline' },
  { key: 'reports', label: 'Reports', icon: 'stats-chart-outline' },
  { key: 'more', label: 'More', icon: 'grid-outline' },
];

function displayNameFromEmail(email: string) {
  const localPart = email.split('@')[0] ?? 'User';
  const cleaned = localPart.replace(/[._-]+/g, ' ').trim();
  if (!cleaned) {
    return 'User';
  }

  return cleaned
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function AppShell() {
  const { palette, resolvedMode } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [booting, setBooting] = useState(true);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saveOnDevice, setSaveOnDevice] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const topInset = Math.max(insets.top, 10);
  const bottomInset = Math.max(insets.bottom, 12);

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

  async function persistSession(response: AuthResponse, shouldSave: boolean) {
    setToken(response.accessToken);
    setUser(response.user);

    if (shouldSave) {
      await AsyncStorage.setItem('expense_token', response.accessToken);
      await AsyncStorage.setItem('expense_user', JSON.stringify(response.user));
      return;
    }

    await AsyncStorage.multiRemove(['expense_token', 'expense_user']);
  }

  async function login() {
    setLoading(true);
    setError('');
    setNotice('');

    try {
      const response = await api<AuthResponse>('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      await persistSession(response, saveOnDevice);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function signup() {
    setLoading(true);
    setError('');
    setNotice('');

    try {
      const response = await api<AuthResponse>('/auth/signup', {
        method: 'POST',
        body: { name: displayNameFromEmail(email), email, password },
      });
      if (response.message) {
        Alert.alert('Account created', response.message);
      }
      await persistSession(response, saveOnDevice);
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
    setEmail('');
    setPassword('');
    setError('');
    setNotice('');
    await AsyncStorage.multiRemove(['expense_token', 'expense_user']);
  }

  async function requestPasswordReset() {
    if (!email) {
      setError('Enter your email first');
      setNotice('');
      return;
    }

    setLoading(true);
    setError('');
    setNotice('');

    try {
      const response = await api<PasswordResetSession>('/auth/forgot-password', {
        method: 'POST',
        body: { email },
      });
      setNotice(response.message || 'Password reset link sent');
      Alert.alert('Reset Requested', response.message || 'Password reset link sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset request failed');
    } finally {
      setLoading(false);
    }
  }

  async function continueWithGoogle() {
    setGoogleLoading(true);
    setError('');
    setNotice('');

    try {
      const response = await signInWithGoogle();
      await persistSession(response, saveOnDevice);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed';
      if (message !== 'Google sign-in was cancelled') {
        setError(message);
      }
    } finally {
      setGoogleLoading(false);
    }
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
      <View style={[styles.center, { paddingTop: topInset, paddingBottom: bottomInset }]}>
        <StatusBar style={resolvedMode === 'dark' ? 'light' : 'dark'} />
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.authPage, { paddingTop: topInset, paddingBottom: bottomInset }]}>
        <StatusBar style={resolvedMode === 'dark' ? 'light' : 'dark'} />
        <View style={styles.authWrap}>
          <View style={styles.authMark}>
            <Image source={brandLogo} style={styles.authLogo} resizeMode="contain" />
          </View>
          <Text style={styles.authTitle}>{authMode === 'login' ? 'Sign in' : 'Sign up'}</Text>

          <View style={styles.authCard}>
            <Field
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                if (error) setError('');
                if (notice) setNotice('');
              }}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Field
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                if (error) setError('');
              }}
              placeholder="Password"
              secure
              showPasswordToggle
              autoCapitalize="none"
              autoCorrect={false}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {notice ? <Text style={styles.notice}>{notice}</Text> : null}

            <TouchableOpacity
              style={styles.saveOption}
              onPress={() => setSaveOnDevice((current) => !current)}
              activeOpacity={0.85}
            >
              <Ionicons
                name={saveOnDevice ? 'checkbox-outline' : 'square-outline'}
                size={20}
                color={saveOnDevice ? palette.primary : palette.muted}
              />
              <Text style={styles.saveOptionText}>Save on this device</Text>
            </TouchableOpacity>

            <Button
              label={
                loading
                  ? authMode === 'login'
                    ? 'Logging in...'
                    : 'Creating...'
                  : authMode === 'login'
                    ? 'Sign in'
                    : 'Sign up'
              }
              onPress={authMode === 'login' ? login : signup}
              disabled={!email || !password || loading}
            />

            <View style={styles.authDivider}>
              <View style={styles.authDividerLine} />
              <Text style={styles.authDividerText}>or</Text>
              <View style={styles.authDividerLine} />
            </View>

            <Button
              label={googleLoading ? 'Opening Google...' : 'Continue with Google'}
              onPress={() => continueWithGoogle().catch(console.error)}
              ghost
              disabled={googleLoading || loading}
              icon={<Ionicons name="logo-google" size={18} color={palette.text} />}
            />

            {authMode === 'login' ? (
              <View style={styles.authLinksRow}>
                <TouchableOpacity onPress={() => requestPasswordReset().catch(console.error)} activeOpacity={0.8} disabled={loading}>
                  <Text style={styles.authLink}>Forgot password?</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setAuthMode('signup');
                    setError('');
                    setNotice('');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.authLink}>Sign up</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  setAuthMode('login');
                  setError('');
                  setNotice('');
                }}
                activeOpacity={0.8}
                style={styles.authSingleLinkWrap}
              >
                <Text style={styles.authLink}>Already have an account? Sign in</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.app, { paddingTop: topInset }]}>
      <StatusBar style={resolvedMode === 'dark' ? 'light' : 'dark'} />
      <View style={styles.body}>{screen}</View>

      <View style={[styles.bottomNavWrap, { paddingBottom: bottomInset }]}>
        <View style={styles.bottomNav}>
          {tabs.map((item) => {
            const active = tab === item.key;
            return (
              <TouchableOpacity key={item.key} style={styles.navItem} onPress={() => setTab(item.key)} activeOpacity={0.92}>
                <Ionicons
                  name={active ? (item.icon.replace('-outline', '') as keyof typeof Ionicons.glyphMap) : item.icon}
                  size={22}
                  color={active ? palette.primary : palette.muted}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppShell />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    app: { flex: 1, backgroundColor: palette.bg },
    body: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.bg },
    authPage: { flex: 1, paddingHorizontal: 18, backgroundColor: palette.bg },
    authWrap: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: -18,
    },
    authCard: {
      width: '100%',
      maxWidth: 360,
      marginTop: 18,
      padding: 16,
      borderRadius: 16,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      shadowColor: palette.shadow,
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.1,
      shadowRadius: 24,
      elevation: 4,
    },
    authMark: {
      width: 52,
      height: 52,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.surfaceElevated,
      overflow: 'hidden',
    },
    authLogo: {
      width: 31,
      height: 31,
    },
    authTitle: { marginTop: 14, color: palette.text, fontSize: 24, lineHeight: 28, fontWeight: '800', textAlign: 'center' },
    error: { color: palette.danger, marginBottom: 10, fontWeight: '700', textAlign: 'center', fontSize: 12 },
    notice: { color: palette.primary, marginBottom: 10, fontWeight: '700', textAlign: 'center', fontSize: 12 },
    saveOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 12,
    },
    saveOptionText: {
      color: palette.text,
      fontSize: 12,
      fontWeight: '700',
    },
    authLinksRow: {
      marginTop: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 18,
      flexWrap: 'wrap',
    },
    authSingleLinkWrap: {
      marginTop: 14,
      alignItems: 'center',
    },
    authLink: {
      color: palette.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    authDivider: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginVertical: 2,
    },
    authDividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: palette.border,
    },
    authDividerText: {
      color: palette.muted,
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    bottomNavWrap: {
      paddingHorizontal: 12,
      paddingTop: 6,
      backgroundColor: palette.bg,
    },
    bottomNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      minHeight: 52,
      paddingHorizontal: 0,
      paddingVertical: 0,
      backgroundColor: palette.surface,
    },
    navItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 52,
    },
  });
