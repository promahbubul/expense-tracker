'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { AuthLayout } from '@/components/AuthLayout';
import { http } from '@/lib/api';
import type { PasswordResetSession } from '@/lib/types';

export default function ForgotPasswordPage() {
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email'));

    try {
      const response = await http.post<PasswordResetSession>('/auth/forgot-password', { email });
      setNotice(response.message || 'Password reset link sent. Please check your email.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send reset email');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Forgot password">
      <form onSubmit={submit}>
        <div className="field">
          <label>Email</label>
          <input name="email" type="email" placeholder="you@example.com" required />
        </div>
        {error ? <p className="errorText">{error}</p> : null}
        {notice ? <p className="muted authNotice">{notice}</p> : null}
        <button className="button" type="submit" disabled={loading}>
          {loading ? 'Sending reset link...' : 'Send reset link'}
        </button>
      </form>
      <div className="authLinks">
        <Link href="/login">Back to login</Link>
        <Link href="/signup">Create account</Link>
      </div>
    </AuthLayout>
  );
}
