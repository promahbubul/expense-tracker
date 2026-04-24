'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';

type ThemeMode = 'system' | 'light' | 'dark';

type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const storageKey = 'expense_theme';

function resolveTheme(mode: ThemeMode) {
  if (mode !== 'system') {
    return mode;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey) as ThemeMode | null;
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      setModeState(stored);
    }
  }, []);

  useEffect(() => {
    function apply() {
      document.documentElement.dataset.theme = resolveTheme(mode);
    }

    apply();
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [mode]);

  const value = useMemo(
    () => ({
      mode,
      setMode(nextMode: ThemeMode) {
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

  const options: Array<{ value: ThemeMode; label: string; icon: React.ReactNode }> = [
    { value: 'system', label: 'System', icon: <Monitor size={15} /> },
    { value: 'light', label: 'Light', icon: <Sun size={15} /> },
    { value: 'dark', label: 'Dark', icon: <Moon size={15} /> },
  ];

  return (
    <div className="themeToggle" aria-label="Theme switcher">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={theme.mode === option.value ? 'active' : ''}
          onClick={() => theme.setMode(option.value)}
          title={option.label}
          aria-label={option.label}
        >
          {option.icon}
        </button>
      ))}
    </div>
  );
}
