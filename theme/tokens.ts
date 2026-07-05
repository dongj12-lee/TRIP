// Design tokens ported from source/app.jsx (LIGHT / DARK / ACCENTS / FONTS).
// RN has no CSS variables, so these become a plain palette object resolved by the
// ThemeProvider. Keys mirror the original CSS custom-property names (minus the `--`).

export type AccentKey = '#c26b4a' | '#79876b' | '#bd8f33' | '#5b6f9c';

export const ACCENTS: Record<
  AccentKey,
  { name: string; main: string; d600: string; l50: string; d50: string }
> = {
  '#c26b4a': { name: 'Terracotta', main: '#c26b4a', d600: '#a9542f', l50: '#f8ebe3', d50: '#3a271d' },
  '#79876b': { name: 'Sage', main: '#79876b', d600: '#5f6d53', l50: '#eceee6', d50: '#2a3225' },
  '#bd8f33': { name: 'Gold', main: '#bd8f33', d600: '#8a6a1f', l50: '#f7efd8', d50: '#3a2f16' },
  '#5b6f9c': { name: 'Hanok Blue', main: '#5b6f9c', d600: '#42537a', l50: '#e7ecf4', d50: '#202838' },
};

export const DEFAULT_ACCENT: AccentKey = '#c26b4a';

// Font family names as registered with expo-font in app/_layout.tsx.
export const FONTS = {
  display: 'Fraunces',
  displayItalic: 'Fraunces-Italic',
  ui: 'Jakarta',
} as const;

const LIGHT = {
  paper: '#fbf6ee',
  surface: '#fffdfa',
  surface2: '#f4ece0',
  ink: '#2e2a24',
  inkSoft: '#6f665a',
  muted: '#a59a8a',
  line: '#ece2d3',
  terra50: '#f8ebe3', terra: '#c26b4a', terra700: '#a9542f',
  sage50: '#eceee6', sage: '#79876b', sage700: '#5f6d53',
  gold50: '#f7efd8', gold: '#c39b42', gold700: '#8a6a1f',
  rose50: '#f9e7e3', rose: '#c75c54', rose700: '#b04942',
  mapBg: '#eaf0ee', mapRoad: '#ffffff', mapWater: '#bcd6e6', mapPark: '#cfe3c4',
  // scrim / overlay helpers (RN-specific additions)
  scrim: 'rgba(46,42,36,0.45)',
};

const DARK: typeof LIGHT = {
  paper: '#1a1611',
  surface: '#241f18',
  surface2: '#2f2820',
  ink: '#f3ebde',
  inkSoft: '#b6ab9a',
  muted: '#837a6b',
  line: '#342d24',
  terra50: '#3a271d', terra: '#d07f5d', terra700: '#ecab8a',
  sage50: '#2a3225', sage: '#93a182', sage700: '#b6c6a2',
  gold50: '#3a2f16', gold: '#d4ab52', gold700: '#e8cd86',
  rose50: '#3a2320', rose: '#d97a72', rose700: '#eb9b93',
  mapBg: '#222a2c', mapRoad: '#3c474a', mapWater: '#27424f', mapPark: '#2c3d2e',
  scrim: 'rgba(0,0,0,0.55)',
};

export type Palette = typeof LIGHT & {
  accent: string;
  accent600: string;
  accent50: string;
};

export function buildPalette(dark: boolean, accent: AccentKey): Palette {
  const base = dark ? DARK : LIGHT;
  const acc = ACCENTS[accent] || ACCENTS[DEFAULT_ACCENT];
  return {
    ...base,
    accent: acc.main,
    accent600: acc.d600,
    accent50: dark ? acc.d50 : acc.l50,
  };
}

// Tone map used by TagPill / Chip (source/ui.jsx TONE).
export type Tone = 'terra' | 'sage' | 'gold' | 'rose';
export function toneColors(c: Palette, tone: Tone) {
  const map: Record<Tone, { bg: string; fg: string; solid: string }> = {
    terra: { bg: c.terra50, fg: c.terra700, solid: c.terra },
    sage: { bg: c.sage50, fg: c.sage700, solid: c.sage },
    gold: { bg: c.gold50, fg: c.gold700, solid: c.gold },
    rose: { bg: c.rose50, fg: c.rose700, solid: c.rose },
  };
  return map[tone] || map.sage;
}

// Soft card shadow (approximation of --shadow-soft for RN's single-shadow model).
export function softShadow(dark: boolean) {
  return {
    shadowColor: dark ? '#000' : '#4a341e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: dark ? 0.45 : 0.14,
    shadowRadius: 16,
    elevation: 4,
  };
}
