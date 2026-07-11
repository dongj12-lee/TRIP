// Seoul Passport — a collectible stamp system. Stamps are earned by saving or
// liking places (district + experience stamps) and by hitting milestones. The
// collection is permanent: once earned, a stamp stays (see lib/store earnStamps),
// so the passport only ever fills up.
//
// Stamp key formats:
//   district:<BareGuName>   e.g. "district:Gangnam"  (matches place.neighborhood)
//   exp:<id>                e.g. "exp:cafe"
//   ms:<id>                 e.g. "ms:firstsave"
import { Place } from '@/data/types';
import { SEOUL_DISTRICTS } from '@/data/seoulDistricts';

export type StampKind = 'district' | 'experience' | 'milestone';
export type StampDef = { key: string; kind: StampKind; emoji: string; label: string; hint: string };

const bare = (n: string) => n.replace(/-gu$/, '');
// A couple of romanization variants in the place data map onto one canonical gu.
const DISTRICT_ALIAS: Record<string, string> = { Jongro: 'Jongno' };
export function normalizeDistrict(n?: string | null): string | null {
  if (!n) return null;
  const b = bare(n);
  return DISTRICT_ALIAS[b] ?? b;
}

// 25 official districts, from the same polygon source the map uses.
export const DISTRICT_STAMPS: StampDef[] = SEOUL_DISTRICTS.map((d) => ({
  key: `district:${bare(d.name)}`,
  kind: 'district' as const,
  emoji: '🏛️',
  label: d.name,
  hint: `Save a spot in ${d.name}`,
}));
const DISTRICT_KEYS = new Set(DISTRICT_STAMPS.map((s) => s.key));

// Experience badges — earned by saving/liking a place of a given kind.
type ExpDef = StampDef & { match: (p: Place) => boolean };
const l2 = (p: Place) => p.categoryL2 ?? '';
export const EXPERIENCE_STAMPS: ExpDef[] = [
  { key: 'exp:palace', kind: 'experience', emoji: '🏯', label: 'Palace Pilgrim', hint: 'Save a historic site', match: (p) => p.category === 'History' },
  { key: 'exp:culture', kind: 'experience', emoji: '🎭', label: 'Culture Buff', hint: 'Save a cultural spot', match: (p) => p.category === 'Culture' && l2(p) !== 'Parks' },
  { key: 'exp:nature', kind: 'experience', emoji: '🌳', label: 'Nature Seeker', hint: 'Save a park or nature spot', match: (p) => p.category === 'Nature' || l2(p) === 'Parks' },
  { key: 'exp:market', kind: 'experience', emoji: '🧺', label: 'Market Hunter', hint: 'Save a traditional market', match: (p) => p.category === 'Shopping' && l2(p).includes('Traditional Market') },
  { key: 'exp:shopping', kind: 'experience', emoji: '🛍️', label: 'Shopaholic', hint: 'Save a shopping spot', match: (p) => p.category === 'Shopping' && !l2(p).includes('Traditional Market') },
  { key: 'exp:cafe', kind: 'experience', emoji: '☕', label: 'Cafe Hopper', hint: 'Save a cafe', match: (p) => p.category === 'Cuisine' && l2(p).includes('Cafe') },
  { key: 'exp:foodie', kind: 'experience', emoji: '🍜', label: 'Foodie', hint: 'Save a restaurant', match: (p) => p.category === 'Cuisine' && !l2(p).includes('Cafe') && !l2(p).includes('Bars') },
  { key: 'exp:nightowl', kind: 'experience', emoji: '🍺', label: 'Night Owl', hint: 'Save a bar or club', match: (p) => p.category === 'Cuisine' && l2(p).includes('Bars') },
  { key: 'exp:kcontent', kind: 'experience', emoji: '🎬', label: 'K-Content Fan', hint: 'Save a filming/idol spot', match: (p) => !!p.kContentTitle },
];

// Milestones — derived live from store state (not place-based).
export const MILESTONE_STAMPS: StampDef[] = [
  { key: 'ms:firstsave', kind: 'milestone', emoji: '🔖', label: 'First Save', hint: 'Save your first spot' },
  { key: 'ms:planner', kind: 'milestone', emoji: '🗺️', label: 'Trip Planner', hint: 'Add a stop to your trip' },
  { key: 'ms:storyteller', kind: 'milestone', emoji: '📸', label: 'Storyteller', hint: 'Share a post or route' },
  { key: 'ms:buddy', kind: 'milestone', emoji: '👋', label: 'Buddy Up', hint: 'Join or post a buddy plan' },
];

export const ALL_STAMPS: StampDef[] = [...DISTRICT_STAMPS, ...EXPERIENCE_STAMPS, ...MILESTONE_STAMPS];
export const TOTAL_STAMPS = ALL_STAMPS.length;
export const stampByKey: Record<string, StampDef> = Object.fromEntries(ALL_STAMPS.map((s) => [s.key, s]));

// The stamp keys a single place grants when saved/liked.
export function stampsForPlace(place: Place): string[] {
  const keys: string[] = [];
  const d = normalizeDistrict(place.neighborhood);
  if (d && DISTRICT_KEYS.has(`district:${d}`)) keys.push(`district:${d}`);
  for (const e of EXPERIENCE_STAMPS) if (e.match(place)) keys.push(e.key);
  return keys;
}

// Milestones from current engagement (unioned into the earned set at read time).
export function milestoneStamps(flags: { savedCount: number; hasPlan: boolean; hasShared: boolean; buddyCount: number }): string[] {
  const out: string[] = [];
  if (flags.savedCount > 0) out.push('ms:firstsave');
  if (flags.hasPlan) out.push('ms:planner');
  if (flags.hasShared) out.push('ms:storyteller');
  if (flags.buddyCount > 0) out.push('ms:buddy');
  return out;
}

export type Progress = { earned: number; total: number; districts: number };
export function progressFor(earned: Set<string>): Progress {
  let districts = 0;
  for (const k of earned) if (k.startsWith('district:')) districts++;
  return { earned: earned.size, total: TOTAL_STAMPS, districts };
}

// A traveler "rank" title based on how full the passport is — pure flavor that
// gives the collection a sense of leveling up.
export function passportRank(earned: number): { title: string; emoji: string } {
  if (earned >= 30) return { title: 'Seoul Native', emoji: '👑' };
  if (earned >= 20) return { title: 'Seoul Insider', emoji: '🌟' };
  if (earned >= 12) return { title: 'City Explorer', emoji: '🧭' };
  if (earned >= 5) return { title: 'Getting Around', emoji: '🚇' };
  return { title: 'Just Landed', emoji: '🛬' };
}
