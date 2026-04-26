'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { AuthLayout } from '@/components/AuthLayout';
import { buildGoogleAuthStartUrl, http, storeSession } from '@/lib/api';
import type { AuthResponse } from '@/lib/types';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  function continueWithGoogle() {
    if (typeof window === 'undefined') {
      return;
    }

    setGoogleLoading(true);
    window.location.href = buildGoogleAuthStartUrl(`${window.location.origin}/google/callback`);
  }

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
    <AuthLayout title="Sign in">
      <form onSubmit={submit}>
        <div className="field">
          <label>Email</label>
          <input name="email" type="email" placeholder="you@example.com" required />
        </div>
        <div className="field">
          <label>Password</label>
          <input name="password" type="password" placeholder="Password" required />
        </div>
        {error ? <p className="errorText">{error}</p> : null}
        <button className="button" type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
      <div className="authDivider">
        <span>or</span>
      </div>
      <button className="ghostButton authWideButton" type="button" onClick={continueWithGoogle} disabled={googleLoading || loading}>
        {googleLoading ? 'Opening Google...' : 'Continue with Google'}
      </button>
      <div className="authLinks">
        <Link href="/signup">Create account</Link>
        <Link href="/forgot-password">Forgot password?</Link>
      </div>
    </AuthLayout>
  );
}
