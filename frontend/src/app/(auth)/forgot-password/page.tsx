'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { AuthLayout } from '@/components/AuthLayout';
import { http } from '@/lib/api';
import type { PasswordResetSession } from '@/lib/types';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email'));

    try {
      const response = await http.post<PasswordResetSession>('/auth/forgot-password', { email });
      router.replace(`/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(response.resetToken)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create reset session');
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
        <button className="button" type="submit" disabled={loading}>
          {loading ? 'Preparing reset...' : 'Continue'}
        </button>
      </form>
      <div className="authLinks">
        <Link href="/login">Back to login</Link>
        <Link href="/signup">Create account</Link>
      </div>
    </AuthLayout>
  );
}
