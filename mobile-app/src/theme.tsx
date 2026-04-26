import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { ColorSchemeName, useColorScheme } from 'react-native';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export type ThemePalette = {
  bg: string;
  surface: string;
  surfaceMuted: string;
  surfaceElevated: string;
  border: string;
  rowBorder: string;
  text: string;
  muted: string;
  primary: string;
  primarySoft: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  loan: string;
  loanSoft: string;
  placeholder: string;
  chartGrid: string;
  shadow: string;
  overlay: string;
  cardGlow: string;
};

const THEME_STORAGE_KEY = 'expense_theme_mode';

const lightPalette: ThemePalette = {
  bg: '#f4f7fb',
  surface: '#ffffff',
  surfaceMuted: '#eef3f9',
  surfaceElevated: '#f8fbff',
  border: '#dce4ef',
  rowBorder: '#e8eef6',
  text: '#122033',
  muted: '#708198',
  primary: '#2563eb',
  primarySoft: '#e9f1ff',
  success: '#0f9f6e',
  successSoft: '#e8f8f2',
  danger: '#dd524c',
  dangerSoft: '#fff0ee',
  loan: '#b7791f',
  loanSoft: '#fff5e6',
  placeholder: '#8ea0b6',
  chartGrid: '#edf2f8',
  shadow: '#112033',
  overlay: 'rgba(8, 16, 28, 0.24)',
  cardGlow: '#edf4ff',
};

const darkPalette: ThemePalette = {
  bg: '#0b1220',
  surface: '#111b2d',
  surfaceMuted: '#172339',
  surfaceElevated: '#152238',
  border: '#24344f',
  rowBorder: '#1f2c45',
  text: '#eef4ff',
  muted: '#9aacc5',
  primary: '#6ea8ff',
  primarySoft: '#183052',
  success: '#40c98f',
  successSoft: '#112b24',
  danger: '#ff8b82',
  dangerSoft: '#351a1c',
  loan: '#e4b45d',
  loanSoft: '#352a15',
  placeholder: '#7f93b3',
  chartGrid: '#1b2740',
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.48)',
  cardGlow: '#182745',
};

type ThemeContextValue = {
  mode: ThemeMode;
  resolvedMode: ResolvedTheme;
  palette: ThemePalette;
  setMode: (mode: ThemeMode) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveMode(mode: ThemeMode, systemScheme: ColorSchemeName): ResolvedTheme {
  if (mode === 'light' || mode === 'dark') {
    return mode;
  }

  return systemScheme === 'dark' ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((value) => {
        if (value === 'light' || value === 'dark' || value === 'system') {
          setModeState(value);
        }
      })
      .catch(() => undefined);
  }, []);

  const resolvedMode = resolveMode(mode, systemScheme);
  const palette = resolvedMode === 'dark' ? darkPalette : lightPalette;

  async function setMode(modeValue: ThemeMode) {
    setModeState(modeValue);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, modeValue);
  }

  const value = useMemo(
    () => ({
      mode,
      resolvedMode,
      palette,
      setMode,
    }),
    [mode, resolvedMode, palette],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used inside ThemeProvider');
  }

  return context;
}

export function useThemedStyles<T>(factory: (palette: ThemePalette) => T) {
  const { palette } = useAppTheme();
  return useMemo(() => factory(palette), [factory, palette]);
}
