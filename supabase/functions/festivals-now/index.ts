// Supabase Edge Function: festivals-now
//
// Returns the festivals actually running in Korea today, for the live "On now"
// section of the Festivals theme. The rest of that card is an evergreen
// by-province cheat sheet baked into the app; this is the one part that has to
// be current, so it can't be static seed data — a festival that ended
// yesterday must not still show as "on now".
//
// Source: Korea Tourism Organization's English festival service
// (EngService2/searchFestival2). The raw feed is full of year-round tourist
// programmes (palace-guard ceremonies, weekly gugak shows) that aren't
// festivals, so we filter to bounded, currently-running events with an image.
//
// The TourAPI key stays server-side (same reason naver-search does). Deploy:
//   supabase functions deploy festivals-now --no-verify-jwt --project-ref <REF>
//   supabase secrets set TOURAPI_ENG_SERVICE_KEY=<key> --project-ref <REF>
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const KEY = Deno.env.get('TOURAPI_ENG_SERVICE_KEY') ?? '';
const BASE = 'https://apis.data.go.kr/B551011/EngService2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Content-Type': 'application/json',
  // Festivals change day-to-day at most; let the CDN/clients cache for 6h.
  'Cache-Control': 'public, max-age=21600',
};

const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');
const parse = (s: string) => new Date(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8));
const days = (a: string, b: string) => (parse(b).getTime() - parse(a).getTime()) / 864e5;
const fmt = (s: string) => `${s.slice(4, 6)}/${s.slice(6, 8)}`;

// Standing programmes that the feed lists as "festivals" but a traveller would
// never plan around.
const NOISE = /Saturday|Weekly|\bShow\b|Parade|Guard|Changing|Ceremony|Performance|Docent|정기|상설/i;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    if (!KEY) return new Response(JSON.stringify({ error: 'TOURAPI_ENG_SERVICE_KEY not set' }), { status: 500, headers: CORS });

    const today = ymd(new Date());
    // Catch festivals that began up to ~70 days ago and are still running.
    const since = ymd(new Date(Date.now() - 70 * 864e5));

    const u = new URL(`${BASE}/searchFestival2`);
    u.searchParams.set('serviceKey', KEY);
    u.searchParams.set('MobileOS', 'ETC');
    u.searchParams.set('MobileApp', 'BADA');
    u.searchParams.set('_type', 'json');
    u.searchParams.set('eventStartDate', since);
    u.searchParams.set('numOfRows', '800');
    u.searchParams.set('arrange', 'A');

    const res = await fetch(u);
    if (!res.ok) return new Response(JSON.stringify({ error: `TourAPI ${res.status}` }), { status: 502, headers: CORS });
    const text = await res.text();
    if (!text.trim().startsWith('{')) return new Response(JSON.stringify({ error: 'TourAPI non-JSON' }), { status: 502, headers: CORS });

    // deno-lint-ignore no-explicit-any
    const raw = (JSON.parse(text).response?.body?.items?.item ?? []) as any[];
    const running = raw
      .filter((it) => it.eventstartdate && it.eventenddate)
      .filter((it) => it.eventstartdate <= today && today <= it.eventenddate) // on right now
      .filter((it) => days(it.eventstartdate, it.eventenddate) <= 45) // a bounded event, not a year-round programme
      .filter((it) => !NOISE.test(it.title ?? ''))
      .filter((it) => it.firstimage) // a card needs a picture
      .sort((a, b) => a.eventenddate.localeCompare(b.eventenddate)) // ending soonest first
      .slice(0, 12)
      .map((it) => ({
        title: String(it.title ?? '').replace(/\s*\([^)]*\)\s*$/, '').trim(), // drop the trailing (한글) echo
        titleKo: (String(it.title ?? '').match(/\(([^)]+)\)\s*$/)?.[1] ?? '').trim(),
        start: fmt(it.eventstartdate),
        end: fmt(it.eventenddate),
        endsSoon: days(today, it.eventenddate) <= 3,
        where: String(it.addr1 ?? '').split(',').pop()?.trim() || String(it.addr1 ?? '').trim(),
        image: String(it.firstimage).replace(/^http:\/\//, 'https://'),
      }));

    return new Response(JSON.stringify({ festivals: running }), { headers: CORS });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message) }), { status: 502, headers: CORS });
  }
});
