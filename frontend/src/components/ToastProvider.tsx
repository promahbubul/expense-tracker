'use client';

import { createContext, ReactNode, useContext, useMemo, useRef, useState } from 'react';

type ToastTone = 'loading' | 'success' | 'error';

type ToastItem = {
  id: string;
  tone: ToastTone;
  message: string;
};

type ToastTrackMessages<T = unknown> = {
  loading: string;
  success?: string | ((value: T) => string);
  error?: string | ((error: unknown) => string);
};

type ToastContextValue = {
  loading: (message: string) => string;
  success: (message: string) => string;
  error: (message: string) => string;
  update: (id: string, options: { tone: ToastTone; message: string; duration?: number }) => void;
  dismiss: (id: string) => void;
  track: <T>(task: () => Promise<T>, messages: ToastTrackMessages<T>, options?: { delayMs?: number; successDurationMs?: number; errorDurationMs?: number }) => Promise<T>;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function asMessage<T>(value: string | ((payload: T) => string) | undefined, fallback: string, payload: T) {
  if (typeof value === 'function') {
    return value(payload);
  }
  return value ?? fallback;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  function clearTimer(id: string) {
    const timer = timeoutsRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timeoutsRef.current.delete(id);
    }
  }

  function dismiss(id: string) {
    clearTimer(id);
    setItems((current) => current.filter((item) => item.id !== id));
  }

  function scheduleDismiss(id: string, duration = 2200) {
    clearTimer(id);
    const timer = setTimeout(() => dismiss(id), duration);
    timeoutsRef.current.set(id, timer);
  }

  function createToast(tone: ToastTone, message: string, duration?: number) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setItems((current) => [...current, { id, tone, message }]);
    if (typeof duration === 'number' && duration > 0) {
      scheduleDismiss(id, duration);
    }
    return id;
  }

  function update(id: string, options: { tone: ToastTone; message: string; duration?: number }) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, tone: options.tone, message: options.message } : item)));
    if (typeof options.duration === 'number' && options.duration > 0) {
      scheduleDismiss(id, options.duration);
    } else {
      clearTimer(id);
    }
  }

  async function track<T>(
    task: () => Promise<T>,
    messages: ToastTrackMessages<T>,
    options?: { delayMs?: number; successDurationMs?: number; errorDurationMs?: number },
  ) {
    const delayMs = options?.delayMs ?? 180;
    const successDurationMs = options?.successDurationMs ?? 1600;
    const errorDurationMs = options?.errorDurationMs ?? 3200;

    let toastId: string | null = null;
    let loadingShown = false;
    const timer = setTimeout(() => {
      loadingShown = true;
      toastId = createToast('loading', messages.loading);
    }, delayMs);

    try {
      const result = await task();
      clearTimeout(timer);

      if (loadingShown && toastId) {
        update(toastId, {
          tone: 'success',
          message: asMessage(messages.success, 'Done', result),
          duration: successDurationMs,
        });
      }

      return result;
    } catch (error) {
      clearTimeout(timer);
      const message = asMessage(messages.error, error instanceof Error ? error.message : 'Something went wrong', error);

      if (loadingShown && toastId) {
        update(toastId, {
          tone: 'error',
          message,
          duration: errorDurationMs,
        });
      } else {
        createToast('error', message, errorDurationMs);
      }

      throw error;
    }
  }

  const value = useMemo<ToastContextValue>(
    () => ({
      loading: (message) => createToast('loading', message),
      success: (message) => createToast('success', message, 1800),
      error: (message) => createToast('error', message, 3200),
      update,
      dismiss,
      track,
    }),
    [],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toastViewport" aria-live="polite" aria-atomic="true">
        {items.map((item) => (
          <div key={item.id} className={`toastCard toastCard-${item.tone}`}>
            <span className="toastIcon" aria-hidden="true">
              {item.tone === 'loading' ? <span className="loadingSpinner loadingSpinnerInline" /> : item.tone === 'success' ? '✓' : '!'}
            </span>
            <span className="toastMessage">{item.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside ToastProvider');
  }
  return context;
}
