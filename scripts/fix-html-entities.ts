// Decodes HTML entities left in place text by the importers.
//
// Visit Seoul / TourAPI descriptions are authored in a CMS and come back with
// entities still encoded (&rsquo; &nbsp; &lt; &eacute; …). The importers strip
// HTML *tags* but never decoded entities, so the raw "&lsquo;KRAKEN BURGER&rsquo;"
// text renders literally on the place detail screen.
//
// Touches only `description` and `blurb_ai`, and only rows that actually
// contain an entity. Safe to re-run: decoding already-clean text is a no-op.
//
// Run with:
//   npx tsx scripts/fix-html-entities.ts --dry-run   # show what would change
//   npx tsx scripts/fix-html-entities.ts             # write
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

// Named entities actually observed in the catalog, plus the handful that
// commonly ride along with them. Anything else falls through to the numeric
// forms below, and unknown names are deliberately left untouched rather than
// guessed at.
const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  nbsp: ' ', ensp: ' ', emsp: ' ', thinsp: ' ',
  lsquo: '‘', rsquo: '’', sbquo: '‚',
  ldquo: '“', rdquo: '”', bdquo: '„',
  ndash: '–', mdash: '—', hellip: '…',
  middot: '·', bull: '•', deg: '°',
  eacute: 'é', egrave: 'è', agrave: 'à', ccedil: 'ç',
  uuml: 'ü', ouml: 'ö', auml: 'ä', ntilde: 'ñ',
  copy: '©', reg: '®', trade: '™',
  times: '×', laquo: '«', raquo: '»',
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body[0] === '#') {
      const isHex = body[1] === 'x' || body[1] === 'X';
      const code = parseInt(isHex ? body.slice(2) : body.slice(1), isHex ? 16 : 10);
      // Skip anything that isn't a sane codepoint rather than emitting U+FFFD.
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return whole;
      return String.fromCodePoint(code);
    }
    const hit = NAMED[body.toLowerCase()];
    return hit ?? whole; // unknown name: leave exactly as found
  });
}

const ENTITY = /&(?:[a-zA-Z]+|#x?[0-9a-fA-F]+);/;

async function fetchAll() {
  const PAGE = 1000;
  const all: any[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('places')
      .select('slug,name,description,blurb_ai')
      .order('slug')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    all.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return all;
}

async function main() {
  console.log(`Target: ${SUPABASE_URL}`);
  if (DRY_RUN) console.log('(dry run — nothing will be written)\n');

  const rows = await fetchAll();
  const updates: { slug: string; description?: string; blurb_ai?: string }[] = [];

  for (const r of rows) {
    const patch: any = {};
    for (const field of ['description', 'blurb_ai'] as const) {
      const before = r[field];
      if (typeof before !== 'string' || !ENTITY.test(before)) continue;
      const after = decodeEntities(before);
      if (after !== before) patch[field] = after;
    }
    if (Object.keys(patch).length) updates.push({ slug: r.slug, ...patch });
  }

  console.log(`Scanned ${rows.length} places, ${updates.length} need decoding.\n`);
  for (const u of updates.slice(0, 8)) {
    const f = u.description !== undefined ? 'description' : 'blurb_ai';
    console.log(`  ${u.slug}`);
    console.log(`    → ${String((u as any)[f]).slice(0, 96)}…`);
  }
  if (updates.length > 8) console.log(`  … and ${updates.length - 8} more`);

  if (DRY_RUN || !updates.length) {
    console.log(DRY_RUN ? '\nDry run complete.' : '\nNothing to do.');
    return;
  }

  console.log('\nWriting…');
  let done = 0;
  for (const u of updates) {
    const { slug, ...patch } = u;
    const { error } = await supabase.from('places').update(patch).eq('slug', slug);
    if (error) throw error;
    done++;
    if (done % 25 === 0 || done === updates.length) console.log(`  ✓ ${done}/${updates.length}`);
  }
  console.log('\nDone.');
}

main().catch((e) => {
  console.error('\nFailed:', e.message ?? e);
  process.exit(1);
});
