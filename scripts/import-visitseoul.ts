// Imports Seoul places from the Visit Seoul API (api-call.visitseoul.net, run by
// the Seoul Tourism Organization) into the `places` table — in ENGLISH. This is
// TRIP's PRIMARY content source: Visit Seoul is tourist-facing by design, its
// English copy is native (not machine-translated), it carries real coordinates,
// photos, hours and admission info, and it cross-links the same content across 7
// languages (`multi_lang_list`) so we get the English name/description for
// display AND the authentic Korean title for the "show to staff" card from one
// source. (This solves the dead end that killed TourAPI English enrichment —
// see import-tourapi.ts: TourAPI's KO and EN catalogs had non-overlapping IDs.)
// Same mechanism now also fetches `address_ko` — a second contents/info call
// on the item's KO-locale cid, genuine Hangul (not romanized; NCP's Reverse
// Geocoding was considered for this but its documented example response is
// romanized with no lang param, so this proven in-house path was used
// instead) — for the phrase sheet's "show this address" toggle. This roughly
// doubles the detail-fetch phase's API call count (one extra call per item
// with a koCid), so the weekly full re-import runs longer.
//
// API shape (confirmed live against the OpenAPI spec at
// https://api-call.visitseoul.net/api/v1/docs/json):
//   GET  /api/v1/category/list       → CategoryVO[] { com_ctgry_sn, ctgry_path, ctgry_level }
//        (3 levels: L1 e.g. "Culture", L2 "Culture > Parks", L3 "Cuisine >
//        Foreign Restaurant > Chinese" — 61 codes total across 8 L1 groups)
//   POST /api/v1/contents/list  body { com_ctgry_sn?, lang_code_id?, keyword?, sort_type?, page_no? }
//        → { result_code, data: ContentsListVO[], paging: { page_no, page_size:50, total_count } }
//   POST /api/v1/contents/info  body { cid }   (coordinates + full detail live here, NOT in list)
//        → data: { post_sj, sumry, post_desc(html), tag[], relate_img[], main_img,
//                  traffic { new_adres, map_position_x(lng), map_position_y(lat), subway_info },
//                  extra { cmmn_use_time, cmmn_telno, cmmn_hmpg_url, cmmn_hmpg_lang,
//                          trrsrt_use_chrge(F/C/N), usage_fee, closed_days, disabled_facility } }
//   headers: VISITSEOUL-API-KEY: <key>, Content-Type: application/json;charset=UTF-8
//
// SCOPE: imports the full catalog EXCEPT two groups that don't fit a static
// "place" model and were explicitly deferred:
//   - Accommodations (hotels/hostels) — booking content, not a sightseeing spot.
//   - Festivals/Events/Performances — time-bound (has a start/end date); listing
//     these as permanent places would show ended festivals forever. Needs its
//     own "What's on" feature with date-aware filtering, not this importer.
// Every other Visit Seoul category (Culture, History, Nature, Shopping, all of
// Cuisine including full restaurants, Experience Programs — ~2,564 EN items
// across ~53 category codes) is imported and tagged with its real 3-level
// category path (places.category = L1, category_l2, category_l3), so Explore
// can browse it the way Visit Seoul itself organizes it instead of a flat
// app-invented bucket.
//
// The category tree is fetched live (not hand-typed) so this stays correct if
// Visit Seoul adds/renames categories — we only hand-maintain the EXCLUDE list.
//
// Usage:
//   npm run import:visitseoul -- --dry-run   # map first page of each cat, no DB writes
//   npm run import:visitseoul                 # full import
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VISITSEOUL_KEY = process.env.VISITSEOUL_API_KEY;
const MAX_PER_CAT = Number(process.env.VISITSEOUL_MAX_PER_CAT || 100); // pages per category cap
const DETAIL_CONCURRENCY = 3;
const DRY_RUN = process.argv.includes('--dry-run');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in mobile/.env');
  process.exit(1);
}
if (!VISITSEOUL_KEY) {
  console.error('Missing VISITSEOUL_API_KEY in mobile/.env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const BASE = 'https://api-call.visitseoul.net';
const HEADERS = {
  'VISITSEOUL-API-KEY': VISITSEOUL_KEY,
  'Content-Type': 'application/json;charset=UTF-8',
  Accept: 'application/json;charset=UTF-8',
};

// L1 top-level codes to exclude entirely (see SCOPE note above). Their L2/L3
// children are excluded automatically since we filter by path prefix.
const EXCLUDE_L1_PATHS = ['Accommodations', 'Festivals/Events/Performances'];

// Fallback gradient per L1 — only shows when a place has no photo (rare; most do).
const SWATCH_BY_L1: Record<string, [string, string]> = {
  Culture: ['#5a1f4a', '#c2569b'],
  History: ['#2f4858', '#5b7a99'],
  Nature: ['#1f4d4a', '#4a9d8e'],
  Shopping: ['#5b6f9c', '#8fb0c0'],
  Cuisine: ['#7a4a2a', '#e0a05a'],
  'Experience Programs': ['#3a2a55', '#8a6fc0'],
};
const DEFAULT_SWATCH: [string, string] = ['#4a4a4a', '#8a8a8a'];

function stripHtml(s?: string): string {
  return s
    ? s
        // Visit Seoul descriptions sometimes embed a <style> block whose CSS
        // text would otherwise survive tag-stripping — drop those wholesale.
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|li)>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    : '';
}

// "185, Changgyeonggung-ro, Jongno-gu, Seoul" → "Jongno"
function neighborhoodFrom(address?: string): string {
  if (!address) return 'Seoul';
  const m = address.match(/([A-Za-z]+)-gu/);
  return m ? m[1] : 'Seoul';
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function api(path: string, body: unknown, tries = 4): Promise<any> {
  for (let t = 0; t < tries; t++) {
    try {
      const res = await fetch(`${BASE}${path}`, { method: 'POST', headers: HEADERS, body: JSON.stringify(body) });
      const text = await res.text();
      // The API returns 500 under rapid bursts — retry those with backoff.
      if (res.status >= 500) throw new Error(`HTTP ${res.status}`);
      const json = JSON.parse(text);
      if (json.result_code && json.result_code !== 200) {
        throw new Error(`API ${json.result_code}: ${json.result_message}`);
      }
      return json;
    } catch (e: any) {
      if (t === tries - 1) throw e;
      await sleep(700 * (t + 1) + Math.random() * 300);
    }
  }
}

async function apiGet(path: string, tries = 4): Promise<any> {
  for (let t = 0; t < tries; t++) {
    try {
      const res = await fetch(`${BASE}${path}`, { method: 'GET', headers: HEADERS });
      const text = await res.text();
      if (res.status >= 500) throw new Error(`HTTP ${res.status}`);
      const json = JSON.parse(text);
      if (json.result_code && json.result_code !== 200) {
        throw new Error(`API ${json.result_code}: ${json.result_message}`);
      }
      return json;
    } catch (e: any) {
      if (t === tries - 1) throw e;
      await sleep(700 * (t + 1) + Math.random() * 300);
    }
  }
}

const getCategories = () => apiGet('/api/v1/category/list').then((r) => r.data as any[]);
const listPage = (catCode: string, lang: string, pageNo: number) =>
  api('/api/v1/contents/list', { com_ctgry_sn: catCode, lang_code_id: lang, sort_type: 'latest', page_no: pageNo });
const getInfo = (cid: string) => api('/api/v1/contents/info', { cid });

async function listAll(catCode: string, lang: string): Promise<any[]> {
  const out: any[] = [];
  for (let page = 1; page <= MAX_PER_CAT; page++) {
    const res = await listPage(catCode, lang, page).catch(() => null);
    const data: any[] = res?.data ?? [];
    out.push(...data);
    const total = res?.paging?.total_count ?? 0;
    await sleep(120);
    if (data.length < 50 || out.length >= total) break;
  }
  return out;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function koCidFrom(multiLang?: string): string | null {
  // "ko:KOP000297,en:ENP000297,..." → "KOP000297"
  if (!multiLang) return null;
  const m = multiLang.split(',').find((p) => p.trim().startsWith('ko:'));
  return m ? m.split(':')[1]?.trim() ?? null : null;
}

type CatNode = { code: string; level: number; l1: string; l2: string | null; l3: string | null };

function buildCatNode(raw: any): CatNode {
  const parts = String(raw.ctgry_path).split('>').map((p: string) => p.trim());
  return { code: raw.com_ctgry_sn, level: raw.ctgry_level, l1: parts[0], l2: parts[1] ?? null, l3: parts[2] ?? null };
}

async function main() {
  console.log(`Visit Seoul import — fetching live category tree${DRY_RUN ? ' (DRY RUN)' : ''}\n`);

  // 1. Full category tree, minus the two excluded L1 groups.
  const allCats = (await getCategories()).map(buildCatNode);
  const cats = allCats.filter((c) => !EXCLUDE_L1_PATHS.includes(c.l1));
  console.log(`${allCats.length} categories total, ${cats.length} in scope (excluded: ${EXCLUDE_L1_PATHS.join(', ')})`);

  // Query most-specific first (L3, then L2, then L1) so when the same place
  // turns up again under a broader parent query, the first (more specific)
  // tag wins — a plain cid dedup, no extra bookkeeping needed.
  cats.sort((a, b) => b.level - a.level);

  // 2. Collect EN list items (tagged with their category node) + a koCid→koName map.
  const enItems: any[] = [];
  const koName = new Map<string, string>();
  for (const [i, cat] of cats.entries()) {
    const en = await listAll(cat.code, 'en');
    en.forEach((it) => enItems.push({ ...it, _cat: cat }));
    const ko = await listAll(cat.code, 'ko');
    ko.forEach((it) => it.cid && koName.set(it.cid, (it.post_sj || '').trim()));
    console.log(`  [${i + 1}/${cats.length}] ${cat.l1}${cat.l2 ? ' > ' + cat.l2 : ''}${cat.l3 ? ' > ' + cat.l3 : ''}: en ${en.length}, ko ${ko.length}`);
    if (DRY_RUN && i >= 2) break;
  }

  // 3. Dedupe by cid (keep first — most specific, per the sort above).
  const byCid = new Map<string, any>();
  for (const it of enItems) if (it.cid && !byCid.has(it.cid)) byCid.set(it.cid, it);
  const items = [...byCid.values()];
  console.log(`\nUnique EN items: ${items.length}. Fetching details…`);

  // 4. Fetch info per item (coords, description, address, hours, tags).
  let done = 0;
  let noCoords = 0;
  const rows: any[] = [];
  await mapLimit(items, DETAIL_CONCURRENCY, async (item) => {
    const info = await getInfo(item.cid).catch(() => null);
    if (++done % 100 === 0) console.log(`  ${done}/${items.length}`);
    await sleep(60);
    const d = info?.data;
    if (!d) return;
    const tr = d.traffic ?? {};
    const ex = d.extra ?? {};
    const lat = Number(tr.map_position_y);
    const lng = Number(tr.map_position_x);
    if (!isFinite(lat) || !isFinite(lng) || (lat === 0 && lng === 0)) { noCoords++; return; }

    const address = (tr.new_adres || tr.adres || '').trim();
    const homepageLang = (ex.cmmn_hmpg_lang || '').toLowerCase();
    const fee = (ex.trrsrt_use_chrge || '').toUpperCase(); // F free, C paid, N n/a
    const koCid = koCidFrom(item.multi_lang_list);
    const koTitle = koName.get(koCid || '') || '';
    // A second detail call on the KO-locale cid — same content, Korean
    // record — for a genuine Hangul address to show a taxi driver/staff.
    // (Confirmed this is real Korean text, not romanized: contents/list
    // already proves lang_code_id='ko' returns Hangul for koTitle above; this
    // reuses the identical mechanism for the KO record's own address field.)
    let addressKo = '';
    if (koCid) {
      const koInfo = await getInfo(koCid).catch(() => null);
      await sleep(60);
      const koTr = koInfo?.data?.traffic ?? {};
      addressKo = (koTr.new_adres || koTr.adres || '').trim();
    }
    const name = (d.post_sj || item.post_sj || '').trim();
    const cat: CatNode = item._cat;

    rows.push({
      slug: `vs-${item.cid}`,
      name,
      name_ko: koTitle || name,
      category: cat.l1,
      category_l2: cat.l2,
      category_l3: cat.l3,
      neighborhood: neighborhoodFrom(address),
      city: 'Seoul',
      address,
      address_ko: addressKo || null,
      hours: (ex.cmmn_use_time || '').trim(),
      price_range: fee === 'F' ? 'Free' : '',
      description: stripHtml(d.post_desc) || stripHtml(d.sumry || item.sumry),
      lat,
      lng,
      swatch: SWATCH_BY_L1[cat.l1] || DEFAULT_SWATCH,
      // Foreigner Fit stays a purely community-voted layer — no auto pre-fills,
      // so a fresh place starts honestly blank and travelers verify it.
      solo_ok: false,
      english_menu: false,
      price_transparent: false,
      card_ok: false,
      english_spoken: false,
      votes: {},
      // Objective "Good to know" facts, straight from the API:
      subway: (tr.subway_info || '').trim() || null,
      free_entry: fee === 'F',
      english_site: /en/.test(homepageLang), // operates an English website
      wheelchair: Array.isArray(ex.disabled_facility) && ex.disabled_facility.length > 0,
      photo_url: d.main_img || item.main_img || null,
    });
  });

  console.log(`\nMapped ${rows.length} places (${noCoords} skipped: no coordinates).`);
  if (DRY_RUN) {
    console.log('\nSample rows:');
    rows.slice(0, 5).forEach((r) => console.log(JSON.stringify({ slug: r.slug, name: r.name, category: r.category, category_l2: r.category_l2, category_l3: r.category_l3, neighborhood: r.neighborhood, photo: !!r.photo_url }, null, 0)));
    return;
  }

  // 5. Upsert in chunks.
  console.log(`\nUpserting ${rows.length} places…`);
  const CHUNK = 100;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await supabase.from('places').upsert(rows.slice(i, i + CHUNK), { onConflict: 'slug' });
    if (error) throw error;
    console.log(`  ✓ ${Math.min(i + CHUNK, rows.length)}/${rows.length}`);
  }
  console.log('\nDone.');
}

main().catch((e) => {
  console.error('\nImport failed:', e?.message ?? e);
  process.exit(1);
});
