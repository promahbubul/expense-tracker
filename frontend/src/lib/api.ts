'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: BodyInit | Record<string, unknown> | null;
};

export function getToken() {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage.getItem('expense_token');
}

export function getStoredUser() {
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = window.localStorage.getItem('expense_user');
  if (!raw) {
    return null;
  }
  const user = JSON.parse(raw);
  const legacyRoles: Record<string, string> = {
    SUPER_USER: 'SUPER_ADMIN',
    COMPANY_USER: 'ADMIN',
    NORMAL_USER: 'HANDLER',
  };
  return { ...user, role: legacyRoles[user.role] ?? user.role };
}

export function storeSession(accessToken: string, user: unknown) {
  window.localStorage.setItem('expense_token', accessToken);
  window.localStorage.setItem('expense_user', JSON.stringify(user));
}

export function clearSession() {
  window.localStorage.removeItem('expense_token');
  window.localStorage.removeItem('expense_user');
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body,
  });

  if (response.status === 401 && typeof window !== 'undefined') {
    clearSession();
    window.location.href = '/login';
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(Array.isArray(error.message) ? error.message.join(', ') : error.message);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json();
}

export const http = {
  get: <T>(path: string) => api<T>(path),
  post: <T>(path: string, body: Record<string, unknown>) => api<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body: Record<string, unknown>) => api<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => api<T>(path, { method: 'DELETE' }),
};
