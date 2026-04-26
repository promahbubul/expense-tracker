'use client';

import { useEffect, useRef } from 'react';
import { DATA_SYNC_EVENT } from './api';

export type LiveRefreshOptions = {
  silent?: boolean;
  source?: 'initial' | 'sync' | 'online' | 'focus' | 'visible' | 'poll';
};

export function useLiveRefresh(refresh: (options?: LiveRefreshOptions) => Promise<void>, intervalMs = 60000) {
  const refreshRef = useRef(refresh);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    function run(options: LiveRefreshOptions) {
      refreshRef.current(options).catch(console.error);
    }

    run({ silent: false, source: 'initial' });

    if (typeof window === 'undefined') {
      return;
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        run({ silent: true, source: 'visible' });
      }
    };

    const onSync = () => run({ silent: true, source: 'sync' });
    const onOnline = () => run({ silent: true, source: 'online' });
    const onFocus = () => run({ silent: true, source: 'focus' });

    window.addEventListener(DATA_SYNC_EVENT, onSync as EventListener);
    window.addEventListener('online', onOnline);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);

    const timer = window.setInterval(() => {
      if (navigator.onLine && document.visibilityState === 'visible') {
        run({ silent: true, source: 'poll' });
      }
    }, intervalMs);

    return () => {
      window.removeEventListener(DATA_SYNC_EVENT, onSync as EventListener);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, [intervalMs]);
}
