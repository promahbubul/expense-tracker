import { NativeModules, Platform } from 'react-native';

const configuredApiUrl = normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api');

let authToken = '';

export function setToken(token: string) {
  authToken = token;
}

function normalizeApiUrl(value: string) {
  return value.trim().replace(/\/+$/, '');
}

function isLoopbackHost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
}

function extractHost(value?: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  const urlMatch = trimmed.match(/^https?:\/\/([^/:]+)/i);
  if (urlMatch?.[1]) {
    return urlMatch[1];
  }

  const hostMatch = trimmed.match(/^([^/:]+)(?::\d+)?/);
  return hostMatch?.[1] ?? null;
}

function getBundleHost() {
  const candidates = [
    NativeModules.SourceCode?.scriptURL as string | undefined,
    NativeModules.PlatformConstants?.ServerHost as string | undefined,
    NativeModules.ExponentConstants?.manifest?.debuggerHost as string | undefined,
    NativeModules.ExponentConstants?.manifest2?.extra?.expoClient?.debuggerHost as string | undefined,
    NativeModules.ExponentConstants?.experienceUrl as string | undefined,
  ];

  for (const candidate of candidates) {
    const host = extractHost(candidate);
    if (host) {
      return host;
    }
  }

  return null;
}

export function getApiBaseUrl() {
  try {
    const resolved = new URL(configuredApiUrl);
    if (!isLoopbackHost(resolved.hostname)) {
      return configuredApiUrl;
    }

    const bundleHost = getBundleHost();
    if (bundleHost && !isLoopbackHost(bundleHost)) {
      resolved.hostname = bundleHost;
      return normalizeApiUrl(resolved.toString());
    }

    if (Platform.OS === 'android') {
      resolved.hostname = '10.0.2.2';
      return normalizeApiUrl(resolved.toString());
    }

    return configuredApiUrl;
  } catch {
    return configuredApiUrl;
  }
}

type Options = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: Record<string, unknown>;
};

export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const apiUrl = getApiBaseUrl();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new Error(`Cannot reach API at ${apiUrl}`);
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(Array.isArray(payload.message) ? payload.message.join(', ') : payload.message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}
