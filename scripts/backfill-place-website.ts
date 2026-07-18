// One-off backfill for migration-025 (places.website_url): resolve each
// place's own official website via the Naver Local Search API (a free Open
// API product, separate from the paid Maps SDK already in use).
//
// This is NOT a Naver Map / review link — Naver has no official API, free or
// paid, that exposes a place ID or a link to a business's Naver Map review
// page (verified: NCP Maps only ships Static Map/Directions/Geocoding; the
// nmap:// app scheme only drops a pin; the Local Search API's `link` field is
// the business's own external homepage). So the place detail screen instead
// shows a "Visit website" link when a business has registered one — real,
// useful, and requires no review-content caching at all.
//
// Matching is text search by name_ko (Naver's Local Search index is
// Korean-name-first — an English query reliably returns zero items, response
// claims total:1 but items:[]). Not always a perfect match, so this never
// overwrites an existing link and logs anything it can't confidently resolve
// for manual review instead of guessing.
//
//   npx tsx scripts/backfill-place-website.ts [--dry-run] [--force]
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
  console.error(
    'Missing NAVER_SEARCH_CLIENT_ID / NAVER_SEARCH_CLIENT_SECRET.\n' +
      'Register a free "Search" app (not Maps) at https://developers.naver.com/apps → Open API 이용 신청,\n' +
      'then add the Client ID/Secret to .env.',
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');

type Row = { slug: string; name: string; name_ko: string | null; neighborhood: string | null; website_url: string | null };

// Naver wraps matched terms in <b> and HTML-escapes the rest — strip both
// since we only need the plain link, but the title is useful for logging.
function stripTags(s: string) {
  return s
    .replace(/<\/?b>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function searchLocal(query: string): Promise<{ title: string; link: string } | null> {
  const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=1`;
  const res = await fetch(url, {
    headers: {
      'X-Naver-Client-Id': NAVER_CLIENT_ID!,
      'X-Naver-Client-Secret': NAVER_CLIENT_SECRET!,
    },
  });
  if (!res.ok) throw new Error(`Naver Local Search ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const item = json.items?.[0];
  if (!item?.link) return null;
  return { title: stripTags(item.title), link: item.link };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const all: Row[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('places')
      .select('slug,name,name_ko,neighborhood,website_url')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    all.push(...(data as Row[]));
    if (data.length < PAGE) break;
  }
  const todo = force ? all : all.filter((r) => !r.website_url);
  console.log(`${all.length} places total, ${todo.length} to resolve${force ? ' (--force: re-resolving all)' : ''}.`);

  let resolved = 0;
  const unresolved: string[] = [];

  for (const row of todo) {
    if (!row.name_ko) {
      unresolved.push(row.slug);
      await sleep(120);
      continue;
    }
    let hit: { title: string; link: string } | null = null;
    try {
      hit = await searchLocal(row.name_ko);
    } catch (e) {
      console.warn(`  [${row.slug}] search failed: ${(e as Error).message}`);
    }

    if (!hit) {
      unresolved.push(row.slug);
    } else {
      resolved++;
      if (!dryRun) {
        const { error } = await supabase.from('places').update({ website_url: hit.link }).eq('slug', row.slug);
        if (error) throw error;
      }
    }
    // Naver's Open API rate limit is per-second; a small delay keeps this
    // comfortably under it across 2,000+ sequential calls.
    await sleep(120);
  }

  console.log(`\nResolved: ${resolved}. Unresolved (no confident match): ${unresolved.length}`);
  if (unresolved.length) console.log(unresolved.slice(0, 30).join(', ') + (unresolved.length > 30 ? ', …' : ''));
  if (dryRun) console.log('\n--dry-run: no writes made.');
}

main().catch((e) => {
  console.error('\nBackfill failed:', e?.message ?? e);
  process.exit(1);
});
