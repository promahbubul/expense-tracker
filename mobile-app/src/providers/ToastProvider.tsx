import { createContext, ReactNode, useContext, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../components/icons';
import { ThemePalette, useAppTheme, useThemedStyles } from '../theme';

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
  const styles = useThemedStyles(createStyles);
  const { palette } = useAppTheme();
  const insets = useSafeAreaInsets();
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
      <View pointerEvents="none" style={[styles.viewport, { top: Math.max(insets.top, 8) + 6 }]}>
        {items.map((item) => (
          <View key={item.id} style={[styles.toast, item.tone === 'loading' ? styles.toastLoading : item.tone === 'success' ? styles.toastSuccess : styles.toastError]}>
            <View style={styles.iconWrap}>
              {item.tone === 'loading' ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : item.tone === 'success' ? (
                <AppIcon name="checkmark" size={16} color="#ffffff" />
              ) : (
                <AppIcon name="close-outline" size={16} color="#ffffff" />
              )}
            </View>
            <Text style={styles.message}>{item.message}</Text>
          </View>
        ))}
      </View>
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

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    viewport: {
      position: 'absolute',
      left: 12,
      right: 12,
      zIndex: 50,
      gap: 8,
    },
    toast: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 12,
      backgroundColor: 'rgba(10, 18, 32, 0.94)',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.18,
      shadowRadius: 18,
      elevation: 6,
    },
    toastLoading: {
      borderWidth: 1,
      borderColor: palette.primary,
    },
    toastSuccess: {
      borderWidth: 1,
      borderColor: palette.success,
    },
    toastError: {
      borderWidth: 1,
      borderColor: palette.danger,
    },
    iconWrap: {
      width: 18,
      height: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    message: {
      flex: 1,
      color: '#ffffff',
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '700',
    },
  });
