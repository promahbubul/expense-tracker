'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { AuthLayout } from '@/components/AuthLayout';
import { buildGoogleAuthStartUrl, http, storeSession } from '@/lib/api';
import type { AuthResponse, GenericSuccessResponse } from '@/lib/types';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

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
    setNotice('');

    try {
      const response = await http.post<AuthResponse>('/auth/login', {
        email,
        password,
      });
      storeSession(response.accessToken, response.user);
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function resendVerification() {
    if (!email) {
      setError('Enter your email first');
      setNotice('');
      return;
    }

    setResendLoading(true);
    setError('');
    setNotice('');

    try {
      const response = await http.post<GenericSuccessResponse>('/auth/resend-verification', { email });
      setNotice(response.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend verification email');
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <AuthLayout title="Sign in">
      <form onSubmit={submit}>
        <div className="field">
          <label>Email</label>
          <input
            name="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (error) setError('');
              if (notice) setNotice('');
            }}
            required
          />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (error) setError('');
            }}
            required
          />
        </div>
        {error ? <p className="errorText">{error}</p> : null}
        {notice ? <p className="muted authNotice">{notice}</p> : null}
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
        <button className="textButton" type="button" onClick={() => resendVerification().catch(console.error)} disabled={resendLoading || loading}>
          {resendLoading ? 'Sending...' : 'Resend verification'}
        </button>
      </div>
    </AuthLayout>
  );
}
