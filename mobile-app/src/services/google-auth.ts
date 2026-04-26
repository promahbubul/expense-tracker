import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { AuthResponse } from '../types';
import { getApiBaseUrl } from './api';

WebBrowser.maybeCompleteAuthSession();

export async function signInWithGoogle(): Promise<AuthResponse> {
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'expensetracker',
    path: 'auth/google',
  });

  const startUrl = `${getApiBaseUrl()}/auth/google/start?returnTo=${encodeURIComponent(redirectUri)}`;
  const result = await WebBrowser.openAuthSessionAsync(startUrl, redirectUri);

  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new Error('Google sign-in was cancelled');
  }

  if (result.type !== 'success' || !result.url) {
    throw new Error('Google sign-in did not complete');
  }

  const parsed = Linking.parse(result.url);
  const queryParams = (parsed.queryParams ?? {}) as Record<string, string | string[] | undefined>;
  const accessToken = readParam(queryParams.accessToken);
  const sub = readParam(queryParams.sub);
  const email = readParam(queryParams.email);
  const name = readParam(queryParams.name);
  const error = readParam(queryParams.error);

  if (error) {
    throw new Error(error);
  }

  if (!accessToken || !sub || !email || !name) {
    throw new Error('Google sign-in response is incomplete');
  }

  return {
    accessToken,
    user: {
      sub,
      email,
      name,
    },
  };
}

function readParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}
