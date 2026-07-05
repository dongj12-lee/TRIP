// Lightweight "route intelligence" for the trip planner: turns an itinerary
// into human-readable warnings (too packed? big geographic jumps?) that both
// (a) help the traveler self-correct while planning, and (b) seed the
// structured feedback loop when they share the route.
import { Itinerary, ItineraryDay, ItineraryStop } from '@/data/types';

// Great-circle distance in km between two coordinates.
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const PACKED_STOPS = 5; // stops/day at which a day starts feeling rushed
const LONG_HOP_KM = 8; // a single hop this far reads as "across town" in Seoul

function coords(s: ItineraryStop): { lat: number; lng: number } | null {
  return s.lat != null && s.lng != null ? { lat: s.lat, lng: s.lng } : null;
}

export type DayHealth = {
  index: number;
  label: string;
  stopCount: number;
  totalKm: number; // sum of consecutive hops that have coordinates
  maxHopKm: number;
  packed: boolean;
  longHop: { from: string; to: string; km: number } | null;
};

export type TripHealth = {
  days: DayHealth[];
  totalStops: number;
  dayCount: number;
  // top-line, human phrasing for the summary card
  warnings: string[];
  positives: string[];
};

export function analyzeDay(day: ItineraryDay, index: number): DayHealth {
  const stops = day.stops.filter((s) => s.name.trim());
  let totalKm = 0;
  let maxHopKm = 0;
  let longHop: DayHealth['longHop'] = null;

  for (let i = 1; i < stops.length; i++) {
    const a = coords(stops[i - 1]);
    const b = coords(stops[i]);
    if (!a || !b) continue;
    const km = haversineKm(a, b);
    totalKm += km;
    if (km > maxHopKm) {
      maxHopKm = km;
      if (km >= LONG_HOP_KM) longHop = { from: stops[i - 1].name, to: stops[i].name, km };
    }
  }

  return {
    index,
    label: day.label,
    stopCount: stops.length,
    totalKm,
    maxHopKm,
    packed: stops.length >= PACKED_STOPS,
    longHop,
  };
}

export function analyzeTrip(itinerary: Itinerary): TripHealth {
  const days = itinerary.days.map(analyzeDay);
  const totalStops = days.reduce((s, d) => s + d.stopCount, 0);
  const warnings: string[] = [];
  const positives: string[] = [];

  for (const d of days) {
    if (d.packed) warnings.push(`${d.label} looks packed — ${d.stopCount} stops. Consider trimming one.`);
    if (d.longHop) {
      warnings.push(
        `${d.label} has a long hop: ${d.longHop.from} → ${d.longHop.to} (~${Math.round(d.longHop.km)}km). Group nearby spots or plan transit time.`,
      );
    }
  }

  const emptyDays = days.filter((d) => d.stopCount === 0);
  if (emptyDays.length) positives.push(`${emptyDays.length} day(s) still open — room to add a spot or keep it relaxed.`);
  if (!warnings.length && totalStops > 0) positives.push('Nicely balanced — no packed days or big detours.');

  return { days, totalStops, dayCount: days.length, warnings, positives };
}
