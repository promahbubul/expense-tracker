'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { AuthLayout } from '@/components/AuthLayout';
import { http, storeSession } from '@/lib/api';
import type { AuthResponse } from '@/lib/types';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [initialEmail, setInitialEmail] = useState('');
  const [initialToken, setInitialToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setInitialEmail(params.get('email') ?? '');
    setInitialToken(params.get('token') ?? '');
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const form = new FormData(event.currentTarget);

    try {
      const response = await http.post<AuthResponse>('/auth/reset-password', {
        email: String(form.get('email')),
        resetToken: String(form.get('resetToken')),
        newPassword: String(form.get('newPassword')),
      });
      storeSession(response.accessToken, response.user);
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Reset password">
      <form onSubmit={submit}>
        <div className="field">
          <label>Email</label>
          <input name="email" type="email" defaultValue={initialEmail} placeholder="you@example.com" required />
        </div>
        <div className="field">
          <label>Reset token</label>
          <input name="resetToken" defaultValue={initialToken} placeholder="Reset token" required />
        </div>
        <div className="field">
          <label>New password</label>
          <input name="newPassword" type="password" placeholder="New password" required minLength={6} />
        </div>
        {error ? <p className="errorText">{error}</p> : null}
        <button className="button" type="submit" disabled={loading}>
          {loading ? 'Updating password...' : 'Update password'}
        </button>
      </form>
      <div className="authLinks">
        <Link href="/forgot-password">Start over</Link>
        <Link href="/login">Back to login</Link>
      </div>
    </AuthLayout>
  );
}
