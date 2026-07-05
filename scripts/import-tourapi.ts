// Imports real places from the Korea Tourism Organization's TourAPI 4.0
// (KorService2) into the `places` table, supplementing the hand-curated
// seed places with real name, address, coordinates, photo, and a Korean
// description.
//
// SECONDARY source as of 2026-07 — Visit Seoul (import-visitseoul.ts) is now
// TRIP's primary content source because it's tourist-facing by design and
// gives native English copy. Run this one for extra Seoul coverage or for
// content categories Visit Seoul doesn't cover well; expect Korean-only text
// (see the English section below for why).
//
// One thing that is NOT obvious from trial and error, confirmed against the
// official manual (한국관광공사_개방데이터_활용매뉴얼_v4.4): `detailCommon2`
// takes ONLY `contentId` (+ optional numOfRows/pageNo) — passing
// `contentTypeId`, `defaultYN`, or `overviewYN` (all mentioned in older blog
// posts/TourAPI 3.0-era docs) makes it reject the request with
// INVALID_REQUEST_PARAMETER_ERROR.
//
// English enrichment was attempted and abandoned: EngService2 is a
// SEPARATE, independently-curated catalog with its own contentId space
// (confirmed — an EngService2 contentId returns zero results against
// KorService2's detailCommon2, and vice versa), not a translated mirror of
// the Korean catalog. There's no reliable way to cross-reference the two by
// ID. If English display names/descriptions matter later, the better tool
// is a real translation pass (e.g. Papago) over the Korean data already
// imported here, not TourAPI's English service.
//
// TourAPI does NOT provide foreigner-fit tags or K-content connections —
// those stay empty/false here and are the app's own crowd-sourced/curated
// layer (see README "Real Data Sources").
//
// Get a service key: https://www.data.go.kr → search "한국관광공사" → apply
// for "한국관광공사_국문 관광정보 서비스_GW".
//
// Run with: npm run import:tourapi
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { Place } from '../data/types';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TOURAPI_KEY = process.env.TOURAPI_SERVICE_KEY;
const ROWS_PER_CATEGORY = Number(process.env.TOURAPI_ROWS_PER_CATEGORY || 40);
const DETAIL_CONCURRENCY = 5;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in mobile/.env');
  process.exit(1);
}
if (!TOURAPI_KEY) {
  console.error('Missing TOURAPI_SERVICE_KEY in mobile/.env — see comment at top of this file for how to get one.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const KOR_BASE = 'https://apis.data.go.kr/B551011/KorService2';
const SEOUL_AREA_CODE = 1;

// contentTypeId → a readable category string + a swatch pair for the
// placeholder gradient (used until/unless a photo loads).
const CONTENT_TYPES: { id: number; category: string; swatch: [string, string] }[] = [
  { id: 12, category: 'Attraction', swatch: ['#2f4858', '#5b7a99'] },
  { id: 14, category: 'Culture', swatch: ['#5a1f4a', '#c2569b'] },
  { id: 28, category: 'Activity', swatch: ['#1f4d4a', '#4a9d8e'] },
  { id: 38, category: 'Shopping', swatch: ['#5b6f9c', '#8fb0c0'] },
  { id: 39, category: 'Restaurant', swatch: ['#7a4a2a', '#e0a05a'] },
];

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

function stripHtml(s?: string) {
  return s ? s.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim() : '';
}

async function tourApiGet(path: string, params: Record<string, string | number>) {
  const url = new URL(`${KOR_BASE}/${path}`);
  url.searchParams.set('serviceKey', TOURAPI_KEY!);
  url.searchParams.set('MobileOS', 'ETC');
  url.searchParams.set('MobileApp', 'TRIP');
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

async function fetchSigunguNames(): Promise<Record<string, string>> {
  const items = await tourApiGet('areaCode2', { areaCode: SEOUL_AREA_CODE, numOfRows: 50 });
  return Object.fromEntries(items.map((i: any) => [i.code, i.name]));
}

// detailCommon2 takes ONLY contentId (see file header) — no contentTypeId.
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
  console.log('Fetching Seoul district names…');
  const sigunguNames = await fetchSigunguNames();

  const allRows: Omit<Place, 'votes'>[] = [];

  for (const ct of CONTENT_TYPES) {
    console.log(`\nFetching ${ct.category} (contentTypeId=${ct.id})…`);
    const items = await tourApiGet('areaBasedList2', {
      areaCode: SEOUL_AREA_CODE,
      contentTypeId: ct.id,
      numOfRows: ROWS_PER_CATEGORY,
      pageNo: 1,
      arrange: 'Q', // sort by review/popularity where TourAPI supports it
    });
    console.log(`  found ${items.length}. Fetching descriptions…`);
    const overviews = await mapLimit(items, DETAIL_CONCURRENCY, (item: any) => fetchOverview(item.contentid));

    items.forEach((item: any, i: number) => {
      if (!item.mapx || !item.mapy || !item.title) return;
      const slug = `${slugify(item.title)}-${item.contentid}`;
      allRows.push({
        slug,
        name: item.title,
        nameKo: item.title,
        category: ct.category,
        neighborhood: sigunguNames[item.sigungucode] || 'Seoul',
        city: 'Seoul',
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

  // Upsert in chunks to stay well under any request-size limits.
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
