// Imports Seoul places from the Visit Seoul API (api-call.visitseoul.net, run by
// the Seoul Tourism Organization) into the `places` table — in ENGLISH. This is
// TRIP's PRIMARY content source: Visit Seoul is tourist-facing by design, its
// English copy is native (not machine-translated), it carries real coordinates,
// photos, hours and admission info, and it cross-links the same content across 7
// languages (`multi_lang_list`) so we get the English name/description for
// display AND the authentic Korean title for the "show to staff" card from one
// source. (This solves the dead end that killed TourAPI English enrichment —
// see import-tourapi.ts: TourAPI's KO and EN catalogs had non-overlapping IDs.)
//
// API shape (confirmed live against the OpenAPI spec at
// https://api-call.visitseoul.net/api/v1/docs/json):
//   POST /api/v1/contents/list  body { com_ctgry_sn?, lang_code_id?, keyword?, sort_type?, page_no? }
//        → { result_code, data: ContentsListVO[], paging: { page_no, page_size:50, total_count } }
//        ContentsListVO: { cid, com_ctgry_sn, main_img, post_sj, sumry, multi_lang_list, ... }
//   POST /api/v1/contents/info  body { cid }   (coordinates + full detail live here, NOT in list)
//        → data: { post_sj, sumry, post_desc(html), tag[], relate_img[], main_img,
//                  traffic { new_adres, map_position_x(lng), map_position_y(lat), subway_info },
//                  extra { cmmn_use_time, cmmn_telno, cmmn_hmpg_url, cmmn_hmpg_lang,
//                          trrsrt_use_chrge(F/C/N), usage_fee, closed_days } }
//   GET  /api/v1/category/list       → CategoryVO[] (com_ctgry_sn, ctgry_path, ctgry_level)
//   headers: VISITSEOUL-API-KEY: <key>, Content-Type: application/json;charset=UTF-8
//
// The catalog is huge (~3,689 EN items) and dominated by chain-restaurant
// branches, so we import a CURATED set of sightseeing-worthy leaf categories
// (~1,000 places) rather than dumping everything. The full-restaurant category
// (Korean Restaurants, 544) is intentionally excluded.
//
// Usage:
//   npm run import:visitseoul -- --dry-run   # map first page of each cat, no DB writes
//   npm run import:visitseoul                 # full curated English import
//   VISITSEOUL_MAX_PER_CAT=1 npm run import:visitseoul   # tiny smoke test (1 page/cat)
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

type Cat = { category: string; swatch: [string, string] };
// Curated leaf categories (com_ctgry_sn → app category + fallback gradient).
// Swatches only show when a place has no photo; Visit Seoul places usually do.
const HISTORIC: Cat = { category: 'Attraction', swatch: ['#2f4858', '#5b7a99'] };
const NATURE: Cat = { category: 'Attraction', swatch: ['#1f4d4a', '#4a9d8e'] };
const CULTURE: Cat = { category: 'Culture', swatch: ['#5a1f4a', '#c2569b'] };
const SHOPPING: Cat = { category: 'Shopping', swatch: ['#5b6f9c', '#8fb0c0'] };
const CAFE: Cat = { category: 'Cafe', swatch: ['#7a4a2a', '#e0a05a'] };
const NIGHTLIFE: Cat = { category: 'Nightlife', swatch: ['#3a2a55', '#8a6fc0'] };
const ACTIVITY: Cat = { category: 'Activity', swatch: ['#1f4d4a', '#4a9d8e'] };

const CURATED: Record<string, Cat> = {
  // History → Attraction
  Ch5t7s7: HISTORIC, Co2n1h7: HISTORIC, Cb9o5c4: HISTORIC, Ci7i9i6: HISTORIC,
  Cr6m1i5: HISTORIC, Cw1i3e4: HISTORIC, Cb9c5i3: HISTORIC,
  // Culture → Culture
  Cl5y4k0: CULTURE, Ca1u7i6: CULTURE, Cr1f0k2: CULTURE, Ct4h4b7: CULTURE,
  Cy5h2x9: CULTURE, Ct9t6m8: CULTURE, Cr0q2v2: CULTURE,
  // Parks & nature → Attraction
  Ce9z7g9: NATURE, Cp3b3j9: NATURE, Cu5u8d4: NATURE, Cw8j0y7: NATURE,
  // Shopping → Shopping
  Cn7z1h7: SHOPPING, Cy4k5t1: SHOPPING, Cs3j7y4: SHOPPING, Cp5i3g2: SHOPPING,
  // Cuisine → Cafe / Nightlife (chain-heavy full restaurants excluded)
  Cx0t8m5: CAFE, Ck6n0w6: NIGHTLIFE,
  // Experience → Activity
  Cc9i5o2: ACTIVITY,
};

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

async function main() {
  console.log(`Visit Seoul import — ${Object.keys(CURATED).length} curated categories${DRY_RUN ? ' (DRY RUN)' : ''}\n`);

  // 1. Collect EN list items + a koCid→koName map (from the KO catalog of the same categories).
  const enItems: any[] = [];
  const koName = new Map<string, string>();
  for (const [code, cat] of Object.entries(CURATED)) {
    const en = await listAll(code, 'en');
    en.forEach((it) => enItems.push({ ...it, _cat: cat }));
    const ko = await listAll(code, 'ko');
    ko.forEach((it) => it.cid && koName.set(it.cid, (it.post_sj || '').trim()));
    console.log(`  ${code}: en ${en.length}, ko ${ko.length}`);
    if (DRY_RUN) break;
  }

  // 2. Dedupe by cid (keep first category seen).
  const byCid = new Map<string, any>();
  for (const it of enItems) if (it.cid && !byCid.has(it.cid)) byCid.set(it.cid, it);
  const items = [...byCid.values()];
  console.log(`\nUnique EN items: ${items.length}. Fetching details…`);

  // 3. Fetch info per item (coords, description, address, hours, tags).
  let done = 0;
  let noCoords = 0;
  const rows: any[] = [];
  await mapLimit(items, DETAIL_CONCURRENCY, async (item) => {
    const info = await getInfo(item.cid).catch(() => null);
    if (++done % 50 === 0) console.log(`  ${done}/${items.length}`);
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
    const koTitle = koName.get(koCidFrom(item.multi_lang_list) || '') || '';
    const name = (d.post_sj || item.post_sj || '').trim();

    rows.push({
      slug: `vs-${item.cid}`,
      name,
      name_ko: koTitle || name,
      category: item._cat.category,
      neighborhood: neighborhoodFrom(address),
      city: 'Seoul',
      address,
      hours: (ex.cmmn_use_time || '').trim(),
      price_range: fee === 'F' ? 'Free' : '',
      description: stripHtml(d.post_desc) || stripHtml(d.sumry || item.sumry),
      lat,
      lng,
      swatch: item._cat.swatch,
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
    rows.slice(0, 3).forEach((r) => console.log(JSON.stringify({ slug: r.slug, name: r.name, name_ko: r.name_ko, category: r.category, neighborhood: r.neighborhood, lat: r.lat, lng: r.lng, hours: r.hours, photo: !!r.photo_url, desc: r.description.slice(0, 80) }, null, 0)));
    return;
  }

  // 4. Upsert in chunks.
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
