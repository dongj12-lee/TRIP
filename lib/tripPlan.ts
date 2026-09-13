// Multi-day trip planner, the "2박 3일" case, which is what most visitors to
// Seoul actually book.
//
// This is deliberately NOT "call generateDayPlan N times". Doing that produces
// three days that all gravitate to the same highest-scoring cluster (usually
// Gyeongbokgung/Jongno, since that's where the S-tier density is), repeat the
// same neighbourhood, and leave half the city unseen. A trip has to be planned
// as one object.
//
// The approach:
//  1. Split Seoul into the handful of zones a visitor would actually think in
//     ("the palace side", "Hongdae", "Gangnam"…), each anchored on real coords.
//  2. Score each zone for how much it can carry a day (S-tier density first).
//  3. Assign one zone per day, best zone to day 1, and, importantly, force
//     day-to-day variety so you don't get three palace days.
//  4. Plan each day inside its zone, carrying a shared `used` set so nothing
//     repeats across the whole trip.
//
// Days are also shaped by trip position: day 1 starts late (you landed), the
// final day ends early (you're flying out). That's the difference between a
// plan that reads as generated and one that reads as planned.
import { ItineraryDay, Place } from '@/data/types';
import { DayPlan, Pace, PlannedStop, SLOT_TIMES, VIBES, VibeKey, generateDayPlan, planToItineraryDay } from './dayPlan';
import { haversineKm } from './routeHealth';
import { tierOf } from './prominence';

// Tourist zones, anchored on real coordinates rather than administrative gu —
// Jongno-gu alone spans Gyeongbokgung and Ikseon-dong, which are different days
// out, while Hongdae/Yeonnam straddle a gu boundary but are one afternoon.
export type Zone = {
  key: string;
  label: string;
  lat: number;
  lng: number;
  radiusKm: number;
  // The vibe this zone is genuinely best at, used to theme its day.
  vibe: VibeKey;
};

export const ZONES: Zone[] = [
  { key: 'palace', label: 'Palaces & Bukchon', lat: 37.5796, lng: 126.977, radiusKm: 2.2, vibe: 'classic' },
  { key: 'myeongdong', label: 'Myeongdong & Namsan', lat: 37.5601, lng: 126.9855, radiusKm: 2.2, vibe: 'shopping' },
  { key: 'euljiro', label: 'Euljiro & DDP', lat: 37.5665, lng: 127.009, radiusKm: 2.0, vibe: 'foodie' },
  { key: 'hongdae', label: 'Hongdae & Yeonnam', lat: 37.5563, lng: 126.9236, radiusKm: 2.2, vibe: 'kcontent' },
  { key: 'gangnam', label: 'Gangnam & Apgujeong', lat: 37.5251, lng: 127.0292, radiusKm: 3.0, vibe: 'shopping' },
  { key: 'seongsu', label: 'Seongsu & Seoul Forest', lat: 37.5445, lng: 127.0557, radiusKm: 2.2, vibe: 'foodie' },
  { key: 'jamsil', label: 'Jamsil & Olympic Park', lat: 37.5131, lng: 127.1025, radiusKm: 3.0, vibe: 'shopping' },
  { key: 'yongsan', label: 'Itaewon & Yongsan', lat: 37.5345, lng: 126.9945, radiusKm: 2.5, vibe: 'classic' },
  { key: 'yeouido', label: 'Yeouido & the Han River', lat: 37.5263, lng: 126.9245, radiusKm: 2.5, vibe: 'nature' },
];

function inZone(p: Place, z: Zone): boolean {
  return haversineKm({ lat: p.lat, lng: p.lng }, { lat: z.lat, lng: z.lng }) <= z.radiusKm;
}

export type TripDay = {
  dayIndex: number; // 0-based
  label: string; // "Day 1"
  zone: Zone;
  plan: DayPlan;
};

export type TripPlanInput = {
  places: Place[];
  days: number; // 2박3일 → 3
  interests: string[];
  saved: Set<string>;
  reactions: Record<string, 'like' | 'dislike'>;
  rainy?: boolean;
  /** Vibe the user asked for. Day 1 honours it; later days vary around it. */
  vibe?: VibeKey;
  /**
   * Local hour the traveller lands / takes off (24h, e.g. 14 = 2 PM). Optional:
   * without them the trip is shaped by the generic assumption below.
   */
  arriveHour?: number;
  departHour?: number;
  /** How full each day should be. From the natural-language trip intake. */
  pace?: Pace;
  /** "Skip X" tags to down-weight across the whole trip. From the intake. */
  avoid?: string[];
};

// Dead time around a flight, in hours. These are Incheon realities, not
// padding: immigration + baggage runs about an hour, AREX into central Seoul
// another, and international check-in wants you there 3 hours early. Ignoring
// them produces the classic generated-itinerary lie, a 09:00 palace visit on
// a day you land at 08:00.
const ARRIVAL_DEAD_HOURS = 2;
const DEPARTURE_DEAD_HOURS = 4;

/** The hours of the day this day can actually be used for sightseeing. */
export type DayWindow = { startH: number; endH: number };

export function dayWindow(dayIndex: number, days: number, arriveHour?: number, departHour?: number): DayWindow {
  let startH = 0;
  let endH = 24;
  if (dayIndex === 0 && arriveHour != null) startH = arriveHour + ARRIVAL_DEAD_HOURS;
  if (dayIndex === days - 1 && departHour != null) endH = departHour - DEPARTURE_DEAD_HOURS;
  return { startH, endH };
}

const slotHour = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h + (m || 0) / 60;
};

function inWindow(time: string, w: DayWindow): boolean {
  const h = slotHour(time);
  return h >= w.startH && h <= w.endH;
}

/**
 * How many of the day's five slots survive the flight times. This is what
 * decides which day deserves the best zone, spending Gyeongbokgung on the
 * afternoon you land is the mistake this prevents.
 */
export function usableSlots(dayIndex: number, days: number, arriveHour?: number, departHour?: number): number {
  const w = dayWindow(dayIndex, days, arriveHour, departHour);
  return SLOT_TIMES.filter((t) => inWindow(t, w)).length;
}

export type TripPlan = { days: TripDay[]; totalKm: number };

// How well a zone can carry a whole day. S-tier count dominates: a zone with
// three must-sees makes a better day than one with forty decent cafés. The
// smaller terms stop a zone with one landmark and nothing else from winning.
function zoneStrength(places: Place[], z: Zone): number {
  let s = 0;
  let meals = 0;
  for (const p of places) {
    if (!inZone(p, z)) continue;
    const t = tierOf(p);
    if (t === 'S') s += 6;
    else if (t === 'A') s += 0.25;
    if (p.category === 'Cuisine') meals++;
  }
  // A day needs somewhere to eat twice; zones that can't feed you are penalised
  // hard no matter how many landmarks they hold.
  if (meals < 4) s -= 12;
  return s;
}

// Day-1-should-be-the-headline ordering, then variety: once a zone is chosen,
// down-weight zones that share its vibe so three days don't all read the same.
function orderZones(places: Place[], days: number, preferred?: VibeKey): Zone[] {
  const scored = ZONES.map((z) => ({
    z,
    base: zoneStrength(places, z) + (preferred && z.vibe === preferred ? 5 : 0),
  })).sort((a, b) => b.base - a.base);

  const chosen: Zone[] = [];
  const usedVibes = new Set<VibeKey>();
  const pool = [...scored];
  while (chosen.length < days && pool.length) {
    // Prefer the strongest zone whose vibe hasn't been used yet; fall back to
    // the strongest remaining once every vibe is spoken for.
    let idx = pool.findIndex((c) => !usedVibes.has(c.z.vibe));
    if (idx === -1) idx = 0;
    const [picked] = pool.splice(idx, 1);
    chosen.push(picked.z);
    usedVibes.add(picked.z.vibe);
  }
  return chosen;
}

// Trip-position shaping: you land on day 1 and fly out on the last day, so
// those days can't be full 10:00–20:00 runs. Returning null means "full day".
function dayShape(dayIndex: number, days: number): { dropFirst?: boolean; dropLast?: boolean } {
  if (days === 1) return {};
  if (dayIndex === 0) return { dropFirst: true }; // arrival, start at lunch
  if (dayIndex === days - 1) return { dropLast: true }; // departure, no dinner
  return {};
}

/** True when this day's length is known from a real flight time. */
function isTimed(dayIndex: number, days: number, arriveHour?: number, departHour?: number): boolean {
  return (dayIndex === 0 && arriveHour != null) || (dayIndex === days - 1 && departHour != null);
}

/**
 * The slot times to plan this day into.
 *
 * Returning a subset (rather than planning a full day and slicing it) is the
 * whole point: slicing removes whichever landmark happened to sit in a dropped
 * slot, so a 2 PM landing turned the "Palaces & Bukchon" afternoon into a café
 * and a dessert shop with the palace gone. Planning *into* the window lets
 * dayPlan.slotsFor reassign roles so the surviving hours still hold a sight.
 */
function slotTimesFor(dayIndex: number, days: number, arriveHour?: number, departHour?: number): readonly string[] | undefined {
  if (!isTimed(dayIndex, days, arriveHour, departHour)) return undefined;
  const w = dayWindow(dayIndex, days, arriveHour, departHour);
  return SLOT_TIMES.filter((t) => inWindow(t, w));
}

/**
 * Shape a day when we have no flight times: the generic assumption that you
 * land before lunch on day 1 and skip dinner on the last day. Allowed to give
 * up, clipping a day below three stops on a guess is worse than leaving it
 * whole. (With real times there is nothing to shape; the day was planned to
 * fit already.)
 */
function shapeStops(stops: PlannedStop[], dayIndex: number, days: number): PlannedStop[] {
  const shape = dayShape(dayIndex, days);
  let out = stops;
  if (shape.dropFirst) out = out.slice(1);
  if (shape.dropLast) out = out.slice(0, -1);
  return out.length < 3 ? stops : out;
}

const relinkKm = (stops: PlannedStop[]) =>
  stops.reduce((sum, s, idx) => sum + (idx === 0 ? 0 : s.kmFromPrev ?? 0), 0);

export function generateTripPlan(input: TripPlanInput): TripPlan | null {
  const { places, days, interests, saved, reactions, rainy, vibe, arriveHour, departHour, pace, avoid } = input;
  if (days < 1) return null;

  const ranked = orderZones(places, days, vibe);
  if (!ranked.length) return null;

  // Put the strongest zone on the day with the most hours in it. Arrival and
  // departure days are clipped (see dayShape), so handing the best zone to
  // day 1 of a 2박3일 trip would spend your Gyeongbokgung day on the afternoon
  // you land. Rank the day slots by how full they are, then deal zones out
  // best-to-fullest.
  const dayOrder = Array.from({ length: days }, (_, i) => i).sort((a, b) => {
    const diff = usableSlots(b, days, arriveHour, departHour) - usableSlots(a, days, arriveHour, departHour);
    return diff !== 0 ? diff : a - b; // stable: earlier day wins a tie
  });
  const zoneByDay: Zone[] = [];
  dayOrder.forEach((dayIdx, rank) => {
    zoneByDay[dayIdx] = ranked[rank];
  });

  const usedAcrossTrip = new Set<string>();
  const tripDays: TripDay[] = [];

  zoneByDay.forEach((zone, i) => {
    // Restrict the candidate pool to this zone, minus everything already
    // scheduled earlier in the trip, this is what stops day 3 re-recommending
    // day 1's lunch.
    const pool = places.filter((p) => inZone(p, zone) && !usedAcrossTrip.has(p.slug));
    const slotTimes = slotTimesFor(i, days, arriveHour, departHour);

    // A midnight landing leaves no usable hours at all. Emit the day anyway,
    // empty, silently dropping it would show a "3-day trip" with two days in
    // it, which reads as a bug rather than as the truth about the flight.
    if (slotTimes && slotTimes.length === 0) {
      tripDays.push({
        dayIndex: i,
        label: `Day ${i + 1}`,
        zone,
        plan: { stops: [], vibe: zone.vibe, area: null, usedSaved: 0, rainy: !!rainy, totalKm: 0 },
      });
      return;
    }
    const plan = generateDayPlan({
      places: pool,
      interests,
      saved,
      reactions,
      vibe: i === 0 && vibe ? vibe : zone.vibe,
      area: null, // the zone filter already localises it; a gu filter would fight it
      rainy,
      pace,
      avoid,
      slotTimes,
    });
    if (!plan) return;

    const stops = slotTimes ? plan.stops : shapeStops(plan.stops, i, days);
    stops.forEach((s) => usedAcrossTrip.add(s.place.slug));
    const totalKm = relinkKm(stops);

    tripDays.push({
      dayIndex: i,
      label: `Day ${i + 1}`,
      zone,
      plan: { ...plan, stops, totalKm },
    });
  });

  if (!tripDays.length) return null;
  return { days: tripDays, totalKm: tripDays.reduce((s, d) => s + d.plan.totalKm, 0) };
}

/**
 * Rebuild one day in place, keeping every other day untouched.
 *
 * This is the "redo day 2" case. It stays inside the day's own zone, the day
 * is *that neighbourhood*, and moving it elsewhere would break the trip's
 * one-area-per-day shape and could collide with another day. Places already
 * scheduled on other days stay off-limits, and the day's current stops are
 * excluded too so the result is actually different; that exclusion is dropped
 * if the zone is too thin to fill a day without them.
 */
export function regenerateDay(
  trip: TripPlan,
  dayIndex: number,
  places: Place[],
  ctx: {
    interests: string[];
    saved: Set<string>;
    reactions: Record<string, 'like' | 'dislike'>;
    rainy?: boolean;
    vibe?: VibeKey;
    arriveHour?: number;
    departHour?: number;
    pace?: Pace;
    avoid?: string[];
  },
): TripPlan {
  const target = trip.days.find((d) => d.dayIndex === dayIndex);
  if (!target) return trip;

  const usedElsewhere = new Set(
    trip.days.filter((d) => d.dayIndex !== dayIndex).flatMap((d) => d.plan.stops.map((s) => s.place.slug)),
  );
  const current = new Set(target.plan.stops.map((s) => s.place.slug));
  const zonePool = places.filter((p) => inZone(p, target.zone) && !usedElsewhere.has(p.slug));

  const slotTimes = slotTimesFor(dayIndex, trip.days.length, ctx.arriveHour, ctx.departHour);

  const build = (pool: Place[]) => {
    const plan = generateDayPlan({
      places: pool,
      interests: ctx.interests,
      saved: ctx.saved,
      reactions: ctx.reactions,
      vibe: ctx.vibe ?? target.plan.vibe,
      area: null,
      rainy: ctx.rainy,
      pace: ctx.pace,
      avoid: ctx.avoid,
      // A redo must not hand back hours the traveller doesn't have.
      slotTimes,
    });
    if (!plan) return null;
    const stops = slotTimes ? plan.stops : shapeStops(plan.stops, dayIndex, trip.days.length);
    return { ...plan, stops, totalKm: relinkKm(stops) };
  };

  let fresh = zonePool.filter((p) => !current.has(p.slug));
  if (fresh.length < 12) fresh = zonePool; // thin zone, a repeated stop beats no day
  let next = build(fresh);

  // Excluding the day's current stops is what makes the rebuild feel like a
  // rebuild, but those stops are also, by construction, the zone's best
  // places, so a naive redo of the palace day comes back with no palace in it
  // (measured: 3 must-sees → 1). If the rebuild loses every must-see the day
  // had, let the S-tier ones back in and try again. "Redo day 2" means a
  // different day, not a worse one, and you cannot do Myeongdong without
  // Namsan just to look different. The threshold is "lost more than half":
  // trading one of two landmarks for a fresh route is a fair redo; coming back
  // with one of three, or none at all, is a downgrade wearing a new coat.
  const sIn = (stops: { place: Place }[]) => stops.filter((s) => tierOf(s.place) === 'S').length;
  const had = sIn(target.plan.stops);
  if (had > 0 && next && sIn(next.stops) < had / 2) {
    const withAnchors = zonePool.filter((p) => !current.has(p.slug) || tierOf(p) === 'S');
    next = build(withAnchors) ?? next;
  }
  if (!next) return trip;

  const rebuilt = next;
  const days = trip.days.map((d) => (d.dayIndex === dayIndex ? { ...d, plan: rebuilt } : d));
  return { days, totalKm: days.reduce((s, d) => s + d.plan.totalKm, 0) };
}

// What to actually call a day.
//
// The zone label alone lies as soon as the day's defining sight drops out —
// on a rainy trip the "Palaces & Bukchon" day loses Gyeongbokgung (outdoor)
// and comes back as Myeongdong Cathedral plus two restaurants, still wearing
// the palace name. Zones also overlap by design, so a stop can legitimately
// sit in a zone it doesn't represent. Name the day after the marquee place
// actually in it, and keep the zone as context.
export function dayHeadline(day: TripDay): string {
  const marquee = day.plan.stops.find((s) => tierOf(s.place) === 'S');
  return marquee ? marquee.place.name : day.zone.label;
}

// Convert a whole trip into editable itinerary days, labelled by what's really
// in them so a saved trip doesn't read as three indistinguishable "Day" entries.
export function tripToItineraryDays(trip: TripPlan): ItineraryDay[] {
  return trip.days.map((d) => {
    const day = planToItineraryDay(d.plan, d.label, d.zone.label);
    return { ...day, theme: `${VIBES[d.plan.vibe].emoji} ${dayHeadline(d)}` };
  });
}
