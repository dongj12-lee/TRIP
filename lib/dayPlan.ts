// One-tap day-plan generator, the bridge between browsing and a shareable
// route. Pure scoring over the real Visit Seoul place data (no LLM, instant,
// works offline): pick a vibe, get a geographically coherent 5-stop day
// (sight → lunch → sight → break → dinner) that favors the user's saved
// spots and interests, avoids long cross-town hops, and goes indoor-heavy
// when rain is likely.
import { ItineraryDay, ItineraryStop, Place } from '@/data/types';
import { categoryAffinity, scorePlace } from './personalize';
import { haversineKm } from './routeHealth';
import { isCivicFiller, prominenceBonus, tierOf } from './prominence';

export type VibeKey = 'classic' | 'foodie' | 'kcontent' | 'shopping' | 'nature';

export const VIBES: Record<VibeKey, { emoji: string; label: string; blurb: string }> = {
  classic: { emoji: '🏛️', label: 'Classic Seoul', blurb: 'Palaces, hanok & old-city landmarks' },
  foodie: { emoji: '🍜', label: 'Foodie', blurb: 'Markets, local eats & dessert' },
  kcontent: { emoji: '🎬', label: 'K-Content', blurb: 'Filming spots & fandom stops' },
  shopping: { emoji: '🛍️', label: 'Shopping', blurb: 'Malls, markets & specialty shops' },
  nature: { emoji: '🌳', label: 'Nature & Views', blurb: 'Parks, rivers & mountain views' },
};

const l2 = (p: Place) => p.categoryL2 ?? '';
// Exported: these are the single source of truth for "what can fill a slot".
// lib/tripEdit.ts used to re-derive its own copy for swap candidates and drifted
//, it excluded cafés but not bars, so "swap day 1's lunch" could offer a wine
// bar the generator itself would never have picked. Import, don't re-declare.
export const isCafePlace = (p: Place) => p.category === 'Cuisine' && l2(p).includes('Cafe');
export const isBarPlace = (p: Place) => p.category === 'Cuisine' && l2(p).includes('Bars');
export const isMealPlace = (p: Place) => p.category === 'Cuisine' && !isCafePlace(p) && !isBarPlace(p);
export const isMarketPlace = (p: Place) => p.category === 'Shopping' && l2(p).includes('Traditional Market');

const isCafe = isCafePlace;
const isBar = isBarPlace;
const isMeal = isMealPlace;
const isMarket = (p: Place) => p.category === 'Shopping' && l2(p).includes('Traditional Market');
const isPark = (p: Place) => p.category === 'Nature' || l2(p) === 'Parks';

// Pace controls how much of the day gets filled. Set by the natural-language
// trip intake (lib/tripIntake.ts) or left undefined (= balanced).
export type Pace = 'relaxed' | 'balanced' | 'packed';

// "Skip X" tags from the intake, mapped to what they match in the catalog. A
// matched place is heavily penalised (not hard-excluded) so a slot with nothing
// but avoided options still yields the least-bad real place rather than a hole.
const AVOID_MATCHERS: Record<string, (p: Place) => boolean> = {
  history: (p) => p.category === 'History',
  shopping: (p) => p.category === 'Shopping' && !isMarket(p),
  markets: (p) => isMarket(p),
  nature: (p) => isPark(p),
  nightlife: (p) => isBarPlace(p),
  cafes: (p) => isCafePlace(p),
  museums: (p) => l2(p) === 'Cultural Facilities' || l2(p).includes('Museum'),
  kcontent: (p) => !!p.kContentTitle,
};
function isAvoided(p: Place, avoid?: string[]): boolean {
  if (!avoid?.length) return false;
  return avoid.some((a) => AVOID_MATCHERS[a]?.(p));
}

// Rough indoor/outdoor split (drives the rainy-day bias).
function isOutdoorish(p: Place): boolean {
  if (p.category === 'Nature' || l2(p) === 'Parks') return true;
  if (p.category === 'History') return true; // palaces, historic sites, mostly open-air
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
// array order, e.g. a beer alley beating Gyeongbokgung for "Classic Seoul".
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

// The day's fixed shape. Exported so lib/tripPlan.ts can work out how much of
// a day a flight leaves usable without re-declaring these times and drifting
// out of sync with the slots actually generated below.
export const SLOT_TIMES = ['10:00', '12:30', '14:30', '16:30', '18:30'] as const;

function slotsFor(vibe: VibeKey, times?: readonly string[], pace?: Pace): Slot[] {
  const sight = SIGHT_PREDICATES[vibe];
  const breakPick = vibe === 'shopping' ? (p: Place) => isCafe(p) || isMarket(p) : isCafe;
  const [t1, t2, t3, t4, t5] = SLOT_TIMES;
  let full: Slot[] = [
    { time: t1, pick: sight, fallback: broadSight, role: 'Morning sight' },
    { time: t2, pick: isMeal, role: 'Lunch' },
    { time: t3, pick: sight, fallback: broadSight, role: 'Afternoon sight' },
    { time: t4, pick: breakPick, fallback: isCafe, role: 'Break' },
    { time: t5, pick: isMeal, role: 'Dinner' },
  ];
  // A relaxed pace drops the mid-afternoon break (and its café), leaving a
  // lighter four-stop day: morning sight, lunch, one afternoon sight, dinner.
  // Packed and balanced keep the full five (packed is expressed by keeping
  // everything and not thinning; the day is already dense).
  if (pace === 'relaxed') full = full.filter((s) => s.role !== 'Break');
  if (!times) return full;

  const kept = full.filter((s) => times.includes(s.time));
  if (!kept.length) return [];

  // A short day still has to be worth leaving the hotel for. Landing at 2 PM
  // leaves only the 16:30 and 18:30 slots, whose canonical roles are a café and
  // dinner, so the "Palaces & Bukchon" afternoon would come back as coffee and
  // dessert with the palace nowhere in it. Promote the café slot to a sight so
  // the day keeps a reason to exist.
  const hasSight = kept.some((s) => s.role.includes('sight'));
  if (!hasSight) {
    const idx = kept.findIndex((s) => s.role === 'Break');
    if (idx !== -1) kept[idx] = { ...kept[idx], pick: sight, fallback: broadSight, role: 'Sight' };
  }
  return kept;
}

export type DayPlanInput = {
  places: Place[];
  interests: string[];
  saved: Set<string>;
  reactions: Record<string, 'like' | 'dislike'>; // real 👍/👎 from place detail
  vibe: VibeKey;
  area?: string | null; // bare gu name ("Jongno") or null for anywhere
  rainy?: boolean;
  /** How full to make the day. undefined = balanced. From the trip intake. */
  pace?: Pace;
  /** "Skip X" tags to down-weight (history, shopping, cafes…). From the intake. */
  avoid?: string[];
  exclude?: Set<string>; // slugs from the previous roll (powers "Shuffle")
  /**
   * Restrict the day to these slot times (a subset of SLOT_TIMES). Used by the
   * trip planner to plan a day that fits a flight, rather than planning a full
   * day and clipping it, clipping drops whichever landmark happened to sit in
   * a removed slot.
   */
  slotTimes?: readonly string[];
};

export type PlannedStop = {
  place: Place;
  time: string;
  role: string;
  saved: boolean;
  kmFromPrev: number | null;
  // Other places that scored nearly as well for this slot, an "ambiguous
  // pick" signal. Populated only when a close runner-up exists; consumed by
  // an optional on-device refinement pass (see lib/foundationModels.ts),
  // never required, the heuristic `place` above is always a complete,
  // valid pick on its own.
  alternates?: Place[];
};
export type DayPlan = { stops: PlannedStop[]; vibe: VibeKey; area: string | null; usedSaved: number; rainy: boolean; totalKm: number };

// Base desirability independent of slot: quality signals + personal signals.
function baseScore(p: Place, input: DayPlanInput, affinity: Map<string, number>): number {
  let s = 0;
  // NOTE: rating/likeCount are the "quality" terms, but both are effectively
  // dead in the live catalog (rating is null on every row, likeCount > 0 on
  // one). They're kept because they'll start firing as real users vote, but
  // prominence below is what actually separates a landmark from a local park
  // today. Without it, a cold-start plan is proximity-sorted noise.
  if (p.rating != null) s += Math.max(0, p.rating - 3.5) * 2; // 4.5★ → +2
  s += Math.min(p.likeCount ?? 0, 3) * 0.7;
  s += prominenceBonus(p);
  if (p.photoUrl) s += 0.6; // the plan should look good, not gray
  s += [p.soloOk, p.englishMenu, p.cardOk, p.englishSpoken, p.priceTransparent].filter(Boolean).length * 0.12;
  s += scorePlace(p, input.interests) * 0.7;
  s += vibeAffinity(p, input.vibe);
  if (input.saved.has(p.slug)) s += 3; // their own hearts come first
  if (input.reactions[p.slug] === 'like') s += 1.5; // they already told us they liked this one
  s += affinity.get(p.category) ?? 0; // learned from their likes/dislikes in this category
  if (input.area && p.neighborhood === input.area) s += 1.2;
  if (input.rainy) {
    if (isOutdoorish(p)) s -= 2;
    else if (isIndoorish(p)) s += 1.2;
  }
  // "Skip palaces / not into shopping" — a heavy penalty rather than a hard
  // exclude, so the pick degrades to the least-avoided real place if a slot
  // has nothing else, and a saved spot the traveller hearted still wins.
  if (isAvoided(p, input.avoid)) s -= 50;
  return s;
}

export function generateDayPlan(input: DayPlanInput): DayPlan | null {
  const { places, vibe, area, exclude, reactions } = input;
  const affinity = categoryAffinity(reactions, places);
  const used = new Set<string>();
  const stops: PlannedStop[] = [];
  let prev: Place | null = null;

  // How close a runner-up's score needs to be to the winner's to count as a
  // genuinely "ambiguous" pick worth offering to an optional refinement pass
  //, an absolute score-point gap (not a % of the total, which gets skewed
  // near zero/negative scores), roughly the size of the smaller signal terms
  // in baseScore (e.g. a single interest match is +0.7).
  const AMBIGUOUS_DELTA = 0.8;
  const TOP_N = 3;

  for (const slot of slotsFor(vibe, input.slotTimes, input.pace)) {
    const pickFrom = (pred: (p: Place) => boolean, allowExcluded: boolean): { place: Place; alternates: Place[] } | null => {
      const top: { place: Place; score: number }[] = []; // kept sorted desc, capped at TOP_N
      for (const p of places) {
        if (used.has(p.slug) || !pred(p)) continue;
        if (reactions[p.slug] === 'dislike') continue; // never resurface a "Not for me"
        if (!allowExcluded && exclude?.has(p.slug)) continue;
        // Community centres, municipal libraries and the like are real places
        // in the catalog but never a reason to spend a holiday hour, drop them
        // outright rather than relying on them merely scoring low.
        if (isCivicFiller(p)) continue;
        // Hard area filter for the anchor stop only; proximity chains the rest.
        if (!prev && area && p.neighborhood !== area) continue;
        let s = baseScore(p, input, affinity);
        if (prev) {
          const km = haversineKm(prev, p);
          if (km > 8) continue; // never generate a cross-town hop
          s += Math.max(0, 2.5 - km * 1.1); // walkable beats a subway ride
        }
        if (top.length < TOP_N || s > top[top.length - 1].score) {
          top.push({ place: p, score: s });
          top.sort((a, b) => b.score - a.score);
          if (top.length > TOP_N) top.length = TOP_N;
        }
      }
      if (!top.length) return null;
      const bestScore = top[0].score;
      const alternates = top.slice(1).filter((t) => bestScore - t.score < AMBIGUOUS_DELTA).map((t) => t.place);
      return { place: top[0].place, alternates };
    };

    // Prefer un-excluded picks; relax exclusion, then the predicate, before giving up.
    const picked =
      pickFrom(slot.pick, false) ??
      pickFrom(slot.pick, true) ??
      (slot.fallback ? pickFrom(slot.fallback, false) ?? pickFrom(slot.fallback, true) : null);
    if (!picked) continue;
    const { place, alternates } = picked;

    used.add(place.slug);
    stops.push({
      place,
      time: slot.time,
      role: slot.role,
      saved: input.saved.has(place.slug),
      kmFromPrev: prev ? haversineKm(prev, place) : null,
      alternates: alternates.length ? alternates : undefined,
    });
    prev = place;
  }

  // "Enough material to call it a day plan" has to scale with how much day
  // there is. The flat minimum of 4 below is right for a full day, but a
  // deliberately short day (landed at 2 PM, two slots left) could never reach
  // it and the whole day would vanish from the trip.
  // A relaxed day is only four slots by design, so hold it to a lower bar than
  // a full five-slot day, or a single unfillable slot would drop the day.
  const fullDayMin = input.pace === 'relaxed' ? 3 : 4;
  const minStops = input.slotTimes ? Math.max(1, Math.ceil(input.slotTimes.length / 2)) : fullDayMin;
  if (stops.length < minStops) return null;
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
