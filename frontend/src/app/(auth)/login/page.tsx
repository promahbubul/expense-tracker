'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { http, storeSession } from '@/lib/api';
import type { AuthUser } from '@/lib/types';

type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await http.post<AuthResponse>('/auth/login', {
        email: String(form.get('email')),
        password: String(form.get('password')),
      });
      storeSession(response.accessToken, response.user);
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="authPage">
      <section className="authPanel">
        <h1>Login</h1>
        <form onSubmit={submit}>
          <div className="field">
            <label>Email</label>
            <input name="email" type="email" required />
          </div>
          <div className="field">
            <label>Password</label>
            <input name="password" type="password" required />
          </div>
          {error ? <p className="errorText">{error}</p> : null}
          <button className="button" type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
          <p className="muted">
            New account? <Link href="/signup">Create company</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
