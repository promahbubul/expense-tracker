import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../components/icons';
import { Button, Field } from '../../components/ui';
import { useAuth } from '../../providers/AuthProvider';
import { ThemePalette, useAppTheme } from '../../theme';
import { displayNameFromEmail } from './auth-utils';

type AuthMode = 'login' | 'signup';

export function AuthScreen({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { palette, resolvedMode } = useAppTheme();
  const { login, signup, forgotPassword, continueWithGoogle } = useAuth();
  const styles = createStyles(palette);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saveOnDevice, setSaveOnDevice] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const isLogin = mode === 'login';

  async function submit() {
    setLoading(true);
    setError('');
    setNotice('');

    try {
      if (isLogin) {
        await login({ email, password, saveOnDevice });
        return;
      }

      const response = await signup({
        name: displayNameFromEmail(email),
        email,
        password,
        saveOnDevice,
      });

      if (response.message) {
        Alert.alert('Account created', response.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `${isLogin ? 'Login' : 'Signup'} failed`);
    } finally {
      setLoading(false);
    }
  }

  async function requestReset() {
    if (!email) {
      setError('Enter your email first');
      setNotice('');
      return;
    }

    setLoading(true);
    setError('');
    setNotice('');

    try {
      const response = await forgotPassword(email);
      setNotice(response.message || 'Password reset link sent');
      Alert.alert('Reset Requested', response.message || 'Password reset link sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset request failed');
    } finally {
      setLoading(false);
    }
  }

  async function onGoogle() {
    setGoogleLoading(true);
    setError('');
    setNotice('');

    try {
      await continueWithGoogle(saveOnDevice);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed';
      if (message !== 'Google sign-in was cancelled') {
        setError(message);
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <View style={[styles.page, { paddingTop: Math.max(insets.top, 10), paddingBottom: Math.max(insets.bottom, 12) }]}>
      <StatusBar style={resolvedMode === 'dark' ? 'light' : 'dark'} />
      <View style={styles.wrap}>
        <Text style={styles.title}>{isLogin ? 'Sign in' : 'Sign up'}</Text>

        <View style={styles.card}>
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

          <TouchableOpacity style={styles.saveOption} onPress={() => setSaveOnDevice((current) => !current)} activeOpacity={0.85}>
            <AppIcon name={saveOnDevice ? 'checkbox-outline' : 'square-outline'} size={20} color={saveOnDevice ? palette.primary : palette.muted} />
            <Text style={styles.saveOptionText}>Save on this device</Text>
          </TouchableOpacity>

          <Button
            label={loading ? (isLogin ? 'Logging in...' : 'Creating...') : isLogin ? 'Sign in' : 'Sign up'}
            onPress={() => submit().catch(console.error)}
            disabled={!email || !password || loading}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button
            label={googleLoading ? 'Opening Google...' : 'Continue with Google'}
            onPress={() => onGoogle().catch(console.error)}
            ghost
            disabled={googleLoading || loading}
            icon={<AppIcon name="logo-google" size={18} color={palette.text} />}
          />

          {isLogin ? (
            <View style={styles.linkRow}>
              <TouchableOpacity onPress={() => requestReset().catch(console.error)} activeOpacity={0.8} disabled={loading}>
                <Text style={styles.link}>Forgot password?</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.replace('/sign-up')} activeOpacity={0.8}>
                <Text style={styles.link}>Sign up</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => router.replace('/sign-in')} activeOpacity={0.8} style={styles.singleLinkWrap}>
              <Text style={styles.link}>Already have an account? Sign in</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    page: {
      flex: 1,
      paddingHorizontal: 18,
      backgroundColor: palette.bg,
    },
    wrap: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      color: palette.text,
      fontSize: 24,
      lineHeight: 28,
      fontWeight: '800',
      textAlign: 'center',
    },
    card: {
      width: '100%',
      maxWidth: 360,
      marginTop: 18,
      padding: 16,
      borderRadius: 22,
      backgroundColor: palette.surface,
      shadowColor: palette.shadow,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.06,
      shadowRadius: 20,
      elevation: 2,
    },
    error: {
      color: palette.danger,
      marginBottom: 10,
      fontWeight: '700',
      textAlign: 'center',
      fontSize: 12,
    },
    notice: {
      color: palette.primary,
      marginBottom: 10,
      fontWeight: '700',
      textAlign: 'center',
      fontSize: 12,
    },
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
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginVertical: 2,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: palette.border,
    },
    dividerText: {
      color: palette.muted,
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    linkRow: {
      marginTop: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 18,
      flexWrap: 'wrap',
    },
    singleLinkWrap: {
      marginTop: 14,
      alignItems: 'center',
    },
    link: {
      color: palette.primary,
      fontSize: 12,
      fontWeight: '700',
    },
  });
