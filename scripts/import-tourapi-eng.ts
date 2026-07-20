// Imports real places from the Korea Tourism Organization's TourAPI 4.0
// ENGLISH service (EngService2) into the `places` table — English-native
// content, no translation needed (unlike KorService2, see import-tourapi.ts).
//
// EngService2 is a SEPARATE, independently-curated catalog from KorService2
// with its OWN contentTypeId scheme (75/76/78/79/80/82/85 — NOT the Korean
// service's 12/14/28/38/39). Confirmed live against the real API, not guessed:
//   75 Leports/outdoor (27 in Seoul)     — imported
//   76 mixed (424)                       — imported, MINUS cat2==='A0202'
//   78 Culture/museums (124)             — imported
//   79 Shopping/beauty (44)              — imported
//   80 Accommodation/hotels (42)         — EXCLUDED (Visit Seoul excludes this too)
//   82 Cuisine (69)                      — imported
//   85 Festivals/Events/Performances(39) — EXCLUDED (Visit Seoul excludes this too)
//
// contentTypeId 76 is NOT uniformly medical tourism — grouping the live data
// by its own `cat2` field shows exactly 268/424 (63%) are cat2==='A0202'
// (clinics/hospitals/plastic surgery, confirmed by sampling titles), while
// the other 156 span A0101/A0102/A0201/A0203/A0204/A0205/A0206/A0301 and are
// all legitimate tourism content. Filtering on this structural taxonomy field
// is far more reliable than keyword-matching title text.
//
// Category/categoryL2 values are mapped to the vocabulary the LIVE catalog
// actually uses today (Visit Seoul's: Cuisine/Culture/Shopping/Nature/
// History/Experience Programs + categoryL2 like "Traditional Markets",
// "Landmarks", "Cafes & Tea Shops"...) — confirmed by querying the DB
// directly. The OLD KorService2 importer's categories (Attraction/Activity/
// Restaurant) predate the Visit Seoul pivot and are invisible to
// lib/dayPlan.ts's category-based scoring if reused; do not copy them.
//
// Run with: npm run import:tourapi-eng
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { Place } from '../data/types';
import { haversineKm } from '../lib/routeHealth';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TOURAPI_ENG_KEY = process.env.TOURAPI_ENG_SERVICE_KEY;
const DETAIL_CONCURRENCY = 5;
const DEDUPE_RADIUS_KM = 0.03; // ~30m

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in mobile/.env');
  process.exit(1);
}
if (!TOURAPI_ENG_KEY) {
  console.error('Missing TOURAPI_ENG_SERVICE_KEY in mobile/.env — see .env.example.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const ENG_BASE = 'https://apis.data.go.kr/B551011/EngService2';
const SEOUL_AREA_CODE = 1;

const CONTENT_TYPE_IDS = [75, 76, 78, 79, 82];

// category → swatch pair (same convention as import-tourapi.ts's CONTENT_TYPES,
// just keyed by the real app category names instead of TourAPI's own labels).
const SWATCH: Record<string, [string, string]> = {
  Nature: ['#1f4d4a', '#4a9d8e'],
  History: ['#2f4858', '#5b7a99'],
  Shopping: ['#5b6f9c', '#8fb0c0'],
  Culture: ['#5a1f4a', '#c2569b'],
  'Experience Programs': ['#6b5220', '#c99a3f'],
  Cuisine: ['#7a4a2a', '#e0a05a'],
};

// cat2 → { category, categoryL2 }, per the mapping table worked out against
// live sampled data (see plan). contentTypeId 78/79/82 map wholesale (no
// cat2-level split needed — each is internally homogeneous, confirmed live).
const CAT2_MAP: Record<string, { category: string; categoryL2?: string }> = {
  // contentTypeId 75
  A0302: { category: 'Nature', categoryL2: 'Natural Sites(Parks)' },
  A0303: { category: 'Experience Programs', categoryL2: 'Other Experiences' },
  A0305: { category: 'Experience Programs', categoryL2: 'Other Experiences' },
  // A0301 and A0203 also appear under 75 (leisure club / activewear-ish) —
  // handled by the 76 entries below since the key space is shared; same intent.
  // contentTypeId 76
  A0101: { category: 'Nature', categoryL2: 'Natural Sites(Mountains)' },
  A0102: { category: 'History', categoryL2: 'Historical Sites' },
  A0201: { category: 'History', categoryL2: 'Historical Sites' },
  A0203: { category: 'Shopping', categoryL2: 'Specialty Shops & Stores' },
  A0204: { category: 'Culture', categoryL2: 'Cultural Facilities' },
  A0205: { category: 'Culture', categoryL2: 'Landmarks' },
  A0206: { category: 'Culture', categoryL2: 'Cultural Facilities' },
  A0301: { category: 'Experience Programs', categoryL2: 'Other Experiences' },
};
const WHOLESALE_MAP: Record<number, { category: string; categoryL2?: string }> = {
  78: { category: 'Culture', categoryL2: 'Cultural Facilities' },
  79: { category: 'Shopping', categoryL2: 'Specialty Shops & Stores' },
  82: { category: 'Cuisine' }, // no L2 — matches the existing "Cuisine > (none)" precedent
};

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

// TourAPI English titles are "English Name (한글명)", sometimes with nested
// parens ("Grand Walkerhill Riverpark (Outdoor swimming pool) (그랜드
// 워커힐...(야외수영장))") — a naive lastIndexOf('(') would grab the nested
// paren instead of the outer group. Scan from the end tracking depth to find
// the OUTERMOST trailing paren group instead.
function splitTitle(title: string): { name: string; nameKo: string } {
  if (!title.endsWith(')')) return { name: title, nameKo: title };
  let depth = 0;
  for (let i = title.length - 1; i >= 0; i--) {
    if (title[i] === ')') depth++;
    else if (title[i] === '(') {
      depth--;
      if (depth === 0) {
        const name = title.slice(0, i).trim();
        const nameKo = title.slice(i + 1, -1).trim();
        return name && nameKo ? { name, nameKo } : { name: title, nameKo: title };
      }
    }
  }
  return { name: title, nameKo: title };
}

async function tourApiGet(path: string, params: Record<string, string | number>) {
  const url = new URL(`${ENG_BASE}/${path}`);
  url.searchParams.set('serviceKey', TOURAPI_ENG_KEY!);
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
    throw new Error(`TourAPI EngService2 did not return JSON for ${path}. Raw response:\n${text.slice(0, 500)}`);
  }
  const header = json?.response?.header;
  if (header && header.resultCode !== '0000') {
    throw new Error(`TourAPI EngService2 error [${header.resultCode}] ${header.resultMsg} (path: ${path})`);
  }
  const items = json?.response?.body?.items?.item;
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
}

async function fetchSigunguNames(): Promise<Record<string, string>> {
  const items = await tourApiGet('areaCode2', { areaCode: SEOUL_AREA_CODE, numOfRows: 50 });
  return Object.fromEntries(items.map((i: any) => [i.code, i.name]));
}

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

type ExistingPlace = { slug: string; nameKo: string; lat: number; lng: number };

async function fetchExistingPlaces(): Promise<ExistingPlace[]> {
  const PAGE = 1000;
  const all: ExistingPlace[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from('places').select('slug, name_ko, lat, lng').range(from, from + PAGE - 1);
    if (error) throw error;
    for (const r of data ?? []) all.push({ slug: r.slug, nameKo: r.name_ko, lat: r.lat, lng: r.lng });
    if (!data || data.length < PAGE) break;
  }
  return all;
}

// A candidate whose slug matches an existing row is literally the same place
// re-fetched (e.g. re-running to backfill a field) — exclude just that one
// row from the comparison set, not a duplicate-of-something-else check.
// Every other existing row (any source) still counts normally, so this
// doesn't weaken catalog-wide dedup — makes the script safely re-runnable.
function isDuplicate(slug: string, nameKo: string, lat: number, lng: number, existing: ExistingPlace[]): boolean {
  const others = existing.filter((e) => e.slug !== slug);
  if (others.some((e) => e.nameKo === nameKo)) return true;
  return others.some((e) => haversineKm({ lat, lng }, { lat: e.lat, lng: e.lng }) < DEDUPE_RADIUS_KM);
}

async function main() {
  console.log('Fetching Seoul district names…');
  const sigunguNames = await fetchSigunguNames();

  console.log('Fetching existing catalog for dedup…');
  const existing = await fetchExistingPlaces();
  console.log(`  ${existing.length} existing places loaded.`);

  const allRows: Omit<Place, 'votes'>[] = [];
  let fetchedTotal = 0;
  let filteredMedical = 0;
  let skippedDupe = 0;

  for (const contentTypeId of CONTENT_TYPE_IDS) {
    console.log(`\nFetching contentTypeId=${contentTypeId}…`);
    const items = await tourApiGet('areaBasedList2', {
      areaCode: SEOUL_AREA_CODE,
      contentTypeId,
      numOfRows: 500,
      pageNo: 1,
      arrange: 'Q',
    });
    console.log(`  found ${items.length}.`);
    fetchedTotal += items.length;

    const inScope = items.filter((item: any) => {
      if (!item.mapx || !item.mapy || !item.title) return false;
      if (contentTypeId === 76 && item.cat2 === 'A0202') {
        filteredMedical++;
        return false;
      }
      return true;
    });

    console.log(`  fetching descriptions for ${inScope.length}…`);
    const overviews = await mapLimit(inScope, DETAIL_CONCURRENCY, (item: any) => fetchOverview(item.contentid));

    inScope.forEach((item: any, i: number) => {
      const { name, nameKo } = splitTitle(item.title);
      const lat = Number(item.mapy);
      const lng = Number(item.mapx);
      const slug = `${slugify(name)}-${item.contentid}`;

      if (isDuplicate(slug, nameKo, lat, lng, existing)) {
        skippedDupe++;
        return;
      }

      const mapped = contentTypeId === 76 ? CAT2_MAP[item.cat2] : WHOLESALE_MAP[contentTypeId];
      if (!mapped) return; // unmapped cat2 under 76 — skip rather than guess

      allRows.push({
        slug,
        name,
        nameKo,
        category: mapped.category,
        categoryL2: mapped.categoryL2 ?? null,
        neighborhood: sigunguNames[item.sigungucode] || 'Seoul',
        city: 'Seoul',
        address: [item.addr1, item.addr2].filter(Boolean).join(' '),
        hours: '',
        priceRange: '',
        description: overviews[i] || '',
        lat,
        lng,
        swatch: SWATCH[mapped.category] ?? ['#3a2c22', '#a36643'],
        soloOk: false,
        englishMenu: false,
        priceTransparent: false,
        cardOk: false,
        englishSpoken: false,
        photoUrl: item.firstimage || item.firstimage2 || undefined,
      } as unknown as Omit<Place, 'votes'>);

      // Keep dedup effective within this same run too (two rows across
      // different contentTypeIds could otherwise collide with each other).
      existing.push({ slug, nameKo, lat, lng });
    });
  }

  console.log(`\nFetched ${fetchedTotal} total, excluded ${filteredMedical} medical-tourism (cat2 A0202), skipped ${skippedDupe} as duplicates of the existing catalog.`);
  console.log(`Upserting ${allRows.length} new places into Supabase…`);

  const dbRows = allRows.map((p: any) => ({
    slug: p.slug,
    name: p.name,
    name_ko: p.nameKo,
    category: p.category,
    category_l2: p.categoryL2 ?? null,
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
    source: 'tourapi_eng',
  }));

  const CHUNK = 100;
  for (let i = 0; i < dbRows.length; i += CHUNK) {
    const chunk = dbRows.slice(i, i + CHUNK);
    const { error } = await supabase.from('places').upsert(chunk, { onConflict: 'slug' });
    if (error) throw error;
    console.log(`  ✓ ${Math.min(i + CHUNK, dbRows.length)}/${dbRows.length}`);
  }

  console.log('\nDone.');
}

main().catch((e) => {
  console.error('\nImport failed:', e.message ?? e);
  process.exit(1);
});
