// ROLLBACK: removes the non-Seoul day-trip-city places that
// import-tourapi-daytrip-cities.ts + curate-daytrip-landmarks.ts inserted.
//
// WHY THIS EXISTS
// Those two scripts add Busan/Gyeongju/Jeonju/Gangneung/Chuncheon rows to
// `places`. The app is supposed to hide them from Explore — lib/remoteData.tsx
// filters the shared `places` feed to city === 'Seoul', so only the
// city-day-trips theme's places rail (which resolves through `placeBySlug`,
// the unfiltered map) can reach them.
//
// BUT that filter only exists in builds made after 2026-08-16. TestFlight
// build #7 — the one currently in App Store review — predates it, so it has
// NO filter: every one of these rows shows up in its Explore list, with
// Korean-only names, inside an app marketed to English-speaking travelers.
//
// So until a build containing the filter ships, production must hold Seoul
// rows ONLY. Run this against prod to restore that state.
//
// Safe to re-run. Deletes strictly by the five city values those importers
// write — it never touches a Seoul row.
//
// Run with:
//   npx tsx scripts/cleanup-daytrip-cities.ts --dry-run   # count only
//   npx tsx scripts/cleanup-daytrip-cities.ts             # actually delete
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.argv.includes('--dry-run');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in mobile/.env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Exactly the cities written by import-tourapi-daytrip-cities.ts.
const CITIES = ['Busan', 'Gyeongju', 'Jeonju', 'Gangneung', 'Chuncheon'];

async function countBy(city: string) {
  const { count, error } = await supabase
    .from('places')
    .select('slug', { count: 'exact', head: true })
    .eq('city', city);
  if (error) throw error;
  return count ?? 0;
}

async function main() {
  console.log(`Target: ${SUPABASE_URL}`);
  console.log(DRY_RUN ? '(dry run — nothing will be deleted)\n' : '');

  let total = 0;
  for (const city of CITIES) {
    const n = await countBy(city);
    console.log(`  ${city.padEnd(12)} ${n}`);
    total += n;
  }
  const seoul = await countBy('Seoul');
  console.log(`  ${'—'.repeat(20)}`);
  console.log(`  to delete: ${total}`);
  console.log(`  Seoul (kept, untouched): ${seoul}\n`);

  if (DRY_RUN) {
    console.log('Dry run complete. Re-run without --dry-run to delete.');
    return;
  }
  if (total === 0) {
    console.log('Nothing to delete — already clean.');
    return;
  }

  const { error } = await supabase.from('places').delete().in('city', CITIES);
  if (error) throw error;

  console.log('Deleted. Verifying…');
  let left = 0;
  for (const city of CITIES) left += await countBy(city);
  const seoulAfter = await countBy('Seoul');
  console.log(`  non-Seoul remaining: ${left}`);
  console.log(`  Seoul: ${seoulAfter}`);
  if (left !== 0) throw new Error('Some non-Seoul rows survived — investigate before shipping.');
  if (seoulAfter !== seoul) throw new Error(`Seoul count changed (${seoul} → ${seoulAfter}) — this should never happen.`);
  console.log('\nDone. Catalog is Seoul-only again.');
}

main().catch((e) => {
  console.error('\nCleanup failed:', e.message ?? e);
  process.exit(1);
});
