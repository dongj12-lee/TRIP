// Seoul transit enhancement layer. When enabled, upgrades a `transit`-mode
// leg's rough heuristic estimate to a real route (line names, transfer count,
// exact minutes) from the Seoul 대중교통환승경로 API (data.go.kr), proxied by
// the `seoul-transit` Supabase Edge Function so the data.go.kr key stays
// server-side. Everything here degrades to null → the caller keeps the
// heuristic leg, so route info never disappears (outside Seoul, on error, or
// before the backend is deployed). See docs/OPERATIONS.md.
import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { Leg } from './transit';

// Flip on (set EXPO_PUBLIC_SEOUL_TRANSIT_ENABLED=1) once the seoul-transit
// Edge Function is deployed and the data.go.kr API is activated. Until then
// the hook is a no-op and legs stay on the heuristic estimate.
const ENABLED = process.env.EXPO_PUBLIC_SEOUL_TRANSIT_ENABLED === '1';

// Rough Seoul metro bounding box — the API only covers the Seoul area, so
// don't even try for a Busan/Jeju leg (it would just fall back anyway).
function inSeoul(p: { lat: number; lng: number }): boolean {
  return p.lat >= 37.41 && p.lat <= 37.71 && p.lng >= 126.76 && p.lng <= 127.19;
}

const cache = new Map<string, Leg | null>();
const key = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) =>
  `${a.lat.toFixed(4)},${a.lng.toFixed(4)}->${b.lat.toFixed(4)},${b.lng.toFixed(4)}`;

async function fetchSeoulLeg(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): Promise<Leg | null> {
  const k = key(a, b);
  if (cache.has(k)) return cache.get(k)!;
  try {
    const { data, error } = await supabase.functions.invoke('seoul-transit', {
      body: { sx: a.lng, sy: a.lat, ex: b.lng, ey: b.lat },
    });
    if (error || !data || typeof data.minutes !== 'number') {
      cache.set(k, null);
      return null;
    }
    const leg: Leg = {
      mode: 'transit',
      minutes: data.minutes,
      km: data.km ?? 0,
      detail: data.detail, // e.g. "Line 2 → Line 3 · 1 transfer"
      source: 'seoul',
    };
    cache.set(k, leg);
    return leg;
  } catch {
    cache.set(k, null);
    return null;
  }
}

// Returns a real Seoul transit leg for an A→B pair, or null to keep the
// caller's heuristic. Only fires for in-Seoul pairs when enabled.
export function useSeoulLeg(
  a: { lat: number; lng: number } | null,
  b: { lat: number; lng: number } | null,
  wantTransit: boolean,
): Leg | null {
  const [leg, setLeg] = useState<Leg | null>(null);
  useEffect(() => {
    if (!ENABLED || !wantTransit || !a || !b || !inSeoul(a) || !inSeoul(b)) {
      setLeg(null);
      return;
    }
    let alive = true;
    fetchSeoulLeg(a, b).then((r) => alive && setLeg(r));
    return () => {
      alive = false;
    };
  }, [a?.lat, a?.lng, b?.lat, b?.lng, wantTransit]);
  return leg;
}
