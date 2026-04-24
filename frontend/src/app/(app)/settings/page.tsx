'use client';

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
      <div className="pageHeader">
        <div>
          <h1>Settings</h1>
          <p>Signed-in workspace information.</p>
        </div>
      </div>

      <section className="settingsPanel">
        <div className="field">
          <label>Name</label>
          <input value={user?.name ?? ''} readOnly />
        </div>
        <div className="field">
          <label>Email</label>
          <input value={user?.email ?? ''} readOnly />
        </div>
        <div className="field">
          <label>Role</label>
          <input value={user?.role ?? ''} readOnly />
        </div>
        <div className="field">
          <label>Company ID</label>
          <input value={user?.companyId ?? ''} readOnly />
        </div>
      </section>
    </>
  );
}
