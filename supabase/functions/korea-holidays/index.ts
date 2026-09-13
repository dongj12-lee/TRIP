// Supabase Edge Function: korea-holidays
//
// Returns official Korean public holidays, plus the 24 solar terms (24절기)
// and traditional minor dates (잡절, e.g. 초복/중복/말복), for the Explore
// "upcoming holiday" card + month calendar. Foreign travelers have no built-in
// sense of the Korean holiday calendar, and palaces/markets get packed on days
// like Liberation Day or Chuseok that never show up on their own calendar at
// all; the solar terms/잡절 are lower-stakes cultural flavor (no closures) so
// they're returned separately and shown lighter in the UI.
//
// Source: KASI (한국천문연구원) 특일 정보 (SpcdeInfoService) — same data.go.kr
// account as TourAPI/KMA weather, this dataset just needs its own 활용신청
// (usage application) approved once (auto-approved on data.go.kr). Endpoint
// names verified against a working reference implementation (distbe/holidays
// on GitHub), not guessed — data.go.kr's own docs page was inconsistent about
// which operation ID maps to which category.
//   getRestDeInfo       → 공휴일 (actual day off, isHoliday: Y)
//   get24DivisionsInfo  → 24절기 (solar terms, no day off)
//   getSundryDayInfo    → 잡절 (traditional minor dates, no day off)
//
// Deploy:
//   supabase functions deploy korea-holidays --no-verify-jwt --project-ref <REF>
//   supabase secrets set KASI_SERVICE_KEY=<data.go.kr key> --project-ref <REF>
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const KEY = Deno.env.get('KASI_SERVICE_KEY') ?? '';
const BASE = 'https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Content-Type': 'application/json',
  // Once a year's dates are published they don't change; safe to cache all day.
  'Cache-Control': 'public, max-age=86400',
};

type RawDate = { date: string; name: string };
type Operation = 'getRestDeInfo' | 'get24DivisionsInfo' | 'getSundryDayInfo';

async function fetchYear(year: number, op: Operation): Promise<RawDate[]> {
  const u = new URL(`${BASE}/${op}`);
  u.searchParams.set('serviceKey', KEY);
  u.searchParams.set('solYear', String(year));
  u.searchParams.set('numOfRows', '50');
  u.searchParams.set('_type', 'json');

  const res = await fetch(u);
  const text = await res.text();
  if (!text.trim().startsWith('{')) return []; // bad key / XML error body → fail soft, not crash the card
  // deno-lint-ignore no-explicit-any
  const raw = JSON.parse(text)?.response?.body?.items?.item;
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw]; // a year with a single item comes back as an object, not an array
  return list
    .filter((it) => it && it.locdate && (op !== 'getRestDeInfo' || it.isHoliday === 'Y'))
    .map((it) => ({
      date: `${String(it.locdate).slice(0, 4)}-${String(it.locdate).slice(4, 6)}-${String(it.locdate).slice(6, 8)}`,
      name: String(it.dateName ?? ''),
    }));
}

async function fetchKind(op: Operation, years: number[]): Promise<RawDate[]> {
  const perYear = await Promise.all(years.map((y) => fetchYear(y, op)));
  return perYear.flat();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    if (!KEY) return new Response(JSON.stringify({ error: 'KASI_SERVICE_KEY not set' }), { status: 500, headers: CORS });

    const kstYear = new Date(Date.now() + 9 * 3600 * 1000).getUTCFullYear();
    const years = [kstYear, kstYear + 1];

    const [holidaysRaw, solarTermsRaw, sundryRaw] = await Promise.all([
      fetchKind('getRestDeInfo', years),
      fetchKind('get24DivisionsInfo', years),
      fetchKind('getSundryDayInfo', years),
    ]);

    // 대체공휴일 comes back as a bare "대체공휴일" with no hint which holiday it
    // substitutes; KASI's convention is that it immediately follows the
    // holiday it replaces once sorted by date, so borrow that neighbor's name.
    const holidays = holidaysRaw
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((h, i, arr) => (h.name === '대체공휴일' && i > 0 ? { ...h, name: `${arr[i - 1].name} (대체공휴일)` } : h));
    const notable = [...solarTermsRaw, ...sundryRaw].sort((a, b) => a.date.localeCompare(b.date));

    return new Response(JSON.stringify({ holidays, notable }), { headers: CORS });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message) }), { status: 502, headers: CORS });
  }
});
