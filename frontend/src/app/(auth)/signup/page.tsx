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

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await http.post<AuthResponse>('/auth/signup', {
        name: String(form.get('name')),
        email: String(form.get('email')),
        password: String(form.get('password')),
        companyName: String(form.get('companyName')),
        phone: String(form.get('phone')),
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
    <main className="authPage">
      <section className="authPanel">
        <h1>Create Company</h1>
        <form onSubmit={submit}>
          <div className="field">
            <label>Name</label>
            <input name="name" required />
          </div>
          <div className="field">
            <label>Email</label>
            <input name="email" type="email" required />
          </div>
          <div className="field">
            <label>Phone</label>
            <input name="phone" />
          </div>
          <div className="field">
            <label>Company Name</label>
            <input name="companyName" />
          </div>
          <div className="field">
            <label>Password</label>
            <input name="password" type="password" required minLength={6} />
          </div>
          {error ? <p className="errorText">{error}</p> : null}
          <button className="button" type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Account'}
          </button>
          <p className="muted">
            Already registered? <Link href="/login">Login</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
