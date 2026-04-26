'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthLayout } from '@/components/AuthLayout';
import { storeSession } from '@/lib/api';
import type { AuthUser } from '@/lib/types';

export default function GoogleCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('Completing Google sign-in...');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('accessToken');
    const sub = params.get('sub');
    const email = params.get('email');
    const name = params.get('name');
    const callbackError = params.get('error');

    if (callbackError) {
      setError(callbackError);
      setMessage('');
      return;
    }

    if (!accessToken || !sub || !email || !name) {
      setError('Google sign-in response is incomplete');
      setMessage('');
      return;
    }

    const user: AuthUser = { sub, email, name };
    storeSession(accessToken, user);
    router.replace('/');
  }, [router]);

  return (
    <AuthLayout title="Google sign-in">
      {message ? <p className="muted authNotice">{message}</p> : null}
      {error ? <p className="errorText">{error}</p> : null}
      {error ? (
        <div className="authLinks">
          <Link href="/login">Back to login</Link>
          <Link href="/signup">Create account</Link>
        </div>
      ) : null}
    </AuthLayout>
  );
}
