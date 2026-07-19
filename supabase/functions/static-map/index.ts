// Supabase Edge Function: static-map
// Proxies NAVER Cloud Platform's Static Map API so Feed route-preview cards
// can show a real map image with numbered pins, instead of a custom SVG
// abstraction — the Secret Key stays server-side (same reasoning as
// naver-search: do NOT ship it in the app bundle).
//
// Deploy (per project):
//   supabase functions deploy static-map --no-verify-jwt --project-ref <REF>
//   supabase secrets set NAVER_MAP_CLIENT_ID=<id> NAVER_MAP_CLIENT_SECRET=<secret> --project-ref <REF>
//
// The Client ID/Secret come from the SAME NCP "Maps" Application that issued
// EXPO_PUBLIC_NAVER_MAP_CLIENT_ID (used by the dynamic WebView map) — NCP
// Console → AI·NAVER API → Application → that Maps app → Secret Key field.
// This is a genuinely different auth style (ID-KEY headers) from the JS SDK's
// client-id-only/domain-whitelist auth, so the Secret Key has to be fetched
// separately even though the Client ID is the same value.
//
// NCP's Static Map API has no polyline/path parameter — pins only (confirmed
// against the official docs, not guessed). Route order is conveyed via
// numbered markers instead of a connecting line.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const CLIENT_ID = Deno.env.get('NAVER_MAP_CLIENT_ID') ?? '';
const CLIENT_SECRET = Deno.env.get('NAVER_MAP_CLIENT_SECRET') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
};

const MARKER_COLOR = '0xA36643'; // theme terra accent

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return new Response(JSON.stringify({ error: 'NAVER_MAP_CLIENT_ID/SECRET not set' }), {
        status: 500,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
    const url = new URL(req.url);
    const ptsParam = url.searchParams.get('pts');
    if (!ptsParam) {
      return new Response(JSON.stringify({ error: 'missing ?pts=lng,lat|lng,lat...' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
    const w = Math.min(Number(url.searchParams.get('w')) || 700, 1024);
    const h = Math.min(Number(url.searchParams.get('h')) || 300, 1024);

    // Cap point count — URL length / visual clutter safety, same reasoning
    // as capping stops shown elsewhere in the app.
    const points = ptsParam
      .split('|')
      .slice(0, 20)
      .map((pair) => {
        const [lng, lat] = pair.split(',');
        return { lng: lng?.trim(), lat: lat?.trim() };
      })
      .filter((p) => p.lng && p.lat);
    if (points.length < 2) {
      return new Response(JSON.stringify({ error: 'need at least 2 points' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const markers = points
      .map((p, i) => `markers=type:n|size:mid|color:${MARKER_COLOR}|pos:${p.lng}%20${p.lat}|label:${i + 1}`)
      .join('&');
    const ncpUrl = `https://naveropenapi.apigw.ntruss.com/map-static/v2/raster?w=${w}&h=${h}&format=jpg&${markers}`;

    const res = await fetch(ncpUrl, {
      headers: { 'x-ncp-apigw-api-key-id': CLIENT_ID, 'x-ncp-apigw-api-key': CLIENT_SECRET },
    });
    if (!res.ok) {
      return new Response(JSON.stringify({ error: `NCP Static Map ${res.status}` }), {
        status: 502,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Same markers always produce the same image — cache aggressively so a
    // post's route thumbnail doesn't re-bill the paid API on every render.
    return new Response(res.body, {
      headers: {
        ...CORS,
        'Content-Type': res.headers.get('content-type') ?? 'image/jpeg',
        'Cache-Control': 'public, max-age=604800, immutable',
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message) }), {
      status: 502,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
