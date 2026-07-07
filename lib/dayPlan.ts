// One-tap day-plan generator — the bridge between browsing and a shareable
// route. Pure scoring over the real Visit Seoul place data (no LLM, instant,
// works offline): pick a vibe, get a geographically coherent 5-stop day
// (sight → lunch → sight → break → dinner) that favors the user's saved
// spots and interests, avoids long cross-town hops, and goes indoor-heavy
// when rain is likely.
import { ItineraryDay, ItineraryStop, Place } from '@/data/types';
import { scorePlace } from './personalize';
import { haversineKm } from './routeHealth';

export type VibeKey = 'classic' | 'foodie' | 'kcontent' | 'shopping' | 'nature';

export const VIBES: Record<VibeKey, { emoji: string; label: string; blurb: string }> = {
  classic: { emoji: '🏯', label: 'Classic Seoul', blurb: 'Palaces, hanok & old-city landmarks' },
  foodie: { emoji: '🍜', label: 'Foodie', blurb: 'Markets, local eats & dessert' },
  kcontent: { emoji: '🎬', label: 'K-Content', blurb: 'Filming spots & fandom stops' },
  shopping: { emoji: '🛍️', label: 'Shopping', blurb: 'Malls, markets & specialty shops' },
  nature: { emoji: '🌳', label: 'Nature & Views', blurb: 'Parks, rivers & mountain views' },
};

const l2 = (p: Place) => p.categoryL2 ?? '';
const isCafe = (p: Place) => p.category === 'Cuisine' && l2(p).includes('Cafe');
const isBar = (p: Place) => p.category === 'Cuisine' && l2(p).includes('Bars');
const isMeal = (p: Place) => p.category === 'Cuisine' && !isCafe(p) && !isBar(p);
const isMarket = (p: Place) => p.category === 'Shopping' && l2(p).includes('Traditional Market');
const isPark = (p: Place) => p.category === 'Nature' || l2(p) === 'Parks';

// Rough indoor/outdoor split (drives the rainy-day bias).
function isOutdoorish(p: Place): boolean {
  if (p.category === 'Nature' || l2(p) === 'Parks') return true;
  if (p.category === 'History') return true; // palaces, historic sites — mostly open-air
  if (isMarket(p)) return false; // Seoul's classic markets are covered
  return false;
}
function isIndoorish(p: Place): boolean {
  if (p.category === 'Cuisine' || p.category === 'Experience Programs') return true;
  if (p.category === 'Shopping' && !isMarket(p)) return true;
  return ['Cultural Facilities', 'Performance Halls', 'Shopping Malls & Outlets'].includes(l2(p));
}

// What counts as a "sight" for each vibe (with a broad fallback if a pool
// runs dry in the chosen area).
const SIGHT_PREDICATES: Record<VibeKey, (p: Place) => boolean> = {
  classic: (p) =>
    p.category === 'History' ||
    (p.category === 'Culture' && ['Landmarks', 'Cultural Districts', 'Other Cultural Destinations'].includes(l2(p))),
  foodie: (p) => isMarket(p) || (p.category === 'Culture' && l2(p) === 'Cultural Districts'),
  kcontent: (p) =>
    (!!p.kContentTitle && !isMeal(p) && !isCafe(p)) ||
    (p.category === 'Culture' && ['Performance Halls', 'Theme Parks', 'Landmarks'].includes(l2(p))),
  shopping: (p) => p.category === 'Shopping',
  nature: (p) => isPark(p) || (p.category === 'History' && l2(p) === 'Religious Sites'),
};
const broadSight = (p: Place) => ['History', 'Culture', 'Nature', 'Shopping'].includes(p.category);

// How strongly a place embodies the chosen vibe. Without this, bulk-imported
// places (mostly unrated) tie on quality and the anchor pick degenerates to
// array order — e.g. a beer alley beating Gyeongbokgung for "Classic Seoul".
function vibeAffinity(p: Place, vibe: VibeKey): number {
  switch (vibe) {
    case 'classic':
      if (p.category === 'History') return 2; // palaces & historic sites lead
      if (l2(p) === 'Cultural Districts') return 1; // hanok villages, old streets
      if (l2(p) === 'Landmarks') return 1;
      return 0;
    case 'foodie':
      if (isMarket(p)) return 2; // Gwangjang-style market mornings
      if (l2(p) === 'Cultural Districts') return 0.8;
      return 0;
    case 'kcontent':
      if (p.kContentTitle) return 2;
      if (['Performance Halls', 'Theme Parks'].includes(l2(p))) return 1;
      if (l2(p) === 'Landmarks') return 0.5;
      return 0;
    case 'shopping':
      if (['Shopping Malls & Outlets', 'Department Stores', 'Duty Free Shops'].includes(l2(p))) return 1;
      if (isMarket(p)) return 1;
      return 0;
    case 'nature':
      if (p.category === 'Nature') return 2;
      if (l2(p) === 'Parks') return 1;
      return 0;
  }
}

type Slot = { time: string; pick: (p: Place) => boolean; fallback?: (p: Place) => boolean; role: string };

function slotsFor(vibe: VibeKey): Slot[] {
  const sight = SIGHT_PREDICATES[vibe];
  const breakPick = vibe === 'shopping' ? (p: Place) => isCafe(p) || isMarket(p) : isCafe;
  return [
    { time: '10:00', pick: sight, fallback: broadSight, role: 'Morning sight' },
    { time: '12:30', pick: isMeal, role: 'Lunch' },
    { time: '14:30', pick: sight, fallback: broadSight, role: 'Afternoon sight' },
    { time: '16:30', pick: breakPick, fallback: isCafe, role: 'Break' },
    { time: '18:30', pick: isMeal, role: 'Dinner' },
  ];
}

export type DayPlanInput = {
  places: Place[];
  interests: string[];
  saved: Set<string>;
  vibe: VibeKey;
  area?: string | null; // bare gu name ("Jongno") or null for anywhere
  rainy?: boolean;
  exclude?: Set<string>; // slugs from the previous roll (powers "Shuffle")
};

export type PlannedStop = { place: Place; time: string; role: string; saved: boolean; kmFromPrev: number | null };
export type DayPlan = { stops: PlannedStop[]; vibe: VibeKey; area: string | null; usedSaved: number; rainy: boolean; totalKm: number };

// Base desirability independent of slot: quality signals + personal signals.
function baseScore(p: Place, input: DayPlanInput): number {
  let s = 0;
  if (p.rating != null) s += Math.max(0, p.rating - 3.5) * 2; // 4.5★ → +2
  s += Math.min(p.likeCount ?? 0, 3) * 0.7;
  if (p.photoUrl) s += 0.6; // the plan should look good, not gray
  s += [p.soloOk, p.englishMenu, p.cardOk, p.englishSpoken, p.priceTransparent].filter(Boolean).length * 0.12;
  s += scorePlace(p, input.interests) * 0.7;
  s += vibeAffinity(p, input.vibe);
  if (input.saved.has(p.slug)) s += 3; // their own hearts come first
  if (input.area && p.neighborhood === input.area) s += 1.2;
  if (input.rainy) {
    if (isOutdoorish(p)) s -= 2;
    else if (isIndoorish(p)) s += 1.2;
  }
  return s;
}

export function generateDayPlan(input: DayPlanInput): DayPlan | null {
  const { places, vibe, area, exclude } = input;
  const used = new Set<string>();
  const stops: PlannedStop[] = [];
  let prev: Place | null = null;

  for (const slot of slotsFor(vibe)) {
    const pickFrom = (pred: (p: Place) => boolean, allowExcluded: boolean) => {
      let best: Place | null = null;
      let bestScore = -Infinity;
      for (const p of places) {
        if (used.has(p.slug) || !pred(p)) continue;
        if (!allowExcluded && exclude?.has(p.slug)) continue;
        // Hard area filter for the anchor stop only; proximity chains the rest.
        if (!prev && area && p.neighborhood !== area) continue;
        let s = baseScore(p, input);
        if (prev) {
          const km = haversineKm(prev, p);
          if (km > 8) continue; // never generate a cross-town hop
          s += Math.max(0, 2.5 - km * 1.1); // walkable beats a subway ride
        }
        if (s > bestScore) {
          bestScore = s;
          best = p;
        }
      }
      return best;
    };

    // Prefer un-excluded picks; relax exclusion, then the predicate, before giving up.
    const place =
      pickFrom(slot.pick, false) ??
      pickFrom(slot.pick, true) ??
      (slot.fallback ? pickFrom(slot.fallback, false) ?? pickFrom(slot.fallback, true) : null);
    if (!place) continue;

    used.add(place.slug);
    stops.push({
      place,
      time: slot.time,
      role: slot.role,
      saved: input.saved.has(place.slug),
      kmFromPrev: prev ? haversineKm(prev, place) : null,
    });
    prev = place;
  }

  if (stops.length < 4) return null; // not enough material to call it a day plan
  const totalKm = stops.reduce((s, st) => s + (st.kmFromPrev ?? 0), 0);
  return {
    stops,
    vibe,
    area: area ?? null,
    usedSaved: stops.filter((s) => s.saved).length,
    rainy: !!input.rainy,
    totalKm,
  };
}

// Convert a generated plan into a real editable itinerary day.
export function planToItineraryDay(plan: DayPlan, label: string, areaLabel?: string): ItineraryDay {
  const v = VIBES[plan.vibe];
  const stops: ItineraryStop[] = plan.stops.map((s) => ({
    time: s.time,
    part: '',
    name: s.place.name,
    note: s.saved ? '♥ from your saved spots' : '',
    slug: s.place.slug,
    swatch: s.place.swatch,
    lat: s.place.lat,
    lng: s.place.lng,
    category: s.place.category,
    photoUrl: s.place.photoUrl,
  }));
  return {
    label,
    date: '',
    theme: `${v.emoji} ${v.label}${areaLabel ? ` · ${areaLabel}` : ''}`,
    stops,
  };
}
