// Supabase Edge Function: naver-search
// Proxies the Naver Local Search API (openapi.naver.com/v1/search/local.json)
// so the app can search places beyond TRIP's own ~2,300-place catalog —
// e.g. a specific address or a business that isn't in the curated list.
// The Client ID/Secret stay server-side (same free "Search" app already used
// by scripts/backfill-place-website.ts — do NOT ship these in the app bundle).
//
// Deploy (per project):
//   supabase functions deploy naver-search --no-verify-jwt --project-ref <REF>
//   supabase secrets set NAVER_SEARCH_CLIENT_ID=<id> NAVER_SEARCH_CLIENT_SECRET=<secret> --project-ref <REF>
//
// mapx/mapy from Naver are WGS84 lng/lat scaled by 1e7 (NOT a special
// projection) — confirmed against multiple independent sources; divide by
// 1e7 to get plain decimal degrees.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const CLIENT_ID = Deno.env.get('NAVER_SEARCH_CLIENT_ID') ?? '';
const CLIENT_SECRET = Deno.env.get('NAVER_SEARCH_CLIENT_SECRET') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Content-Type': 'application/json',
};

function stripTags(s: string) {
  return s
    .replace(/<\/?b>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return new Response(JSON.stringify({ error: 'NAVER_SEARCH_CLIENT_ID/SECRET not set' }), { status: 500, headers: CORS });
    }
    const url = new URL(req.url);
    const q = url.searchParams.get('q')?.trim();
    if (!q) return new Response(JSON.stringify({ error: 'missing ?q=' }), { status: 400, headers: CORS });

    const naverUrl = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(q)}&display=5`;
    const res = await fetch(naverUrl, {
      headers: { 'X-Naver-Client-Id': CLIENT_ID, 'X-Naver-Client-Secret': CLIENT_SECRET },
    });
    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Naver Local Search ${res.status}` }), { status: 502, headers: CORS });
    }
    const json = await res.json();
    // deno-lint-ignore no-explicit-any
    const items = (json.items ?? []) as any[];
    const results = items
      .filter((it) => it.mapx && it.mapy)
      .map((it) => ({
        name: stripTags(it.title || ''),
        category: it.category || '',
        address: it.roadAddress || it.address || '',
        lng: Number(it.mapx) / 1e7,
        lat: Number(it.mapy) / 1e7,
      }));
    return new Response(JSON.stringify({ results }), { headers: CORS });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message) }), { status: 502, headers: CORS });
  }
});
