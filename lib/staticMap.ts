// Builds a URL to the `static-map` Supabase Edge Function, which proxies
// NAVER Cloud Platform's Static Map API (Secret Key stays server-side, see
// supabase/functions/static-map/index.ts). Synchronous: just a URL string
// for an <Image>, no fetch needed here.
// The proxy needs an NCP Static Map Secret Key, which isn't provisioned yet, so
// the function isn't deployed. Route cards fall back to their text preview
// (see components/cards.tsx), but without this flag every card would still fire
// a request that can only 404. Set EXPO_PUBLIC_STATIC_MAP=1 once the function is
// live to turn the map images back on.
const ENABLED = process.env.EXPO_PUBLIC_STATIC_MAP === '1';

export function staticRouteMapUrl(points: { lat: number; lng: number }[], opts?: { w?: number; h?: number }): string | null {
  if (!ENABLED) return null;
  if (points.length < 2) return null;
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const pts = points
    .slice(0, 20)
    .map((p) => `${p.lng},${p.lat}`)
    .join('|');
  const w = opts?.w ?? 700;
  const h = opts?.h ?? 300;
  return `${base}/functions/v1/static-map?pts=${encodeURIComponent(pts)}&w=${w}&h=${h}`;
}
