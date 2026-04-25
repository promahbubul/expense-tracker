'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

type ThemeMode = 'light' | 'dark';

type ThemeContextValue = {
  mode: ThemeMode;
  toggleMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const storageKey = 'expense_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey) as ThemeMode | null;
    if (stored === 'light' || stored === 'dark') {
      setModeState(stored);
      return;
    }

    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setModeState('dark');
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
  }, [mode]);

  const value = useMemo(
    () => ({
      mode,
      toggleMode() {
        const nextMode = mode === 'dark' ? 'light' : 'dark';
        window.localStorage.setItem(storageKey, nextMode);
        setModeState(nextMode);
      },
    }),
    [mode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function ThemeToggle() {
  const theme = useContext(ThemeContext);
  if (!theme) {
    return null;
  }

  const dark = theme.mode === 'dark';

  return (
    <button
      className="iconButton themeToggle"
      type="button"
      onClick={theme.toggleMode}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
