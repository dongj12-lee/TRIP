// Traveler-intent categories — the browsing taxonomy Explore actually shows.
//
// Visit Seoul's own hierarchy (category/L2/L3) is an administrator's taxonomy:
// "Culture" holds parks AND museums AND landmarks, "History" vs "Culture" is
// arbitrary to a tourist, and "Experience Programs" is opaque. Travelers think
// in intents — eat / café / see / shop / nature / night out. This module maps
// every (category, L2, L3) combination onto 9 intent buckets, verified to
// cover the full 2,110-place catalog with nothing left over.
//
// The raw Visit Seoul fields stay untouched on `Place` (they still drive
// Foreigner-Fit tag selection and the day-plan generator); this is purely the
// user-facing browse layer.
import { Place } from './types';

export type IntentKey =
  | 'eat' | 'cafe' | 'sights' | 'arts' | 'nature'
  | 'shopping' | 'markets' | 'nightlife' | 'fun';

export type Intent = {
  key: IntentKey;
  emoji: string;
  label: string;
  match: (p: Place) => boolean;
  // Optional refinement: a short sub-label for a place within this intent
  // (e.g. Eat → "Korean" / "Western"). Distinct values become the sub-chip row.
  sub?: (p: Place) => string | null;
};

const l2 = (p: Place) => p.categoryL2 ?? '';
const l3 = (p: Place) => p.categoryL3 ?? '';

const isCafe = (p: Place) => p.category === 'Cuisine' && l2(p).includes('Cafe');
const isBar = (p: Place) => p.category === 'Cuisine' && l2(p).includes('Bars');
const isMarket = (p: Place) => p.category === 'Shopping' && l2(p).includes('Traditional Market');

export const INTENTS: Intent[] = [
  {
    key: 'eat', emoji: '🍜', label: 'Eat',
    match: (p) => p.category === 'Cuisine' && !isCafe(p) && !isBar(p),
    sub: (p) => {
      if (l2(p) === 'Korean Restaurants') return 'Korean';
      if (l2(p) === 'Foreign Restaurant') {
        const t = l3(p);
        if (t === 'Western' || t === 'Chinese' || t === 'Japanese') return t;
        return 'World'; // Fusion / Others / untagged foreign
      }
      return 'Local picks'; // Cuisine with no L2 — untagged local spots
    },
  },
  { key: 'cafe', emoji: '☕', label: 'Cafés', match: isCafe },
  {
    key: 'sights', emoji: '🏯', label: 'Sights',
    match: (p) =>
      p.category === 'History' ||
      (p.category === 'Culture' && ['Landmarks', 'Cultural Districts', 'Other Cultural Destinations'].includes(l2(p))),
    sub: (p) => {
      if (l2(p) === 'Historical Sites') return 'Historic';
      if (l2(p) === 'Religious Sites') return 'Temples';
      if (l2(p) === 'Landmarks') return 'Landmarks';
      if (l2(p) === 'Cultural Districts') return 'Neighborhoods';
      if (l2(p) === 'Other Cultural Destinations') return 'Hidden gems';
      return p.category === 'History' ? 'Historic' : null;
    },
  },
  {
    key: 'arts', emoji: '🎨', label: 'Museums',
    // Cultural Facilities (museums/galleries/libraries) + the small leftovers
    // of Culture that fit "indoor culture" (education/convention/untagged).
    match: (p) =>
      p.category === 'Culture' &&
      ['Cultural Facilities', 'Education Centers', 'Convention Centers', ''].includes(l2(p)),
  },
  {
    key: 'nature', emoji: '🌳', label: 'Nature',
    // Travelers read city parks as nature, wherever Visit Seoul files them.
    match: (p) => p.category === 'Nature' || (p.category === 'Culture' && l2(p) === 'Parks'),
    sub: (p) => {
      if (l2(p).includes('Mountain')) return 'Mountains';
      if (l2(p).includes('River')) return 'Rivers';
      return 'Parks';
    },
  },
  {
    key: 'shopping', emoji: '🛍️', label: 'Shopping',
    match: (p) => p.category === 'Shopping' && !isMarket(p),
    sub: (p) => {
      if (l2(p) === 'Specialty Shops & Stores') return 'Specialty';
      if (['Shopping Malls & Outlets', 'Department Stores', 'Duty Free Shops', 'Supermarkets & Warehouses'].includes(l2(p))) return 'Malls & dept';
      return null;
    },
  },
  { key: 'markets', emoji: '🧺', label: 'Markets', match: isMarket },
  { key: 'nightlife', emoji: '🍺', label: 'Nightlife', match: isBar },
  {
    key: 'fun', emoji: '🎟️', label: 'Experiences',
    match: (p) =>
      p.category === 'Experience Programs' ||
      (p.category === 'Culture' && ['Performance Halls', 'Theme Parks', 'Leisure/Sports Centers'].includes(l2(p))),
    sub: (p) => {
      if (l2(p) === 'Performance Halls') return 'Shows';
      if (l2(p) === 'Theme Parks') return 'Theme parks';
      if (l2(p) === 'Leisure/Sports Centers') return 'Active';
      if (l2(p) === 'Wellness') return 'Wellness';
      if (l2(p) === 'Craft Workshops') return 'Crafts';
      if (l2(p) === 'Traditional Experience' || l2(p) === 'Temple Stays') return 'Traditional';
      return 'More';
    },
  },
];

export const intentByKey: Record<string, Intent> = Object.fromEntries(INTENTS.map((i) => [i.key, i]));

// First matching intent for a place (used for card labels + filtering).
export function intentFor(p: Place): Intent | undefined {
  return INTENTS.find((i) => i.match(p));
}

// Short display label for a place's bucket, falling back to the raw category
// for anything a future import adds that no intent claims yet.
export function intentLabel(p: Place): string {
  return intentFor(p)?.label ?? p.category;
}
