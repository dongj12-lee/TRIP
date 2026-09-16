// Imports a curated slice of real places for the five cities in the
// city-day-trips theme (Busan, Gyeongju, Jeonju, Gangneung, Chuncheon) from
// the Korea Tourism Organization's TourAPI 4.0, capped small since this feeds
// a handful of highlight cards per city (a places rail on one theme), not a
// competing full catalog for each city.
//
// Reads EngService2, not KorService2. The first version of this script used
// the Korean catalogue and set both `name` and `nameKo` to the same Korean
// title, which is how Korean-named cards ended up in front of an App Store
// reviewer once. This app is for people who cannot read Hangul; a place whose
// name renders as 해운대해수욕장 is no use to them. EngService2 is a separate,
// independently curated catalogue — smaller (327 rows across these five
// cities, against thousands in KorService2) but English-native, and it is the
// same source the Seoul catalogue came from.
//
// Its titles arrive as "English Name (한국어 이름)", which splits cleanly into
// the two columns the app already expects.
//
// Scope is intentionally narrow: the app's Explore tab, day-plan generator,
// and saved-places flows all stay Seoul-only (see lib/remoteData.tsx, which
// filters the shared `places` feed to city === 'Seoul'). These rows are only
// reachable through `placeBySlug` (full catalog, all cities) — i.e. through
// the city-day-trips theme's places block and each place's own detail page.
//
// Area/sigungu codes confirmed live against areaCode2 (2026-08):
//   Busan itself IS a top-level areaCode (6, a metropolitan city, no
//   province to drill into) — its own sigungu are real -gu districts
//   (Haeundae-gu, Jung-gu…), fetched below for the `neighborhood` field.
//   Gyeongju/Jeonju/Gangneung/Chuncheon are cities *within* a province
//   areaCode, selected via sigunguCode; TourAPI has no subdivision below
//   that level for them, so `neighborhood` is just the city name itself
//   (same "whole-city fallback" pattern as 'Seoul', see lib/format.ts).
//
// Run with: npx tsx scripts/import-tourapi-daytrip-cities.ts
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { Place } from '../data/types';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TOURAPI_KEY = process.env.TOURAPI_ENG_SERVICE_KEY;
const ROWS_PER_CATEGORY = Number(process.env.TOURAPI_ROWS_PER_CATEGORY || 15);
const DETAIL_CONCURRENCY = 5;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in mobile/.env');
  process.exit(1);
}
if (!TOURAPI_KEY) {
  console.error('Missing TOURAPI_ENG_SERVICE_KEY in mobile/.env — see scripts/import-tourapi-eng.ts header for how to get one.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const ENG_BASE = 'https://apis.data.go.kr/B551011/EngService2';

const TARGET_CITIES: { city: string; areaCode: number; sigunguCode?: number }[] = [
  { city: 'Busan', areaCode: 6 },
  { city: 'Gyeongju', areaCode: 35, sigunguCode: 2 },
  { city: 'Jeonju', areaCode: 37, sigunguCode: 12 },
  { city: 'Gangneung', areaCode: 32, sigunguCode: 1 },
  { city: 'Chuncheon', areaCode: 32, sigunguCode: 13 },
];

// EngService2 numbers its content types completely differently from
// KorService2 — not 12/14/28/38/39 but 75/76/78/79/82. Passing the Korean
// numbers is not an error, it just matches nothing, so the first run of this
// script against the English catalogue returned 0 rows for every city while
// the same areaCode without a contentTypeId returned hundreds. Verified live
// against areaBasedList2 for Busan (2026-09).
//
// 80 (accommodation) and 85 (festivals) exist too and are deliberately left
// out: this rail is places to go on a day trip, and festivals already have
// their own live rail sourced from festivals-now.
const CONTENT_TYPES: { id: number; category: string; swatch: [string, string] }[] = [
  { id: 76, category: 'Attraction', swatch: ['#2f4858', '#5b7a99'] },
  { id: 78, category: 'Culture', swatch: ['#5a1f4a', '#c2569b'] },
  { id: 75, category: 'Activity', swatch: ['#1f4d4a', '#4a9d8e'] },
  { id: 79, category: 'Shopping', swatch: ['#5b6f9c', '#8fb0c0'] },
  { id: 82, category: 'Restaurant', swatch: ['#7a4a2a', '#e0a05a'] },
];

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

// EngService2 titles look like "Bomun Tourist Complex (경주 보문관광단지)".
// Split on the trailing parenthetical, but only when it contains Hangul —
// some parentheticals are part of the English name ("AREA6 (AREA6)"), and a
// few titles have none at all.
//
// The inner text can itself contain parentheses: "Haedong Yonggungsa Temple
// (해동 용궁사(부산))". Matching the bracket contents as [^()]* rejected those,
// so thirteen rows kept the whole raw title as their English name. Walk back
// from the final ')' to its matching '(' instead.
function splitTitle(raw: string): { name: string; nameKo: string } {
  const t = raw.trim();
  if (!t.endsWith(')')) return { name: t, nameKo: '' };
  let depth = 0;
  let open = -1;
  for (let i = t.length - 1; i >= 0; i--) {
    if (t[i] === ')') depth++;
    else if (t[i] === '(') {
      depth--;
      if (depth === 0) { open = i; break; }
    }
  }
  if (open <= 0) return { name: t, nameKo: '' };
  let en = t.slice(0, open).trim();
  const inner = t.slice(open + 1, -1).trim();
  if (!en || !/[가-힣]/.test(inner)) return { name: t, nameKo: '' };

  // A few source titles have unbalanced brackets — "…Village (Galgol Hangwa)
  // (강릉 모래내한과마을(갈골한과))" is missing a closing one, so walking back
  // from the last ')' stops at the wrong '(' and leaves Hangul in the English
  // half. Parsing cannot recover a title the source got wrong, so cut at the
  // first Hangul character and keep what precedes it.
  const firstHangul = en.search(/[가-힣]/);
  if (firstHangul >= 0) {
    en = en.slice(0, firstHangul).replace(/[\s(\-–—,·]+$/, '').trim();
  }
  if (!en || !/[A-Za-z]/.test(en)) return { name: t, nameKo: inner };
  return { name: en, nameKo: inner };
}

// TourAPI returns HTML-escaped text in titles and overviews (&amp;, &#39;…).
// A previous import shipped those raw into production and needed a separate
// fix-up script; decode at the source instead.
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}

function stripHtml(s?: string) {
  return s ? decodeEntities(s.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')).trim() : '';
}

async function tourApiGet(path: string, params: Record<string, string | number>) {
  const url = new URL(`${ENG_BASE}/${path}`);
  url.searchParams.set('serviceKey', TOURAPI_KEY!);
  url.searchParams.set('MobileOS', 'ETC');
  url.searchParams.set('MobileApp', 'BADA');
  url.searchParams.set('_type', 'json');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  const res = await fetch(url.toString());
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`TourAPI did not return JSON for ${path} (likely a bad service key or quota limit). Raw response:\n${text.slice(0, 500)}`);
  }
  const header = json?.response?.header;
  if (header && header.resultCode !== '0000') {
    throw new Error(`TourAPI error [${header.resultCode}] ${header.resultMsg} (path: ${path})`);
  }
  const items = json?.response?.body?.items?.item;
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
}

async function fetchBusanGuNames(): Promise<Record<string, string>> {
  const items = await tourApiGet('areaCode2', { areaCode: 6, numOfRows: 50 });
  return Object.fromEntries(items.map((i: any) => [i.code, i.name]));
}

// detailCommon2 takes ONLY contentId — no contentTypeId (confirmed against
// the official manual, see scripts/import-tourapi.ts header for the story).
async function fetchOverview(contentId: string): Promise<string> {
  try {
    const items = await tourApiGet('detailCommon2', { contentId, numOfRows: 1, pageNo: 1 });
    return stripHtml(items[0]?.overview);
  } catch {
    return '';
  }
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function main() {
  console.log('Fetching Busan district names…');
  const busanGuNames = await fetchBusanGuNames();

  const allRows: Omit<Place, 'votes'>[] = [];

  for (const target of TARGET_CITIES) {
    for (const ct of CONTENT_TYPES) {
      console.log(`\nFetching ${target.city} · ${ct.category} (contentTypeId=${ct.id})…`);
      const items = await tourApiGet('areaBasedList2', {
        areaCode: target.areaCode,
        ...(target.sigunguCode ? { sigunguCode: target.sigunguCode } : {}),
        contentTypeId: ct.id,
        numOfRows: ROWS_PER_CATEGORY,
        pageNo: 1,
        arrange: 'Q', // sort by review/popularity where TourAPI supports it
      });
      console.log(`  found ${items.length}. Fetching descriptions…`);
      const overviews = await mapLimit(items, DETAIL_CONCURRENCY, (item: any) => fetchOverview(item.contentid));

      items.forEach((item: any, i: number) => {
        if (!item.mapx || !item.mapy || !item.title) return;
        const { name, nameKo } = splitTitle(decodeEntities(String(item.title)));
        // No Latin letters means the English catalogue carried a Korean-only
        // entry. Skip it rather than ship a name our readers cannot read —
        // that is the whole reason this script moved off KorService2.
        if (!/[A-Za-z]/.test(name)) return;
        const slug = `${slugify(name)}-${item.contentid}`;
        allRows.push({
          slug,
          name,
          nameKo,
          category: ct.category,
          neighborhood: target.city === 'Busan' ? busanGuNames[item.sigungucode] || 'Busan' : target.city,
          city: target.city,
          address: [item.addr1, item.addr2].filter(Boolean).join(' '),
          hours: '',
          priceRange: '',
          description: overviews[i] || '',
          lat: Number(item.mapy),
          lng: Number(item.mapx),
          swatch: ct.swatch,
          soloOk: false,
          englishMenu: false,
          priceTransparent: false,
          cardOk: false,
          englishSpoken: false,
          photoUrl: item.firstimage || item.firstimage2 || undefined,
        } as Omit<Place, 'votes'>);
      });
    }
  }

  console.log(`\nUpserting ${allRows.length} places into Supabase…`);
  const dbRows = allRows.map((p) => ({
    slug: p.slug,
    name: p.name,
    name_ko: p.nameKo,
    category: p.category,
    neighborhood: p.neighborhood,
    city: p.city,
    address: p.address,
    hours: p.hours,
    price_range: p.priceRange,
    description: p.description,
    lat: p.lat,
    lng: p.lng,
    swatch: p.swatch,
    solo_ok: false,
    english_menu: false,
    price_transparent: false,
    card_ok: false,
    english_spoken: false,
    votes: {},
    photo_url: p.photoUrl ?? null,
  }));

  const CHUNK = 100;
  for (let i = 0; i < dbRows.length; i += CHUNK) {
    const chunk = dbRows.slice(i, i + CHUNK);
    const { error } = await supabase.from('places').upsert(chunk, { onConflict: 'slug' });
    if (error) throw error;
    console.log(`  ✓ ${Math.min(i + CHUNK, dbRows.length)}/${dbRows.length}`);
  }

  console.log('\nDone. These places have no foreigner-fit tags or K-content connections yet —');
  console.log('that curation layer is intentionally left for real traveler votes / manual editing.');
}

main().catch((e) => {
  console.error('\nImport failed:', e.message ?? e);
  process.exit(1);
});
