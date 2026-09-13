// Fetches poster artwork for the productions in the `filming-locations` theme
// and patches the URLs into data/seed.ts.
//
//   TMDB_API_KEY=... npx tsx scripts/fetch-posters.ts [--dry-run]
//
// WHY TMDB AND NOT A WEB IMAGE
// Posters are copyrighted, and so is a redrawn/"illustrated" version of one —
// that is a derivative work, and the actors' likenesses carry a separate right
// (초상권) in Korea. TMDB is the one source whose terms actually permit an app
// to display this artwork, and it comes with obligations:
//
//   1. Attribution. The app must show the TMDB logo and the exact line
//      "This product uses the TMDB API but is not endorsed or certified by
//      TMDB" in an About/Credits section. See app/settings.tsx.
//   2. Non-commercial only. BADA takes no payments today, so it qualifies.
//      The moment it earns revenue, TMDB requires a separate written
//      agreement — this script is not a licence.
//
// Hotlinking posters found by web search is worse on both counts: no licence
// at all, and the URLs rot or get hotlink-blocked.
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

const KEY = process.env.TMDB_API_KEY;
if (!KEY) {
  console.error(
    'Missing TMDB_API_KEY.\n' +
      'Get one free at https://www.themoviedb.org/settings/api (choose "Developer"),\n' +
      'then run:  TMDB_API_KEY=xxx npx tsx scripts/fetch-posters.ts --dry-run',
  );
  process.exit(1);
}

const dryRun = process.argv.includes('--dry-run');
// w500 is the smallest poster size that still looks sharp in a 76px row on a
// 3x screen, without shipping 2MB per card.
const IMG_BASE = 'https://image.tmdb.org/t/p/w500';

/**
 * The production cards in the theme, keyed by the `name` used in data/seed.ts
 * so the patch step can find each row. `kind` disambiguates searches — several
 * of these share a title with an unrelated film.
 * Landmark cards (Cheonggyecheon, Lotte World, DDP, Ikseon-dong, the sageuk
 * palaces, and the "sets are not locations" card) are deliberately absent:
 * they are not one production, and their location photo is the right image.
 */
const TITLES: { name: string; query: string; kind: 'tv' | 'movie'; year?: number }[] = [
  { name: 'KPop Demon Hunters', query: 'KPop Demon Hunters', kind: 'movie', year: 2025 },
  { name: 'Parasite', query: 'Parasite', kind: 'movie', year: 2019 },
  { name: 'Squid Game', query: 'Squid Game', kind: 'tv', year: 2021 },
  { name: 'Reply 1988', query: 'Reply 1988', kind: 'tv', year: 2015 },
  { name: 'Itaewon Class', query: 'Itaewon Class', kind: 'tv', year: 2020 },
  { name: 'Vincenzo', query: 'Vincenzo', kind: 'tv', year: 2021 },
  { name: 'Our Beloved Summer', query: 'Our Beloved Summer', kind: 'tv', year: 2021 },
  { name: 'Lovely Runner', query: 'Lovely Runner', kind: 'tv', year: 2024 },
  { name: 'Queen of Tears', query: 'Queen of Tears', kind: 'tv', year: 2024 },
  { name: 'Goblin', query: 'Guardian: The Lonely and Great God', kind: 'tv', year: 2016 },
  { name: 'My Love from the Star', query: 'My Love from the Star', kind: 'tv', year: 2013 },
  { name: 'All of Us Are Dead', query: 'All of Us Are Dead', kind: 'tv', year: 2022 },
  { name: 'Mr. Sunshine', query: 'Mr. Sunshine', kind: 'tv', year: 2018 },
  { name: 'The Glory', query: 'The Glory', kind: 'tv', year: 2022 },
  { name: 'Descendants of the Sun', query: 'Descendants of the Sun', kind: 'tv', year: 2016 },
  { name: 'Extraordinary Attorney Woo', query: 'Extraordinary Attorney Woo', kind: 'tv', year: 2022 },
  { name: 'Crash Landing on You', query: 'Crash Landing on You', kind: 'tv', year: 2019 },
  { name: 'Twenty-Five Twenty-One', query: 'Twenty-Five Twenty-One', kind: 'tv', year: 2022 },
];

const yearOf = (r: any) => Number((r.release_date || r.first_air_date || '').slice(0, 4));

async function findPoster(t: (typeof TITLES)[number]): Promise<{ url: string; matched: string } | null> {
  const url =
    `https://api.themoviedb.org/3/search/${t.kind}?api_key=${KEY}` +
    `&query=${encodeURIComponent(t.query)}&include_adult=false`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB ${res.status} for "${t.query}"`);
  const results: any[] = (await res.json()).results ?? [];
  if (!results.length) return null;

  // Prefer an exact year match — "The Glory" and "Parasite" both collide with
  // other productions, and TMDB's relevance ordering does not always win.
  const pick =
    (t.year && results.find((r) => yearOf(r) === t.year && r.poster_path)) ||
    results.find((r) => r.poster_path);
  if (!pick?.poster_path) return null;
  return {
    url: `${IMG_BASE}${pick.poster_path}`,
    matched: `${pick.name ?? pick.title} (${yearOf(pick) || '?'})`,
  };
}

async function main() {
  const seedPath = path.join(process.cwd(), 'data', 'seed.ts');
  let seed = fs.readFileSync(seedPath, 'utf8');
  let patched = 0;
  const misses: string[] = [];

  for (const t of TITLES) {
    let hit: Awaited<ReturnType<typeof findPoster>> = null;
    try {
      hit = await findPoster(t);
    } catch (e) {
      console.warn(`  ${t.name}: ${(e as Error).message}`);
    }
    if (!hit) {
      misses.push(t.name);
      console.log(`  ✗ ${t.name.padEnd(30)} no poster`);
      continue;
    }
    console.log(`  ✓ ${t.name.padEnd(30)} ${hit.matched}`);

    // Replace this card's existing photoUrl/leave-alone with the poster. The
    // card is found by its `name:` field, and only the first photoUrl after it
    // (i.e. its own) is touched.
    const at = seed.indexOf(`{ name: '${t.name}'`);
    if (at === -1) {
      misses.push(`${t.name} (not found in seed.ts)`);
      continue;
    }
    const rowEnd = seed.indexOf("{ name: '", at + 5);
    const row = seed.slice(at, rowEnd === -1 ? undefined : rowEnd);
    const replaced = /photoUrl: [^,]+,/.test(row)
      ? row.replace(/photoUrl: [^,]+,/, `photoUrl: '${hit.url}',`)
      : row.replace(/(tag: '[^']*', price: '[^']*',)/, `$1 photoUrl: '${hit.url}',`);
    if (replaced === row) {
      misses.push(`${t.name} (no insertion point)`);
      continue;
    }
    seed = seed.slice(0, at) + replaced + seed.slice(at + row.length);
    patched++;
    await new Promise((r) => setTimeout(r, 120)); // be polite to the API
  }

  if (!dryRun) fs.writeFileSync(seedPath, seed);
  console.log(`\nPatched ${patched}/${TITLES.length}${dryRun ? ' (dry run — nothing written)' : ''}`);
  if (misses.length) console.log('Unresolved:', misses.join(', '));
  console.log(
    '\nReminder: TMDB requires the attribution line and logo in the app’s Credits,\n' +
      'and a separate written agreement if BADA ever becomes commercial.',
  );
}

main().catch((e) => {
  console.error('\nfetch-posters failed:', e?.message ?? e);
  process.exit(1);
});
