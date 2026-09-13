// Backfill places.category_l2 for Cuisine rows that have none.
//
// Why it matters: the day planner decides what can fill a meal slot with
// `category === 'Cuisine' && !isCafe && !isBar`, and both of those tests read
// category_l2. A café or a wine bar with a null subcategory is therefore
// indistinguishable from a restaurant, and gets served as lunch. Measured
// 2026-07-23: 942 of 2,014 Cuisine rows had no subcategory, and 15% of
// generated meal stops landed on one.
//
// Source is the Naver Local Search API — the same free Open API product the
// website backfill uses (NOT the paid Maps SDK).
//
// The one thing this does differently from scripts/backfill-place-website.ts:
// it verifies the match by COORDINATES before writing. A wrong website is a
// dead link; a wrong subcategory is worse than none, because it turns "we
// don't know" into a confident "this is a Korean restaurant" and the planner
// will act on it. Naver returns several same-name businesses across the city
// (probed: true matches sit within ~15m, wrong ones are kilometres away), so
// anything beyond MAX_MATCH_M is discarded rather than guessed.
//
//   npx tsx scripts/backfill-cuisine-subcategory.ts [--dry-run] [--limit=N] [--source=tourapi_kor]
//   DOTENV_CONFIG_PATH=.env.production npx tsx scripts/backfill-cuisine-subcategory.ts …
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const NAVER_CLIENT_ID = process.env.NAVER_SEARCH_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_SEARCH_CLIENT_SECRET;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
  console.error('Missing NAVER_SEARCH_CLIENT_ID / NAVER_SEARCH_CLIENT_SECRET (see .env.example)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const dryRun = process.argv.includes('--dry-run');
const limitArg = Number(process.argv.find((a) => a.startsWith('--limit='))?.slice('--limit='.length) || 0);
const sourceFilter = process.argv.find((a) => a.startsWith('--source='))?.slice('--source='.length) || null;

// True matches probed at 3–15m. 150m is generous enough for a slightly
// off-centre pin while still rejecting a same-name branch across town.
const MAX_MATCH_M = 150;

type Row = { slug: string; name: string; name_ko: string | null; lat: number; lng: number; neighborhood: string | null };

const strip = (s: string) => s.replace(/<\/?b>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

function metres(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Naver's category is a `>`-separated path whose FIRST segment varies —
// "음식점>인도음식", "한식>냉면", "카페,디저트>카페", "술집>오뎅,꼬치" — so match
// anywhere in the string, not on a prefix. Order matters: café and bar are
// checked first because those are exactly the ones that must never fill a
// meal slot, and several of them also contain food words.
const CAFE = ['카페', '디저트', '베이커리', '제과', '커피', '빙수', '茶', '찻집', '전통찻집'];
const BAR = ['술집', '호프', '포차', '와인', '칵테일', '이자카야', '펍', '맥주', '요리주점', '바(bar)', '클럽'];
const KOREAN = ['한식', '분식', '순대', '냉면', '막국수', '국수', '칼국수', '삼계탕', '설렁탕', '해장국', '백반',
  '고기', '갈비', '삼겹', '족발', '보쌈', '찌개', '전골', '떡볶이', '김밥', '치킨', '생선회', '생선구이', '오리',
  '만두', '죽', '한정식', '두부', '곱창', '닭갈비', '한우'];
const FOREIGN = ['일식', '중식', '양식', '이탈리아', '프랑스', '멕시코', '인도음식', '태국음식', '베트남', '아시아',
  '스테이크', '뷔페', '스시', '초밥', '돈가스', '라멘', '파스타', '피자', '햄버거', '세계음식', '퓨전', '터키',
  '스페인', '그리스', '남미', '중동', '독일', '패밀리레스토랑'];
// Naver indexes plenty of non-food businesses under the same name (a photo
// studio called 달마시안, a pet shop). Those must not be written at all.
const NOT_FOOD = ['사진', '스튜디오', '반려동물', '서비스,산업', '병원', '학원', '숙박', '부동산', '미용'];

function mapCategory(naverCategory: string): string | null {
  const c = naverCategory;
  if (NOT_FOOD.some((k) => c.includes(k))) return null;
  if (CAFE.some((k) => c.includes(k))) return 'Cafes & Tea Shops';
  if (BAR.some((k) => c.includes(k))) return 'Bars & Clubs';
  if (KOREAN.some((k) => c.includes(k))) return 'Korean Restaurants';
  if (FOREIGN.some((k) => c.includes(k))) return 'Foreign Restaurant';
  // Confirmed food, unknown cuisine. Saying "Foreign Restaurant" here would be
  // inventing a fact; "Restaurants" is true and is all the planner needs (it
  // reads this only to rule out cafés and bars).
  if (c.includes('음식')) return 'Restaurants';
  return null;
}

async function searchLocal(query: string) {
  const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=5`;
  const res = await fetch(url, {
    headers: { 'X-Naver-Client-Id': NAVER_CLIENT_ID!, 'X-Naver-Client-Secret': NAVER_CLIENT_SECRET! },
  });
  if (!res.ok) throw new Error(`Naver Local Search ${res.status}`);
  const json = await res.json();
  // deno-lint-ignore no-explicit-any
  return ((json.items ?? []) as any[])
    .filter((it) => it.mapx && it.mapy)
    .map((it) => ({
      title: strip(it.title ?? ''),
      category: it.category ?? '',
      lat: Number(it.mapy) / 1e7,
      lng: Number(it.mapx) / 1e7,
    }));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const all: Row[] = [];
  for (let from = 0; ; from += 1000) {
    let q = supabase
      .from('places')
      .select('slug,name,name_ko,lat,lng,neighborhood')
      .eq('category', 'Cuisine')
      .is('category_l2', null)
      .range(from, from + 999);
    if (sourceFilter) q = q.eq('source', sourceFilter);
    const { data, error } = await q;
    if (error) throw error;
    all.push(...(data as Row[]));
    if (data.length < 1000) break;
  }
  const todo = limitArg ? all.slice(0, limitArg) : all;
  console.log(
    `${all.length} Cuisine rows with no subcategory${sourceFilter ? ` (source=${sourceFilter})` : ''}; processing ${todo.length}.` +
      (dryRun ? '  [dry run]' : ''),
  );

  const counts: Record<string, number> = {};
  let tooFar = 0;
  let noHit = 0;
  let notFood = 0;
  const samples: string[] = [];

  for (const row of todo) {
    const query = row.name_ko || row.name;
    let items: Awaited<ReturnType<typeof searchLocal>> = [];
    try {
      items = await searchLocal(query);
    } catch (e) {
      console.warn(`  [${row.slug}] search failed: ${(e as Error).message}`);
    }

    const nearest = items
      .map((it) => ({ ...it, m: metres(row, it) }))
      .sort((a, b) => a.m - b.m)[0];

    if (!nearest) {
      noHit++;
    } else if (nearest.m > MAX_MATCH_M) {
      tooFar++;
    } else {
      const l2 = mapCategory(nearest.category);
      if (!l2) {
        notFood++;
        if (samples.length < 15) samples.push(`unmapped: ${query} → "${nearest.category}"`);
      } else {
        counts[l2] = (counts[l2] ?? 0) + 1;
        if (samples.length < 15) samples.push(`${l2.padEnd(20)} ${query} → "${nearest.category}" (${Math.round(nearest.m)}m)`);
        if (!dryRun) {
          const { error } = await supabase.from('places').update({ category_l2: l2 }).eq('slug', row.slug);
          if (error) throw error;
        }
      }
    }
    await sleep(120); // Naver's Open API limit is per-second
  }

  const resolved = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(`\nResolved ${resolved}/${todo.length} (${Math.round((resolved / todo.length) * 100)}%)`);
  for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(20)} ${v}`);
  console.log(`\nSkipped — no Naver result: ${noHit}, match too far (>${MAX_MATCH_M}m): ${tooFar}, non-food/unmapped: ${notFood}`);
  console.log('\nSamples:');
  samples.forEach((s) => console.log('  ' + s));
  if (dryRun) console.log('\n--dry-run: no writes made.');
}

main().catch((e) => {
  console.error('\nBackfill failed:', e?.message ?? e);
  process.exit(1);
});
