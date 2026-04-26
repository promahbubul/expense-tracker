'use client';

import { useEffect } from 'react';
import { DATA_SYNC_EVENT } from './api';

export function useLiveRefresh(refresh: () => Promise<void>, intervalMs = 15000) {
  useEffect(() => {
    function run() {
      refresh().catch(console.error);
    }

    run();

    if (typeof window === 'undefined') {
      return;
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        run();
      }
    };

    window.addEventListener(DATA_SYNC_EVENT, run as EventListener);
    window.addEventListener('online', run);
    window.addEventListener('focus', run);
    document.addEventListener('visibilitychange', onVisible);

    const timer = window.setInterval(() => {
      if (navigator.onLine && document.visibilityState === 'visible') {
        run();
      }
    }, intervalMs);

    return () => {
      window.removeEventListener(DATA_SYNC_EVENT, run as EventListener);
      window.removeEventListener('online', run);
      window.removeEventListener('focus', run);
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, [intervalMs, refresh]);
}
