'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getStoredUser } from '@/lib/api';
import type { AuthUser } from '@/lib/types';

export default function SettingsPage() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  return (
    <>
      <section className="settingsPanel">
        <div className="field">
          <label>Name</label>
          <input value={user?.name ?? ''} readOnly />
        </div>
        <div className="field">
          <label>Email</label>
          <input value={user?.email ?? ''} readOnly />
        </div>
        <div className="actions">
          <Link className="button" href="/forgot-password">
            Reset Password
          </Link>
          <Link className="ghostButton" href="/">
            Back to dashboard
          </Link>
        </div>
      </section>
    </>
  );
}
