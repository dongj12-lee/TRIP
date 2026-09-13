// One-off backfill for migration-027 (places.blurb_ai): a short, AI-written
// one-line summary for the place card in the trip planner, replacing the
// previous live opening-sentence extraction (lib/placeBlurb.ts) which read
// unevenly across import sources — some open with a flat definition ("X is a
// market in Jung-gu"), not a reason to actually go.
//
// The actual OpenAI call happens server-side in the place-blurb Edge
// Function, reusing the OPENAI_API_KEY secret already set for
// trip-intake/trip-chat — this script only reads/writes Supabase directly
// (service role key) and batches places into that function.
//
// Deploy the function once per project before running this:
//   supabase functions deploy place-blurb --no-verify-jwt --project-ref <REF>
//
//   npx tsx scripts/backfill-place-blurb.ts [--dry-run] [--force] [--limit=N]
//
// Run against dev by default (.env); point at prod the same way the other
// backfills do, by swapping which env file is loaded.
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.slice('--limit='.length)) : Infinity;

// Must match MAX_ITEMS in supabase/functions/place-blurb/index.ts.
const BATCH = 25;
// A description this short rarely has a real detail worth pulling out — the
// existing sentence-extraction fallback already handles these fine, so skip
// them rather than spend a model call on nothing.
const MIN_DESC = 60;

type Row = { slug: string; name: string; category: string; description: string | null; blurb_ai: string | null };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callBatch(places: { slug: string; name: string; category: string; description: string }[]) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/place-blurb`, {
    method: 'POST',
    // The function now refuses callers that aren't internal: it is deployed
    // --no-verify-jwt and spends OpenAI credit per call, and its URL is
    // extractable from the shipped app. This script is the only caller.
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ places }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) throw new Error(json.error ?? `place-blurb ${res.status}`);
  return json.items as { slug: string; blurb: string }[];
}

async function main() {
  const all: Row[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('places')
      .select('slug,name,category,description,blurb_ai')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    all.push(...(data as Row[]));
    if (data.length < PAGE) break;
  }

  const eligible = all.filter((r) => (force || !r.blurb_ai) && (r.description ?? '').length >= MIN_DESC);
  const todo = eligible.slice(0, limit);
  console.log(
    `${all.length} places total, ${eligible.length} eligible${force ? ' (--force: re-writing all)' : ''}, running ${todo.length}.`,
  );

  let written = 0;
  const failed: string[] = [];

  for (let i = 0; i < todo.length; i += BATCH) {
    const chunk = todo.slice(i, i + BATCH);
    let items: { slug: string; blurb: string }[] = [];
    try {
      items = await callBatch(
        chunk.map((r) => ({ slug: r.slug, name: r.name, category: r.category, description: r.description! })),
      );
    } catch (e) {
      console.warn(`  batch @${i} failed: ${(e as Error).message}`);
      failed.push(...chunk.map((r) => r.slug));
      await sleep(300);
      continue;
    }

    const bySlug = new Map(items.map((it) => [it.slug, it.blurb]));
    for (const r of chunk) {
      const blurb = bySlug.get(r.slug)?.trim();
      if (!blurb) {
        failed.push(r.slug);
        continue;
      }
      written++;
      if (!dryRun) {
        const { error } = await supabase.from('places').update({ blurb_ai: blurb }).eq('slug', r.slug);
        if (error) throw error;
      }
    }
    console.log(`  ${Math.min(i + BATCH, todo.length)}/${todo.length}`);
    await sleep(300);
  }

  console.log(`\nWritten: ${written}. Failed/skipped: ${failed.length}.`);
  if (failed.length) console.log(failed.slice(0, 30).join(', ') + (failed.length > 30 ? ', …' : ''));
  if (dryRun) console.log('\n--dry-run: no writes made.');
}

main().catch((e) => {
  console.error('\nBackfill failed:', e?.message ?? e);
  process.exit(1);
});
