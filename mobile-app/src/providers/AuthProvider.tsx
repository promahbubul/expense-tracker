import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { signInWithGoogle } from '../services/google-auth';
import { api, setToken } from '../services/api';
import { AuthResponse, AuthUser, PasswordResetSession } from '../types';

const TOKEN_KEY = 'expense_token';
const USER_KEY = 'expense_user';

type AuthContextValue = {
  ready: boolean;
  user: AuthUser | null;
  login: (input: { email: string; password: string; saveOnDevice: boolean }) => Promise<AuthResponse>;
  signup: (input: { name: string; email: string; password: string; saveOnDevice: boolean }) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<PasswordResetSession>;
  continueWithGoogle: (saveOnDevice: boolean) => Promise<AuthResponse>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    async function boot() {
      try {
        const token = await AsyncStorage.getItem(TOKEN_KEY);
        const rawUser = await AsyncStorage.getItem(USER_KEY);

        if (token && rawUser) {
          setToken(token);
          setUser(JSON.parse(rawUser) as AuthUser);
        }
      } finally {
        setReady(true);
      }
    }

    boot().catch(() => setReady(true));
  }, []);

  async function persistSession(response: AuthResponse, saveOnDevice: boolean) {
    setToken(response.accessToken);
    setUser(response.user);

    if (saveOnDevice) {
      await AsyncStorage.setItem(TOKEN_KEY, response.accessToken);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user));
      return;
    }

    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  }

  async function login(input: { email: string; password: string; saveOnDevice: boolean }) {
    const response = await api<AuthResponse>('/auth/login', {
      method: 'POST',
      body: { email: input.email, password: input.password },
    });
    await persistSession(response, input.saveOnDevice);
    return response;
  }

  async function signup(input: { name: string; email: string; password: string; saveOnDevice: boolean }) {
    const response = await api<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: { name: input.name, email: input.email, password: input.password },
    });
    await persistSession(response, input.saveOnDevice);
    return response;
  }

  async function logout() {
    setToken('');
    setUser(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  }

  function forgotPassword(email: string) {
    return api<PasswordResetSession>('/auth/forgot-password', {
      method: 'POST',
      body: { email },
    });
  }

  async function continueWithGoogle(saveOnDevice: boolean) {
    const response = await signInWithGoogle();
    await persistSession(response, saveOnDevice);
    return response;
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      user,
      login,
      signup,
      logout,
      forgotPassword,
      continueWithGoogle,
    }),
    [ready, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
