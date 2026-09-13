// Step 1 of the Korean TourAPI expansion: fetch every Seoul place from
// KorService2 (Korean-only text), map categories into the app's real
// vocabulary, dedupe against the existing catalog, and write the survivors
// to a JSON file for a separate translation pass (Claude translates
// name_ko/description directly — no MT API — see project memory) before
// scripts/import-tourapi-kor.ts upserts the final English+Korean rows.
//
// Category mapping verified live against real cat1/cat2 data (not guessed —
// this session has been burned by wrong TourAPI assumptions before):
//   12/A01/A0101,A0102        → Nature
//   12/A02/A0201              → History (Historical Sites)
//   12/A02/A0202              → Culture (Other Cultural Destinations)
//   12/A02/A0203              → Culture (Cultural Districts)
//   12/A02/A0204              → Culture (Cultural Facilities)
//   12/A02/A0205              → Culture (Landmarks)
//   14/A02/A0206              → Culture (Cultural Facilities)
//   28/A03/A0302              → Nature (Natural Sites(Parks))
//   28/A03/A0301,A0303,A0305  → Experience Programs (Other Experiences)
//   38/A04/*                  → Shopping (Specialty Shops & Stores)
//   39/A05/*                  → Cuisine (no L2, matches existing precedent)
//
// Run with: npx tsx scripts/fetch-tourapi-kor.ts
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';
import { haversineKm } from '../lib/routeHealth';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const TOURAPI_KEY = process.env.TOURAPI_SERVICE_KEY!;
const DETAIL_CONCURRENCY = 5;
const DEDUPE_RADIUS_KM = 0.03;
const OUT_PATH = './scratch-tourapi-kor-todo.json';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !TOURAPI_KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / TOURAPI_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const KOR_BASE = 'https://apis.data.go.kr/B551011/KorService2';
const SEOUL_AREA_CODE = 1;
const CONTENT_TYPE_IDS = [12, 14, 28, 38, 39];

type Mapped = { category: string; categoryL2?: string };
const CAT2_MAP: Record<string, Mapped> = {
  A0101: { category: 'Nature' },
  A0102: { category: 'Nature' },
  A0201: { category: 'History', categoryL2: 'Historical Sites' },
  A0202: { category: 'Culture', categoryL2: 'Other Cultural Destinations' },
  A0203: { category: 'Culture', categoryL2: 'Cultural Districts' },
  A0204: { category: 'Culture', categoryL2: 'Cultural Facilities' },
  A0205: { category: 'Culture', categoryL2: 'Landmarks' },
  A0206: { category: 'Culture', categoryL2: 'Cultural Facilities' },
  A0302: { category: 'Nature', categoryL2: 'Natural Sites(Parks)' },
  A0301: { category: 'Experience Programs', categoryL2: 'Other Experiences' },
  A0303: { category: 'Experience Programs', categoryL2: 'Other Experiences' },
  A0305: { category: 'Experience Programs', categoryL2: 'Other Experiences' },
};
const WHOLESALE_MAP: Record<number, Mapped> = {
  38: { category: 'Shopping', categoryL2: 'Specialty Shops & Stores' },
  39: { category: 'Cuisine' },
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);
}
function stripHtml(s?: string) {
  return s ? s.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim() : '';
}

async function tourApiGet(path: string, params: Record<string, string | number>) {
  const url = new URL(`${KOR_BASE}/${path}`);
  url.searchParams.set('serviceKey', TOURAPI_KEY);
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
    throw new Error(`TourAPI did not return JSON for ${path}. Raw:\n${text.slice(0, 400)}`);
  }
  const header = json?.response?.header;
  if (header && header.resultCode !== '0000') throw new Error(`TourAPI error [${header.resultCode}] ${header.resultMsg}`);
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

type ExistingPlace = { nameKo: string; lat: number; lng: number };
async function fetchExistingPlaces(): Promise<ExistingPlace[]> {
  const PAGE = 1000;
  const all: ExistingPlace[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from('places').select('name_ko, lat, lng').range(from, from + PAGE - 1);
    if (error) throw error;
    for (const r of data ?? []) all.push({ nameKo: r.name_ko, lat: r.lat, lng: r.lng });
    if (!data || data.length < PAGE) break;
  }
  return all;
}

export type TodoPlace = {
  slug: string;
  nameKo: string;
  descriptionKo: string;
  category: string;
  categoryL2?: string;
  neighborhood: string;
  city: string;
  address: string;
  lat: number;
  lng: number;
  swatch: [string, string];
  photoUrl?: string;
};

const SWATCH: Record<string, [string, string]> = {
  Nature: ['#1f4d4a', '#4a9d8e'],
  History: ['#2f4858', '#5b7a99'],
  Shopping: ['#5b6f9c', '#8fb0c0'],
  Culture: ['#5a1f4a', '#c2569b'],
  'Experience Programs': ['#6b5220', '#c99a3f'],
  Cuisine: ['#7a4a2a', '#e0a05a'],
};

async function main() {
  console.log('Fetching Seoul district names…');
  const sigunguNames = await fetchSigunguNames();

  console.log('Fetching existing catalog for dedup…');
  const existing = await fetchExistingPlaces();
  const existingByNameKo = new Set(existing.map((e) => e.nameKo));
  console.log(`  ${existing.length} existing places loaded.`);

  const todo: TodoPlace[] = [];
  let fetchedTotal = 0;
  let skippedDupe = 0;
  let skippedUnmapped = 0;

  for (const contentTypeId of CONTENT_TYPE_IDS) {
    console.log(`\nFetching contentTypeId=${contentTypeId}…`);
    const allItems: any[] = [];
    for (let pageNo = 1; ; pageNo++) {
      const items = await tourApiGet('areaBasedList2', {
        areaCode: SEOUL_AREA_CODE,
        contentTypeId,
        numOfRows: 500,
        pageNo,
        arrange: 'Q',
      });
      allItems.push(...items);
      if (items.length < 500) break;
    }
    console.log(`  found ${allItems.length}.`);
    fetchedTotal += allItems.length;

    const inScope = allItems.filter((item: any) => item.mapx && item.mapy && item.title);
    console.log(`  fetching descriptions for ${inScope.length}…`);
    const overviews = await mapLimit(inScope, DETAIL_CONCURRENCY, (item: any) => fetchOverview(item.contentid));

    inScope.forEach((item: any, i: number) => {
      const lat = Number(item.mapy);
      const lng = Number(item.mapx);
      const nameKo = item.title;

      if (existingByNameKo.has(nameKo) || existing.some((e) => haversineKm({ lat, lng }, { lat: e.lat, lng: e.lng }) < DEDUPE_RADIUS_KM)) {
        skippedDupe++;
        return;
      }

      const mapped = contentTypeId === 12 || contentTypeId === 14 || contentTypeId === 28 ? CAT2_MAP[item.cat2] : WHOLESALE_MAP[contentTypeId];
      if (!mapped) {
        skippedUnmapped++;
        return;
      }

      const slug = `${slugify(nameKo)}-${item.contentid}`;
      todo.push({
        slug,
        nameKo,
        descriptionKo: overviews[i] || '',
        category: mapped.category,
        categoryL2: mapped.categoryL2,
        neighborhood: sigunguNames[item.sigungucode] || 'Seoul',
        city: 'Seoul',
        address: [item.addr1, item.addr2].filter(Boolean).join(' '),
        lat,
        lng,
        swatch: SWATCH[mapped.category] ?? ['#3a2c22', '#a36643'],
        photoUrl: (item.firstimage || item.firstimage2 || '').replace(/^http:\/\//, 'https://') || undefined,
      });
      existingByNameKo.add(nameKo);
      existing.push({ nameKo, lat, lng });
    });
  }

  console.log(`\nFetched ${fetchedTotal} total, skipped ${skippedDupe} duplicates, skipped ${skippedUnmapped} unmapped cat2.`);
  console.log(`${todo.length} places need translation.`);
  writeFileSync(OUT_PATH, JSON.stringify(todo, null, 2));
  console.log(`Wrote ${OUT_PATH}`);
}

main().catch((e) => {
  console.error('\nFetch failed:', e.message ?? e);
  process.exit(1);
});
