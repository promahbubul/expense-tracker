'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { AuthLayout } from '@/components/AuthLayout';
import { http, storeSession } from '@/lib/api';
import type { AuthResponse } from '@/lib/types';

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email'));

    try {
      const response = await http.post<AuthResponse>('/auth/signup', {
        name: displayNameFromEmail(email),
        email,
        password: String(form.get('password')),
      });
      storeSession(response.accessToken, response.user);
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Create account">
      <form onSubmit={submit}>
        <div className="field">
          <label>Email</label>
          <input name="email" type="email" placeholder="you@example.com" required />
        </div>
        <div className="field">
          <label>Password</label>
          <input name="password" type="password" placeholder="Password" required minLength={6} />
        </div>
        {error ? <p className="errorText">{error}</p> : null}
        <button className="button" type="submit" disabled={loading}>
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>
      <div className="authLinks">
        <Link href="/login">Already have an account?</Link>
        <Link href="/forgot-password">Forgot password?</Link>
      </div>
    </AuthLayout>
  );
}
