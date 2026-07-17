// Per-leg travel estimates for the trip planner: given two consecutive stops,
// suggest how to get between them (walk / subway-bus / taxi) and roughly how
// long it takes. Two tiers:
//   1. heuristicLeg — pure math on the coordinates we already have. Always
//      available, no API, no key. Honest "estimate" (straight-line based).
//   2. Seoul transit API (data.go.kr) will later replace the `transit` tier's
//      estimate with a real route (line names, transfers, exact minutes) for
//      Seoul-area legs — see lib/transitSeoul.ts. Everything degrades to the
//      heuristic outside Seoul or if the API is unavailable, so the leg info
//      never disappears.
import { Linking, Platform } from 'react-native';
import { haversineKm } from './routeHealth';

export type TransitMode = 'walk' | 'transit' | 'taxi';

export type Leg = {
  mode: TransitMode;
  minutes: number; // estimated door-to-door minutes
  km: number; // straight-line distance
  detail?: string; // real route detail (Seoul API), e.g. "Line 2 → Line 3 · 1 transfer"
  source: 'estimate' | 'seoul';
};

export const MODE_META: Record<TransitMode, { emoji: string; label: string }> = {
  walk: { emoji: '🚶', label: 'Walk' },
  transit: { emoji: '🚇', label: 'Subway / bus' },
  taxi: { emoji: '🚕', label: 'Taxi' },
};

// Distance thresholds (straight-line km) for the suggested mode. Seoul is
// dense, so anything under ~1km is a pleasant walk; big cross-town hops want a
// taxi. The middle is public-transport territory.
const WALK_MAX_KM = 1.0;
const TRANSIT_MAX_KM = 6.0;

export function heuristicLeg(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): Leg {
  const km = haversineKm(a, b);
  let mode: TransitMode;
  let minutes: number;
  if (km <= WALK_MAX_KM) {
    mode = 'walk';
    // real walking path ~1.3x straight line, ~4.5 km/h
    minutes = ((km * 1.3) / 4.5) * 60;
  } else if (km <= TRANSIT_MAX_KM) {
    mode = 'transit';
    // access + wait overhead + ~25 km/h effective incl. stops/transfers
    minutes = 12 + ((km * 1.25) / 25) * 60;
  } else {
    mode = 'taxi';
    // short hail overhead + ~24 km/h city traffic
    minutes = 5 + ((km * 1.3) / 24) * 60;
  }
  return { mode, minutes: Math.max(1, Math.round(minutes)), km, source: 'estimate' };
}

// "~15 min" / for taxi rounds to nearest 5 to signal it's approximate.
export function formatLegMinutes(leg: Leg): string {
  if (leg.source === 'seoul') return `${Math.round(leg.minutes)} min`;
  const m = leg.minutes;
  const rounded = m >= 20 ? Math.round(m / 5) * 5 : m;
  return `~${rounded} min`;
}

// Total estimated getting-around time for a day (sum of consecutive
// coordinate-bearing hops). Null when no leg is measurable.
export function dayTravelMinutes(stops: { lat?: number; lng?: number }[]): number | null {
  let total = 0;
  let legs = 0;
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1];
    const b = stops[i];
    if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) continue;
    total += heuristicLeg({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng }).minutes;
    legs++;
  }
  return legs ? Math.round(total) : null;
}

// Tap-through to real turn-by-turn: Naver Map app via its documented URL
// scheme (nmap://route/{walk|public|car}, appname required — see
// guide.ncloud-docs.com "지도 앱 연동 URL Scheme"), falling back to the
// Google Maps directions URL (documented Maps URLs API) when the app isn't
// installed or we're on web. No API key involved in either.
const NMAP_PATH: Record<TransitMode, string> = { walk: 'walk', transit: 'public', taxi: 'car' };
const GMAPS_MODE: Record<TransitMode, string> = { walk: 'walking', transit: 'transit', taxi: 'driving' };

export async function openDirections(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  mode: TransitMode,
  fromName: string,
  toName: string,
): Promise<void> {
  const web =
    `https://www.google.com/maps/dir/?api=1&origin=${a.lat},${a.lng}` +
    `&destination=${b.lat},${b.lng}&travelmode=${GMAPS_MODE[mode]}`;
  if (Platform.OS === 'web') {
    Linking.openURL(web);
    return;
  }
  const app =
    `nmap://route/${NMAP_PATH[mode]}?slat=${a.lat}&slng=${a.lng}&sname=${encodeURIComponent(fromName)}` +
    `&dlat=${b.lat}&dlng=${b.lng}&dname=${encodeURIComponent(toName)}&appname=com.trip.korea`;
  try {
    await Linking.openURL(app); // rejects when Naver Map isn't installed
  } catch {
    Linking.openURL(web);
  }
}
