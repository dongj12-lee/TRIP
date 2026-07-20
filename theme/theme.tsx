import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AccentKey,
  DEFAULT_ACCENT,
  FONTS,
  Palette,
  Tone,
  buildPalette,
  softShadow,
  toneColors,
} from './tokens';

type ThemePrefs = {
  accent: AccentKey;
  // 'system' | 'light' | 'dark'
  mode: 'system' | 'light' | 'dark';
};

// v2: bumped when the default accent changed from Terracotta to Hanok Blue, so
// an already-persisted terracotta pref (baked in the first time a user touched
// accent or light/dark mode) doesn't override the new default. Old v1 prefs are
// simply ignored — everyone re-defaults to Hanok Blue / system mode once.
const PREFS_KEY = 'trip_theme_prefs_v2';

type ThemeContextValue = {
  c: Palette;
  dark: boolean;
  fonts: typeof FONTS;
  accent: AccentKey;
  mode: ThemePrefs['mode'];
  setAccent: (a: AccentKey) => void;
  setMode: (m: ThemePrefs['mode']) => void;
  tone: (t: Tone) => { bg: string; fg: string; solid: string };
  shadow: object;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [prefs, setPrefs] = useState<ThemePrefs>({ accent: DEFAULT_ACCENT, mode: 'system' });

  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY)
      .then((raw) => {
        if (raw) setPrefs((p) => ({ ...p, ...JSON.parse(raw) }));
      })
      .catch(() => {});
  }, []);

  const persist = (next: ThemePrefs) => {
    setPrefs(next);
    AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next)).catch(() => {});
  };

  const dark = prefs.mode === 'system' ? system === 'dark' : prefs.mode === 'dark';

  const value = useMemo<ThemeContextValue>(() => {
    const c = buildPalette(dark, prefs.accent);
    return {
      c,
      dark,
      fonts: FONTS,
      accent: prefs.accent,
      mode: prefs.mode,
      setAccent: (a) => persist({ ...prefs, accent: a }),
      setMode: (m) => persist({ ...prefs, mode: m }),
      tone: (t) => toneColors(c, t),
      shadow: softShadow(dark),
    };
  }, [dark, prefs]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
