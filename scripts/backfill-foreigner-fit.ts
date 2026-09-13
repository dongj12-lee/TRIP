// One-off backfill for the Explore "Foreigner Fit" filters (solo_ok,
// english_menu, price_transparent, card_ok, english_spoken).
//
// Every one of these five columns was `false` for all 4,002 places — not
// missing, not null, every row imported with the literal default and never
// set otherwise. That means every Foreigner-Fit filter in Explore has always
// returned zero results. This is the fix.
//
// Two different kinds of claim, two different methods:
//   - cardOk / priceTransparent: mechanical, category-level rules (this file,
//     no API call). Korea requires registered card acceptance and posted
//     pricing by law — a safe broad default — EXCEPT traditional markets and
//     street-format stalls, the one well-documented cash/haggle exception,
//     which are excluded by category_l2. Same confidence level as the
//     existing verified_tags card-acceptance rule in backfill-verified-tags.ts.
//   - soloOk / englishMenu / englishSpoken: genuinely different place to
//     place, so guessing from category would be dishonest. These go through
//     the place-fit Edge Function, which judges each place from its own
//     catalog description and defaults to false — i.e. leaves the column
//     alone — whenever the description doesn't clearly support a claim.
//
// This only ever promotes false -> true on real evidence; it never flips an
// existing true back to false, so it's safe to re-run after a fresh import.
//
//   npx tsx scripts/backfill-foreigner-fit.ts [--dry-run] [--limit=N] [--skip-mechanical] [--skip-ai]
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
const skipMechanical = process.argv.includes('--skip-mechanical');
const skipAi = process.argv.includes('--skip-ai');
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.slice('--limit='.length)) : Infinity;

// Must match MAX_ITEMS in supabase/functions/place-fit/index.ts.
const BATCH = 25;
// Same threshold as the blurb backfill: too short to responsibly judge from.
const MIN_DESC = 60;

type Row = {
  slug: string;
  category: string;
  category_l2: string | null;
  description: string | null;
  name: string;
  solo_ok: boolean;
  english_menu: boolean;
  price_transparent: boolean;
  card_ok: boolean;
  english_spoken: boolean;
};

// Which of the three AI-judged fields Explore actually shows for a place's
// category — copied from data/seed.ts fitTagsFor/FIT_BY_CATEGORY so a model
// answer for a field that screen never displays doesn't get written. Kept as
// a literal mirror (not an import) because this runs as a standalone tsx
// script against raw snake_case DB rows, not mapped Place objects; the
// category strings themselves are the real contract and are copied exactly.
function aiFieldsFor(category: string, categoryL2: string | null): ('soloOk' | 'englishMenu' | 'englishSpoken')[] {
  const isCafe = category === 'Cuisine' && categoryL2 === 'Cafes & Tea Shops';
  const isBar = category === 'Cuisine' && categoryL2 === 'Bars & Clubs';
  if (category === 'Cuisine') return ['soloOk', 'englishMenu', 'englishSpoken'];
  if (category === 'Experience Programs') return ['soloOk', 'englishSpoken'];
  if (category === 'Shopping' || category === 'Culture' || category === 'History') return ['englishSpoken'];
  void isCafe; void isBar; // no distinct rule beyond Cuisine today, kept for future FIT_BY_CATEGORY changes
  return [];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Mechanical: cardOk + priceTransparent ──────────────────────────────
function mechanicalUpdate(row: Row): { card_ok?: true; price_transparent?: true } | null {
  const cardRelevant = row.category === 'Cuisine' || row.category === 'Shopping' || row.category === 'Experience Programs';
  const priceRelevant = row.category === 'Cuisine' || row.category === 'Shopping';
  const isTraditionalMarket = row.category === 'Shopping' && (row.category_l2 ?? '').includes('Traditional Market');
  const out: { card_ok?: true; price_transparent?: true } = {};
  if (cardRelevant && !isTraditionalMarket && !row.card_ok) out.card_ok = true;
  if (priceRelevant && !isTraditionalMarket && !row.price_transparent) out.price_transparent = true;
  return Object.keys(out).length ? out : null;
}

async function runMechanical(all: Row[]) {
  const targets = all.map((r) => ({ row: r, update: mechanicalUpdate(r) })).filter((x) => x.update);
  console.log(`\n=== Mechanical (card_ok / price_transparent) ===`);
  console.log(`${targets.length} places to update.`);
  if (dryRun) {
    console.log(targets.slice(0, 10).map((t) => `  ${t.row.slug}: ${JSON.stringify(t.update)}`).join('\n'));
    if (targets.length > 10) console.log(`  … and ${targets.length - 10} more`);
    return;
  }
  // Group by identical update shape so this is a handful of bulk writes, not
  // one round-trip per place.
  const groups = new Map<string, string[]>();
  for (const t of targets) {
    const key = JSON.stringify(t.update);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t.row.slug);
  }
  for (const [key, slugs] of groups) {
    const update = JSON.parse(key);
    for (let i = 0; i < slugs.length; i += 200) {
      const chunk = slugs.slice(i, i + 200);
      const { error } = await supabase.from('places').update(update).in('slug', chunk);
      if (error) throw error;
    }
  }
  console.log('done.');
}

// ── AI-judged: soloOk / englishMenu / englishSpoken ────────────────────
async function callBatch(places: { slug: string; name: string; category: string; categoryL2: string; description: string }[]) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/place-fit`, {
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
  if (!res.ok || json.error) throw new Error(json.error ?? `place-fit ${res.status}`);
  return json.items as { slug: string; soloOk: boolean; englishMenu: boolean; englishSpoken: boolean }[];
}

async function runAi(all: Row[]) {
  console.log(`\n=== AI-judged (solo_ok / english_menu / english_spoken) ===`);
  const eligible = all.filter((r) => {
    const fields = aiFieldsFor(r.category, r.category_l2);
    if (!fields.length) return false;
    if ((r.description ?? '').length < MIN_DESC) return false;
    // Already fully true on every field this place's category cares about —
    // nothing left for the model to add.
    const already = fields.every((f) => (f === 'soloOk' ? r.solo_ok : f === 'englishMenu' ? r.english_menu : r.english_spoken));
    return !already;
  });
  const todo = eligible.slice(0, limit);
  console.log(`${all.length} places total, ${eligible.length} eligible, running ${todo.length}.`);

  let written = 0;
  const failed: string[] = [];

  for (let i = 0; i < todo.length; i += BATCH) {
    const chunk = todo.slice(i, i + BATCH);
    let items: { slug: string; soloOk: boolean; englishMenu: boolean; englishSpoken: boolean }[] = [];
    try {
      items = await callBatch(
        chunk.map((r) => ({ slug: r.slug, name: r.name, category: r.category, categoryL2: r.category_l2 ?? '', description: r.description! })),
      );
    } catch (e) {
      console.warn(`  batch @${i} failed: ${(e as Error).message}`);
      failed.push(...chunk.map((r) => r.slug));
      await sleep(300);
      continue;
    }

    const bySlug = new Map(items.map((it) => [it.slug, it]));
    for (const r of chunk) {
      const hit = bySlug.get(r.slug);
      if (!hit) { failed.push(r.slug); continue; }
      const fields = aiFieldsFor(r.category, r.category_l2);
      const update: Record<string, true> = {};
      if (fields.includes('soloOk') && hit.soloOk && !r.solo_ok) update.solo_ok = true;
      if (fields.includes('englishMenu') && hit.englishMenu && !r.english_menu) update.english_menu = true;
      if (fields.includes('englishSpoken') && hit.englishSpoken && !r.english_spoken) update.english_spoken = true;
      if (!Object.keys(update).length) continue;
      written++;
      if (!dryRun) {
        const { error } = await supabase.from('places').update(update).eq('slug', r.slug);
        if (error) throw error;
      }
    }
    console.log(`  ${Math.min(i + BATCH, todo.length)}/${todo.length}`);
    await sleep(300);
  }

  console.log(`\nWritten: ${written}. Failed: ${failed.length}.`);
  if (failed.length) console.log(failed.slice(0, 30).join(', ') + (failed.length > 30 ? ', …' : ''));
}

async function main() {
  const all: Row[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('places')
      .select('slug,category,category_l2,description,name,solo_ok,english_menu,price_transparent,card_ok,english_spoken')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    all.push(...(data as Row[]));
    if (data.length < PAGE) break;
  }
  console.log(`Scanned ${all.length} places.${dryRun ? ' (dry run)' : ''}`);

  if (!skipMechanical) await runMechanical(all);
  if (!skipAi) await runAi(all);
  if (dryRun) console.log('\n--dry-run: no writes made.');
}

main().catch((e) => {
  console.error('\nBackfill failed:', e?.message ?? e);
  process.exit(1);
});
