// One-way sync of Seoul places that exist in one Supabase project but not the
// other, source → target, insert-only.
//
// WHY: the Visit Seoul importer was run against dev but never against
// production, so prod was short 261 Seoul places (253 `seed` + 8 `tourapi_eng`).
// Re-running the importer against prod would fix the count but would also
// re-download descriptions straight from the CMS, undoing the entity decoding
// in scripts/fix-html-entities.ts. Copying the already-cleaned dev rows keeps
// both fixes.
//
// Insert-only by design: rows that already exist in the target are left
// untouched, so this can never overwrite production content with dev content.
//
// Usage (reads BOTH projects, so it takes explicit env files rather than the
// ambient .env — no swapping, nothing to forget to restore):
//   npx tsx scripts/sync-missing-places.ts --from .env --to .env.production --dry-run
//   npx tsx scripts/sync-missing-places.ts --from .env --to .env.production
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const argOf = (flag: string) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};
const FROM = argOf('--from');
const TO = argOf('--to');

if (!FROM || !TO) {
  console.error('Usage: --from <envfile> --to <envfile> [--dry-run]');
  process.exit(1);
}

function loadEnv(path: string) {
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  const url = out.EXPO_PUBLIC_SUPABASE_URL;
  const key = out.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error(`${path} is missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY`);
  return { url, key };
}

async function allSeoulRows(db: SupabaseClient, columns: string) {
  const PAGE = 1000;
  const all: any[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from('places')
      .select(columns)
      .eq('city', 'Seoul')
      .order('slug')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    all.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return all;
}

async function main() {
  const src = loadEnv(FROM!);
  const dst = loadEnv(TO!);
  if (src.url === dst.url) throw new Error('--from and --to point at the same project');

  console.log(`from : ${src.url}`);
  console.log(`to   : ${dst.url}`);
  if (DRY_RUN) console.log('(dry run — nothing will be written)');
  console.log('');

  const source = createClient(src.url, src.key);
  const target = createClient(dst.url, dst.key);

  const [srcRows, dstRows] = await Promise.all([
    allSeoulRows(source, '*'),
    allSeoulRows(target, 'slug'),
  ]);
  const have = new Set(dstRows.map((r: any) => r.slug));
  const missing = srcRows.filter((r: any) => !have.has(r.slug));

  console.log(`source Seoul places : ${srcRows.length}`);
  console.log(`target Seoul places : ${dstRows.length}`);
  console.log(`missing in target   : ${missing.length}`);
  console.log(`target after sync   : ${dstRows.length + missing.length}\n`);

  const bySource = missing.reduce((m: Record<string, number>, r: any) => {
    const k = r.source ?? 'null';
    m[k] = (m[k] ?? 0) + 1;
    return m;
  }, {});
  console.log('by source:', bySource);
  console.log('\nexamples:');
  for (const r of missing.slice(0, 5)) console.log(`  - ${r.slug}  |  ${r.name}`);

  if (DRY_RUN || !missing.length) {
    console.log(DRY_RUN ? '\nDry run complete.' : '\nNothing to sync.');
    return;
  }

  // `id` and `created_at` belong to the target project; let it assign its own.
  const rows = missing.map(({ id, created_at, ...rest }: any) => rest);

  console.log('\nInserting…');
  const CHUNK = 100;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await target.from('places').upsert(rows.slice(i, i + CHUNK), { onConflict: 'slug' });
    if (error) throw error;
    console.log(`  ✓ ${Math.min(i + CHUNK, rows.length)}/${rows.length}`);
  }

  const after = await allSeoulRows(target, 'slug');
  console.log(`\nDone. Target now has ${after.length} Seoul places.`);
}

main().catch((e) => {
  console.error('\nSync failed:', e.message ?? e);
  process.exit(1);
});
