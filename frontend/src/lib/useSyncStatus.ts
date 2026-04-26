'use client';

import { useEffect, useState } from 'react';
import { getSyncStatusSnapshot, SYNC_STATUS_EVENT, type SyncStatus } from './api';

export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>(() => getSyncStatusSnapshot());

  useEffect(() => {
    const sync = () => setStatus(getSyncStatusSnapshot());
    const handleStatus = (event: Event) => {
      const detail = (event as CustomEvent<SyncStatus>).detail;
      setStatus(detail ?? getSyncStatusSnapshot());
    };

    window.addEventListener(SYNC_STATUS_EVENT, handleStatus as EventListener);
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);

    return () => {
      window.removeEventListener(SYNC_STATUS_EVENT, handleStatus as EventListener);
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  return status;
}
