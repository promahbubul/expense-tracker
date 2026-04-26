'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AuthLayout } from '@/components/AuthLayout';
import { http } from '@/lib/api';

export default function VerifyEmailPage() {
  const [message, setMessage] = useState('Verifying your email...');
  const [error, setError] = useState('');

  useEffect(() => {
    async function verify() {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');

      if (!token) {
        setError('Missing verification token');
        setMessage('');
        return;
      }

      try {
        const response = await http.post<{ success: boolean; message: string }>('/auth/verify-email', { token });
        setMessage(response.message || 'Email verified successfully.');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Email verification failed');
        setMessage('');
      }
    }

    verify().catch(console.error);
  }, []);

  return (
    <AuthLayout title="Verify email">
      {message ? <p className="muted authNotice">{message}</p> : null}
      {error ? <p className="errorText">{error}</p> : null}
      <div className="authLinks">
        <Link href="/login">Go to login</Link>
        <Link href="/signup">Create account</Link>
      </div>
    </AuthLayout>
  );
}
