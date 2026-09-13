// Edit operations over a generated trip.
//
// A generated plan is a starting point, not a verdict, the whole thing falls
// apart the moment a traveller looks at day 2's lunch and thinks "not that".
// This module is the single place those edits live, so both the manual
// controls on the trip screen AND the chat assistant apply changes the same
// way (the chat layer resolves language into these same ops rather than
// mutating the trip itself).
//
// Everything here is pure: takes a trip, returns a new trip. No React, no
// network, the same reason lib/dayPlan.ts is testable with plain `npx tsx`.
import { Place } from '@/data/types';
import { PlannedStop, isCafePlace, isMarketPlace, isMealPlace } from './dayPlan';
import { TripDay, TripPlan } from './tripPlan';
import { haversineKm } from './routeHealth';
import { isCivicFiller, tierOf } from './prominence';

// A stop the user has explicitly kept, regeneration and "surprise me" must
// leave these alone. Keyed "dayIndex:slug" so a place pinned on day 1 doesn't
// accidentally protect the same place if it appears on day 3.
export type PinSet = ReadonlySet<string>;
export const pinKey = (dayIndex: number, slug: string) => `${dayIndex}:${slug}`;

// Recompute the walking distances after any structural change, a swapped or
// removed stop changes its neighbours' legs, and a trip that shows stale
// distances is worse than one that shows none.
function relink(stops: PlannedStop[]): { stops: PlannedStop[]; totalKm: number } {
  const out = stops.map((s, i) => ({
    ...s,
    kmFromPrev: i === 0 ? null : haversineKm(stops[i - 1].place, s.place),
  }));
  return { stops: out, totalKm: out.reduce((sum, s) => sum + (s.kmFromPrev ?? 0), 0) };
}

function withStops(day: TripDay, stops: PlannedStop[]): TripDay {
  const { stops: linked, totalKm } = relink(stops);
  return { ...day, plan: { ...day.plan, stops: linked, totalKm } };
}

function mapDay(trip: TripPlan, dayIndex: number, fn: (d: TripDay) => TripDay): TripPlan {
  const days = trip.days.map((d) => (d.dayIndex === dayIndex ? fn(d) : d));
  return { days, totalKm: days.reduce((s, d) => s + d.plan.totalKm, 0) };
}

/** Drop a stop. The day keeps its shape; it just gets shorter. */
export function removeStop(trip: TripPlan, dayIndex: number, slug: string): TripPlan {
  return mapDay(trip, dayIndex, (d) => withStops(d, d.plan.stops.filter((s) => s.place.slug !== slug)));
}

const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); };
const toHHMM = (mins: number) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
// A time for a stop inserted between two others: the midpoint of their times,
// or an offset off whichever neighbour exists, so the day stays roughly ordered.
function midTime(prev?: string, next?: string): string {
  if (prev && next) return toHHMM(Math.round((toMin(prev) + toMin(next)) / 2));
  if (prev) return toHHMM(Math.min(22 * 60, toMin(prev) + 90));
  if (next) return toHHMM(Math.max(9 * 60, toMin(next) - 90));
  return '12:00';
}

/**
 * Insert a new place into a day at the point that adds the least walking, and
 * give it a time between its new neighbours. This is the "add a dessert stop /
 * squeeze in a museum" case — the counterpart to removeStop.
 */
export function addStop(trip: TripPlan, dayIndex: number, place: Place): TripPlan {
  return mapDay(trip, dayIndex, (d) => {
    const stops = d.plan.stops;
    if (!stops.length) {
      return withStops(d, [{ place, time: '12:00', role: 'Added stop', saved: false, kmFromPrev: null }]);
    }
    // Choose the insertion index that adds the least detour to the route.
    let bestIdx = stops.length;
    let bestCost = Infinity;
    for (let i = 0; i <= stops.length; i++) {
      const prev = stops[i - 1]?.place;
      const nxt = stops[i]?.place;
      const cost =
        (prev ? haversineKm(prev, place) : 0) +
        (nxt ? haversineKm(place, nxt) : 0) -
        (prev && nxt ? haversineKm(prev, nxt) : 0);
      if (cost < bestCost) { bestCost = cost; bestIdx = i; }
    }
    const newStop: PlannedStop = {
      place,
      time: midTime(stops[bestIdx - 1]?.time, stops[bestIdx]?.time),
      role: 'Added stop',
      saved: false,
      kmFromPrev: null,
    };
    return withStops(d, [...stops.slice(0, bestIdx), newStop, ...stops.slice(bestIdx)]);
  });
}

/**
 * Real places that could be added to a day: near the day's existing stops (so
 * the addition stays in-neighbourhood), not already anywhere in the trip, and
 * not civic filler. Any kind, the criterion decides what actually goes in.
 */
export function addCandidates(trip: TripPlan, dayIndex: number, places: Place[], limit = 40): Place[] {
  const day = trip.days.find((d) => d.dayIndex === dayIndex);
  if (!day || !day.plan.stops.length) return [];
  const taken = slugsInTrip(trip);
  const anchors = day.plan.stops.map((s) => s.place);
  const near = (p: Place) => Math.min(...anchors.map((a) => haversineKm(a, p)));
  return places
    .filter((p) => !taken.has(p.slug) && !isCivicFiller(p) && near(p) <= 2.5)
    .map((p) => {
      const tier = tierOf(p);
      return { p, s: (tier === 'S' ? 4 : tier === 'A' ? 1.5 : 0) + Math.max(0, 2.5 - near(p) * 1.1) + (p.photoUrl ? 0.4 : 0) };
    })
    .sort((a, b) => b.s - a.s)
    .map((x) => x.p)
    .slice(0, limit);
}

/** Put a specific place into a specific slot, keeping that slot's time/role. */
export function replaceStop(trip: TripPlan, dayIndex: number, slug: string, replacement: Place): TripPlan {
  return mapDay(trip, dayIndex, (d) =>
    withStops(
      d,
      d.plan.stops.map((s) =>
        s.place.slug === slug ? { ...s, place: replacement, saved: false, alternates: undefined } : s,
      ),
    ),
  );
}

// Everything already scheduled anywhere in the trip, a replacement must not
// duplicate a stop the traveller is already visiting on another day.
function slugsInTrip(trip: TripPlan): Set<string> {
  return new Set(trip.days.flatMap((d) => d.plan.stops.map((s) => s.place.slug)));
}

/**
 * Candidate replacements for one slot, best first.
 *
 * Scoped to places that suit the same role (a lunch slot offers restaurants,
 * a sight slot offers sights) and sit near the surrounding stops, so swapping
 * one stop can't quietly wreck the day's geography. `alternates` from the
 * generator seed the list, they were already scored for this exact slot.
 */
export function swapCandidates(
  trip: TripPlan,
  dayIndex: number,
  slug: string,
  places: Place[],
  limit = 12,
): Place[] {
  const day = trip.days.find((d) => d.dayIndex === dayIndex);
  if (!day) return [];
  const idx = day.plan.stops.findIndex((s) => s.place.slug === slug);
  if (idx === -1) return [];
  const stop = day.plan.stops[idx];
  const taken = slugsInTrip(trip);

  // Slot predicates come from dayPlan so a swap can only ever offer something
  // the generator would have been willing to put in that slot itself.
  const isMealSlot = stop.role === 'Lunch' || stop.role === 'Dinner';
  const isBreakSlot = stop.role === 'Break';
  const sameKind = (p: Place) => {
    if (isMealSlot) return isMealPlace(p);
    if (isBreakSlot) return isCafePlace(p) || isMarketPlace(p);
    return p.category !== 'Cuisine'; // a sight slot stays a sight
  };

  // Anchor on the neighbours so the replacement lands inside the same day,
  // not merely inside the same city.
  const anchors = [day.plan.stops[idx - 1]?.place, day.plan.stops[idx + 1]?.place].filter(Boolean) as Place[];
  const nearAnchors = (p: Place) =>
    anchors.length === 0 ? 0 : Math.min(...anchors.map((a) => haversineKm(a, p)));

  const seeded = (stop.alternates ?? []).filter((p) => !taken.has(p.slug));
  const pool = places.filter(
    (p) => !taken.has(p.slug) && sameKind(p) && !isCivicFiller(p) && (anchors.length === 0 || nearAnchors(p) <= 2.5),
  );

  const scored = pool
    .map((p) => {
      const tier = tierOf(p);
      const km = nearAnchors(p);
      return { p, s: (tier === 'S' ? 4 : tier === 'A' ? 1.5 : 0) + Math.max(0, 2.5 - km * 1.1) + (p.photoUrl ? 0.4 : 0) };
    })
    .sort((a, b) => b.s - a.s)
    .map((x) => x.p);

  // Seeded alternates first (they were scored for this slot in context), then
  // the geographic pool, de-duplicated.
  const seen = new Set<string>();
  return [...seeded, ...scored].filter((p) => (seen.has(p.slug) ? false : (seen.add(p.slug), true))).slice(0, limit);
}
