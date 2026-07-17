// One-off backfill for the "verified by TRIP" Foreigner-Fit layer
// (migration-022). Never guesses a per-place fact — each rule either
// mechanically promotes an existing objective Visit Seoul field, or applies
// a well-established category-level fact (e.g. Korean department stores take
// cards everywhere). Re-run anytime after a fresh import; it's idempotent.
//
//   npx tsx scripts/backfill-verified-tags.ts [--dry-run]
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { ForeignerTagKey } from '../data/types';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const dryRun = process.argv.includes('--dry-run');

type Row = {
  slug: string;
  category: string;
  category_l2: string | null;
  english_site: boolean | null;
  wheelchair: boolean | null;
  verified_tags: ForeignerTagKey[] | null;
};

// Rule: what verifiedTags a row deserves, purely mechanically. Each rule is
// commented with WHY it's safe to assert without a per-place lookup.
function rulesFor(row: Row): ForeignerTagKey[] {
  const tags: ForeignerTagKey[] = [];
  // englishInfo is already what Visit Seoul's own english_site field means
  // for a Culture/History listing — this just promotes an already-trusted
  // fact into the crowd checklist's visual, nothing new is claimed.
  if ((row.category === 'Culture' || row.category === 'History') && row.english_site) {
    tags.push('englishInfo');
  }
  // Wheelchair-accessible nature sites (real paths/ramps, per Visit Seoul)
  // reliably also have the other "good facilities" basics (restrooms, signage).
  if (row.category === 'Nature' && row.wheelchair) {
    tags.push('goodFacilities');
  }
  // Formal retail (department stores, shopping malls/outlets) has near-100%
  // card acceptance in Korea — unlike markets/street shopping, which is NOT
  // included here on purpose.
  if (row.category === 'Shopping' && (row.category_l2 === 'Department Stores' || row.category_l2 === 'Shopping Malls & Outlets')) {
    tags.push('cardOk');
  }
  return tags;
}

async function main() {
  const all: Row[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('places')
      .select('slug,category,category_l2,english_site,wheelchair,verified_tags')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    all.push(...(data as Row[]));
    if (data.length < PAGE) break;
  }
  console.log(`Scanned ${all.length} places.`);

  // Group slugs by their target tag set so we can do one bulk update per
  // group instead of one round-trip per place.
  const groups = new Map<string, string[]>();
  let unchanged = 0;
  for (const row of all) {
    const tags = rulesFor(row);
    if (tags.length === 0) continue;
    const existing = row.verified_tags ?? [];
    if (existing.length === tags.length && tags.every((t) => existing.includes(t))) {
      unchanged++;
      continue;
    }
    const key = JSON.stringify(tags);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row.slug);
  }

  console.log(`Already up to date: ${unchanged}. Groups to write:`);
  for (const [key, slugs] of groups) {
    console.log(`  ${key}: ${slugs.length} places`);
  }

  if (dryRun) {
    console.log('\n--dry-run: no writes made.');
    return;
  }

  for (const [key, slugs] of groups) {
    const tags = JSON.parse(key);
    for (let i = 0; i < slugs.length; i += 200) {
      const chunk = slugs.slice(i, i + 200);
      const { error } = await supabase.from('places').update({ verified_tags: tags }).in('slug', chunk);
      if (error) throw error;
    }
  }
  console.log('\nDone.');
}

main().catch((e) => {
  console.error('\nBackfill failed:', e?.message ?? e);
  process.exit(1);
});
