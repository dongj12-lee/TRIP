// Design tokens ported from source/app.jsx (LIGHT / DARK / ACCENTS / FONTS).
// RN has no CSS variables, so these become a plain palette object resolved by the
// ThemeProvider. Keys mirror the original CSS custom-property names (minus the `--`).

export type AccentKey = '#c26b4a' | '#79876b' | '#bd8f33' | '#5b6f9c';

export const ACCENTS: Record<
  AccentKey,
  { name: string; main: string; d600: string; l50: string; d50: string }
> = {
  // main/d600/l50/d50 rebuilt alongside LIGHT/DARK's terra/sage/blue (see the
  // comment there — the old hues sat ~2-4° from Anthropic's own brand colors).
  // Keys stay the original hex (AccentKey union / stored user preference);
  // only the rendered values shift, same pattern already used for Gold below.
  '#c26b4a': { name: 'Terracotta', main: '#a36643', d600: '#7a4429', l50: '#f7ebe3', d50: '#3f291c' },
  '#79876b': { name: 'Sage', main: '#4c766e', d600: '#2d584f', l50: '#e8f2f0', d50: '#1f332f' },
  // main darkened #bd8f33 → #a67a26 so white button text clears 3:1 (3.87:1,
  // was 2.94 — the only accent that failed it). Still clearly gold; matches
  // the other accents' ~3.82 contrast. Key stays #bd8f33 (it's the AccentKey
  // union / stored preference), only the rendered `main` shifts.
  '#bd8f33': { name: 'Gold', main: '#a67a26', d600: '#8a6a1f', l50: '#f7efd8', d50: '#3a2f16' },
  '#5b6f9c': { name: 'Hanok Blue', main: '#4d5589', d600: '#2f376a', l50: '#ebecf5', d50: '#22253a' },
};

export const DEFAULT_ACCENT: AccentKey = '#c26b4a';

// Font family names as registered with expo-font in app/_layout.tsx.
export const FONTS = {
  display: 'Fraunces',
  displayItalic: 'Fraunces-Italic',
  ui: 'Pretendard',
} as const;

// Corner-radius scale — the single source of truth for rounding. Replaces the
// 16 ad-hoc values that had accumulated (a "no system" tell). Five deliberate
// steps + a pill, biased slightly crisp to suit the editorial voice. Nest
// concentrically: an inner element's radius should be its container's minus the
// padding between them (see components that pass `radius={...}`).
export const RADII = {
  xs: 6, // tiny insets, progress bars, small tags
  sm: 10, // inputs, small tiles, compact chips
  md: 14, // the default — most cards, buttons, media
  lg: 18, // large cards / feature surfaces
  xl: 22, // bottom sheets, hero blocks
  pill: 999,
} as const;

const LIGHT = {
  // Neutral, not cream: the previous #fbf6ee sat close enough to Claude's own
  // brand cream (#F0ECE0) + serif-headline pairing to read as "made with
  // Claude Code" rather than an intentional editorial choice. A near-white
  // with only a hair of warmth avoids that association while staying off the
  // clinical, eye-straining pure #fff.
  paper: '#faf9f7',
  surface: '#ffffff',
  surface2: '#f0efec',
  ink: '#2e2a24',
  inkSoft: '#6f665a',
  // WCAG AA: ≥4.54:1 against every light surface incl. the tinted surface2
  // (was #767063, 4.28:1 on surface2 — under AA for its small 11–12px labels).
  muted: '#726c5f',
  line: '#e6e4e0',
  // terra/sage/blue hues rebuilt: the old ones sat within ~2-4° of Anthropic's
  // own brand orange/green (#d97757 h15 / #788c5d h86) — coincidence at that
  // proximity reads as "made with Claude Code." terra keeps its hue near that
  // family (rose h4 and gold h39 bookend the available warm range) but drops
  // to a muted brick/rust (was S50/L53 bright coral, now S42/L45) instead of
  // Anthropic's bright coral. sage moves off olive-green entirely into a
  // Korean-celadon teal (h169, was h90) and blue deepens toward indigo (h232,
  // was h222) — both now comfortably clear of Anthropic's hues.
  terra50: '#f7ebe3', terra: '#a36643', terra700: '#7a4429',
  sage50: '#e8f2f0', sage: '#4c766e', sage700: '#2d584f',
  gold50: '#f7efd8', gold: '#c39b42', gold700: '#8a6a1f',
  rose50: '#f9e7e3', rose: '#c75c54', rose700: '#b04942',
  blue50: '#ebecf5', blue: '#4d5589', blue700: '#2f376a',
  mapBg: '#eaf0ee', mapRoad: '#ffffff', mapWater: '#bcd6e6', mapPark: '#cfe3c4',
  // scrim / overlay helpers (RN-specific additions)
  scrim: 'rgba(46,42,36,0.45)',
};

const DARK: typeof LIGHT = {
  // Neutralized alongside LIGHT's paper — a warm-brown-black read the same
  // way the light cream did; a near-neutral charcoal doesn't.
  paper: '#171614',
  surface: '#201f1d',
  surface2: '#2a2927',
  ink: '#f3ebde',
  inkSoft: '#b6ab9a',
  // WCAG AA: ≥4.6:1 on every dark surface incl. the lightest (surface2)
  // (was #837a6b, 4.25:1 on paper and failing on surface2).
  muted: '#99907d',
  line: '#302f2c',
  terra50: '#3f291c', terra: '#d39069', terra700: '#ebbda2',
  sage50: '#1f332f', sage: '#7ab8ab', sage700: '#abd9d0',
  gold50: '#3a2f16', gold: '#d4ab52', gold700: '#e8cd86',
  rose50: '#3a2320', rose: '#d97a72', rose700: '#eb9b93',
  blue50: '#22253a', blue: '#848ecd', blue700: '#b3b9e6',
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
export type Tone = 'terra' | 'sage' | 'gold' | 'rose' | 'blue';
export function toneColors(c: Palette, tone: Tone) {
  const map: Record<Tone, { bg: string; fg: string; solid: string }> = {
    terra: { bg: c.terra50, fg: c.terra700, solid: c.terra },
    sage: { bg: c.sage50, fg: c.sage700, solid: c.sage },
    gold: { bg: c.gold50, fg: c.gold700, solid: c.gold },
    rose: { bg: c.rose50, fg: c.rose700, solid: c.rose },
    blue: { bg: c.blue50, fg: c.blue700, solid: c.blue },
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
