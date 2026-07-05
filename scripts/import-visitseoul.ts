// Imports Seoul places from the Visit Seoul API Center (api.visitseoul.net,
// run by the Seoul Tourism Organization, opened 2025-10-20) into the `places`
// table — in ENGLISH. This is TRIP's PRIMARY content source (TourAPI in
// import-tourapi.ts is now secondary/supplementary): Visit Seoul is
// tourist-facing by design, its English copy is native (not machine-
// translated), and it serves the same catalog in 7 languages with cross-links
// (`multi_lang_list`), so we get the English name/description for display AND
// the authentic Korean title for the "show to staff" card from one source —
// solving the exact problem that made English enrichment from TourAPI a dead
// end (see that file's header: TourAPI's Korean and English services turned
// out to be entirely separate catalogs with non-overlapping content IDs).
//
// Endpoints (confirmed against the official docs at
// https://api.visitseoul.net/apiinfo/apilist/…):
//   POST https://api-call.visitseoul.net/api/v1/contents/list
//        body: { lang_code_id?, com_ctgry_sn?, keyword?, sort_type?, page_no? }
//   GET  https://api-call.visitseoul.net/api/v1/contents/info?cid={cid}
//   GET  https://api-call.visitseoul.net/api/v1/code/lang
//   headers: VISITSEOUL-API-KEY: <key>, Accept: application/json;charset=UTF-8
//
// Get a key: sign up at https://api.visitseoul.net → 마이페이지 → API 키 관리 →
// 발급 신청 (a call-site URL must be registered; admin approval required).
//
// NOTE: exact response-field shapes for `extra`/`traffic`/`tourist` and the
// category serial numbers weren't fully published in the public docs — the
// DISCOVER mode below prints raw samples so we can finalize the field mapping
// on first run instead of guessing (lesson learned from the TourAPI import).
//
// Usage:
//   npm run import:visitseoul -- --discover   # print langs + first page raw, no DB writes
//   npm run import:visitseoul                 # full English import
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VISITSEOUL_KEY = process.env.VISITSEOUL_API_KEY;
const MAX_PAGES = Number(process.env.VISITSEOUL_MAX_PAGES || 20);
const DETAIL_CONCURRENCY = 4;
const DISCOVER = process.argv.includes('--discover');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in mobile/.env');
  process.exit(1);
}
if (!VISITSEOUL_KEY) {
  console.error('Missing VISITSEOUL_API_KEY in mobile/.env — see comment at top of this file for how to get one.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const BASE = 'https://api-call.visitseoul.net';

const HEADERS = {
  'VISITSEOUL-API-KEY': VISITSEOUL_KEY,
  Accept: 'application/json;charset=UTF-8',
  'Content-Type': 'application/json;charset=UTF-8',
};

// Visit Seoul top-level category (Korean label from cate_depth) → our app category + swatch.
// Labels verified in DISCOVER mode; unknown categories are logged and skipped.
const CATEGORY_MAP: Record<string, { category: string; swatch: [string, string] }> = {
  문화관광: { category: 'Culture', swatch: ['#5a1f4a', '#c2569b'] },
  역사관광: { category: 'Attraction', swatch: ['#2f4858', '#5b7a99'] },
  자연관광: { category: 'Attraction', swatch: ['#1f4d4a', '#4a9d8e'] },
  체험관광: { category: 'Activity', swatch: ['#1f4d4a', '#4a9d8e'] },
  쇼핑: { category: 'Shopping', swatch: ['#5b6f9c', '#8fb0c0'] },
  음식: { category: 'Restaurant', swatch: ['#7a4a2a', '#e0a05a'] },
  // 숙박 (accommodation) and 축제·공연·행사 (events) intentionally skipped for
  // the places table — events belong in a future "What's on" feature instead.
};

function stripHtml(s?: string) {
  return s
    ? s
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    : '';
}

async function api(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { ...HEADERS, ...(init?.headers || {}) } });
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Visit Seoul API returned non-JSON for ${path} (HTTP ${res.status}):\n${text.slice(0, 500)}`);
  }
  if (json.result_code && json.result_code !== 200) {
    throw new Error(`Visit Seoul API error ${json.result_code}: ${json.result_message} (path: ${path})`);
  }
  return json;
}

const listContents = (body: Record<string, unknown>) =>
  api('/api/v1/contents/list', { method: 'POST', body: JSON.stringify(body) });
const getContent = (cid: string) => api(`/api/v1/contents/info?cid=${encodeURIComponent(cid)}`);

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

async function discover() {
  console.log('— languages —');
  console.log(JSON.stringify(await api('/api/v1/code/lang'), null, 2));
  console.log('\n— first page of English contents (raw) —');
  const page = await listContents({ lang_code_id: 'en', page_no: 1 });
  console.log(JSON.stringify(page, null, 2).slice(0, 4000));
  const first = page?.data?.[0] ?? page?.data?.list?.[0];
  if (first?.cid) {
    console.log('\n— first content detail (raw) —');
    console.log(JSON.stringify(await getContent(first.cid), null, 2).slice(0, 6000));
  }
  console.log('\nDiscover complete — use this output to verify CATEGORY_MAP labels and field paths.');
}

async function main() {
  if (DISCOVER) return discover();

  // 1. Pull all English content pages.
  const items: any[] = [];
  for (let pageNo = 1; pageNo <= MAX_PAGES; pageNo++) {
    const page = await listContents({ lang_code_id: 'en', page_no: pageNo, sort_type: 'latest' });
    const list: any[] = page?.data?.list ?? page?.data ?? [];
    if (!Array.isArray(list) || list.length === 0) break;
    items.push(...list);
    const total = page?.total_count ?? page?.data?.total_count;
    console.log(`page ${pageNo}: +${list.length} (total so far ${items.length}${total ? ` / ${total}` : ''})`);
    if (total && items.length >= total) break;
  }

  // 2. Fetch details (hours, coordinates, Korean cross-link, full description).
  console.log(`\nFetching ${items.length} content details…`);
  let done = 0;
  const details = await mapLimit(items, DETAIL_CONCURRENCY, async (item: any) => {
    const d = await getContent(item.cid).catch(() => null);
    if (++done % 50 === 0) console.log(`  ${done}/${items.length}`);
    return d?.data ?? null;
  });

  // 3. Map into places rows.
  const rows: any[] = [];
  const skippedCategories = new Map<string, number>();
  details.forEach((d: any, i: number) => {
    const item = items[i];
    if (!d) return;
    const topCategory: string | undefined = (d.cate_depth ?? item.cate_depth)?.[0]?.name ?? (d.cate_depth ?? item.cate_depth)?.[0];
    const mapped = topCategory ? CATEGORY_MAP[topCategory] : undefined;
    if (!mapped) {
      if (topCategory) skippedCategories.set(topCategory, (skippedCategories.get(topCategory) ?? 0) + 1);
      return;
    }
    // Coordinates & address live under traffic/extra per the docs; exact key
    // names are normalized here defensively and validated in DISCOVER mode.
    const lat = Number(d.traffic?.lat ?? d.traffic?.latitude ?? d.lat ?? NaN);
    const lng = Number(d.traffic?.lng ?? d.traffic?.longitude ?? d.lng ?? NaN);
    if (!isFinite(lat) || !isFinite(lng)) return;
    const koTitle = (Array.isArray(d.multi_lang_list) ? d.multi_lang_list : [])
      .find((m: any) => m.lang_code_id === 'ko')?.post_sj;

    rows.push({
      slug: `vs-${d.cid ?? item.cid}`,
      name: d.post_sj ?? item.post_sj,
      name_ko: koTitle ?? d.post_sj ?? item.post_sj,
      category: mapped.category,
      neighborhood: d.traffic?.district ?? 'Seoul',
      city: 'Seoul',
      address: d.traffic?.address ?? d.extra?.address ?? '',
      hours: d.extra?.hours ?? d.extra?.use_time ?? '',
      price_range: '',
      description: stripHtml(d.sumry ?? item.sumry),
      description_en: stripHtml(d.post_desc) || stripHtml(d.sumry ?? item.sumry),
      lat,
      lng,
      swatch: mapped.swatch,
      solo_ok: false,
      english_menu: false,
      price_transparent: false,
      card_ok: false,
      english_spoken: false,
      votes: {},
      photo_url: d.main_img ?? item.main_img ?? null,
      source: 'visitseoul',
    });
  });

  if (skippedCategories.size) {
    console.log('\nSkipped categories (add to CATEGORY_MAP if wanted):');
    for (const [k, v] of skippedCategories) console.log(`  ${k}: ${v}`);
  }

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
  console.error('\nImport failed:', e.message ?? e);
  process.exit(1);
});
