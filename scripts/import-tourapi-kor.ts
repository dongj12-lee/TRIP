// Step 2 of the Korean TourAPI expansion (see scripts/fetch-tourapi-kor.ts for
// step 1). Merges the fetched/deduped/categorized Korean todo data with
// Claude's own name+description translations (no MT API — see project memory)
// and upserts the result into the `places` table.
//
// Two input files, both written to mobile/ root by fetch-tourapi-kor.ts and
// the translation pass:
//   ./scratch-tourapi-kor-todo.json          TodoPlace[] (Korean source data)
//   ./scratch-tourapi-kor-translations.json  { [slug]: { name, description } }
//
// `address` (shown to users everywhere, unconditionally — see app/place/
// [slug].tsx and app/(tabs)/index.tsx) has no native English form for a
// Korean-only source, unlike scripts/import-visitseoul.ts which gets English
// addresses straight from the API. Rather than leave Korean script in a field
// every screen renders unconditionally, this file mechanically romanizes the
// Korean road address (standard per-syllable Revised Romanization, no MT) for
// `address`, and keeps the authentic Hangul in `address_ko` — which is exactly
// what migration-026 built address_ko for (the phrase-sheet "show this to a
// taxi driver" toggle; nullable, already tolerated when absent). The
// romanization is intentionally simple (no cross-syllable consonant
// assimilation) — it won't always be phonetically perfect (e.g. "Baekak"
// rather than the assimilated "Baegak"), but it's a legible, standard-shaped
// English address, and address_ko carries the ground truth for anything that
// actually needs to be correct.
//
// Run with: npx tsx scripts/import-tourapi-kor.ts [--dry-run]
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.argv.includes('--dry-run');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in mobile/.env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const TODO_PATH = './scratch-tourapi-kor-todo.json';
const TRANSLATIONS_PATH = './scratch-tourapi-kor-translations.json';

type TodoPlace = {
  slug: string;
  nameKo: string;
  descriptionKo: string;
  category: string;
  categoryL2?: string;
  neighborhood: string;
  city: string;
  address: string; // Korean road address, as fetched
  lat: number;
  lng: number;
  swatch: [string, string];
  photoUrl?: string;
};

type Translation = { name: string; description: string };

// --- Minimal Revised-Romanization-of-Korean transliterator ------------------
// Standard Hangul syllable decomposition: code = (L*21 + V)*28 + T + 0xAC00.
const INITIALS = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'];
const MEDIALS = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'];
const FINALS = ['', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'k', 'm', 'l', 'l', 'l', 'p', 'l', 'm', 'p', 'p', 't', 't', 'ng', 't', 't', 'k', 't', 'p', 't'];
// Admin-unit suffix syllables get a hyphen before them, per convention
// (e.g. 종로구 -> "Jongno-gu", 사직로 -> "Sajik-ro").
const ADMIN_SUFFIXES = new Set(['시', '도', '구', '군', '읍', '면', '동', '리', '로', '길', '가']);

function romanizeSyllable(ch: string): string | null {
  const code = ch.codePointAt(0)!;
  if (code < 0xac00 || code > 0xd7a3) return null;
  const sIndex = code - 0xac00;
  const l = Math.floor(sIndex / (21 * 28));
  const v = Math.floor((sIndex % (21 * 28)) / 28);
  const t = sIndex % 28;
  return INITIALS[l] + MEDIALS[v] + FINALS[t];
}

function romanizeToken(token: string): string {
  const chars = [...token];
  const isHangul = (c: string) => {
    const code = c.codePointAt(0)!;
    return code >= 0xac00 && code <= 0xd7a3;
  };
  if (!chars.some(isHangul)) return token; // numbers, punctuation, parens — leave as-is

  let out = '';
  let i = 0;
  while (i < chars.length) {
    const c = chars[i];
    if (!isHangul(c)) {
      out += c;
      i++;
      continue;
    }
    // Consume a run of hangul syllables, hyphenating before a trailing
    // admin-unit suffix syllable if this run ends right before a non-hangul
    // char or the token end (i.e. it's the last hangul run in this token).
    let run = '';
    const runStart = i;
    while (i < chars.length && isHangul(chars[i])) {
      run += romanizeSyllable(chars[i]);
      i++;
    }
    const lastRunChar = chars[i - 1];
    const atTokenEnd = i >= chars.length || !isHangul(chars[i]);
    if (atTokenEnd && run.length > 0 && ADMIN_SUFFIXES.has(lastRunChar) && i - 1 > runStart) {
      const suffixLen = romanizeSyllable(lastRunChar)!.length;
      run = run.slice(0, run.length - suffixLen) + '-' + run.slice(run.length - suffixLen);
    }
    out += run;
  }
  return out;
}

function capitalize(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

function romanizeAddress(addrKo: string): string {
  const withoutCity = addrKo.replace(/^서울특별시\s*/, '');
  const tokens = withoutCity.split(/(\s+|\(|\))/).filter((t) => t.length > 0);
  const romanized = tokens
    .map((t) => {
      if (/^\s+$/.test(t) || t === '(' || t === ')') return t;
      return capitalize(romanizeToken(t));
    })
    .join('');
  return `Seoul, ${romanized}`.trim();
}

function main() {
  const todo: TodoPlace[] = JSON.parse(readFileSync(TODO_PATH, 'utf8'));
  const translations: Record<string, Translation> = JSON.parse(readFileSync(TRANSLATIONS_PATH, 'utf8'));

  console.log(`Loaded ${todo.length} todo places, ${Object.keys(translations).length} translations.`);

  const missing = todo.filter((p) => !translations[p.slug]);
  if (missing.length > 0) {
    console.error(`Missing translations for ${missing.length} places:`);
    missing.slice(0, 20).forEach((p) => console.error(`  ${p.slug}`));
    process.exit(1);
  }

  const dbRows = todo.map((p) => {
    const tr = translations[p.slug];
    return {
      slug: p.slug,
      name: tr.name,
      name_ko: p.nameKo,
      category: p.category,
      category_l2: p.categoryL2 ?? null,
      neighborhood: p.neighborhood,
      city: p.city,
      address: romanizeAddress(p.address),
      address_ko: p.address,
      hours: '',
      price_range: '',
      description: tr.description || '',
      lat: p.lat,
      lng: p.lng,
      swatch: p.swatch,
      solo_ok: false,
      english_menu: false,
      price_transparent: false,
      card_ok: false,
      english_spoken: false,
      votes: {},
      photo_url: p.photoUrl ?? null,
      source: 'tourapi_kor',
    };
  });

  console.log('\nSample rows:');
  for (const r of dbRows.slice(0, 3)) {
    console.log(`  ${r.slug}`);
    console.log(`    name: ${r.name}`);
    console.log(`    address: ${r.address}`);
    console.log(`    address_ko: ${r.address_ko}`);
  }

  if (DRY_RUN) {
    console.log(`\n[dry-run] Would upsert ${dbRows.length} rows. No DB writes made.`);
    return;
  }

  upsertAll(dbRows).catch((e) => {
    console.error('\nImport failed:', e.message ?? e);
    process.exit(1);
  });
}

async function upsertAll(dbRows: Record<string, unknown>[]) {
  console.log(`\nUpserting ${dbRows.length} places into Supabase…`);
  const CHUNK = 100;
  for (let i = 0; i < dbRows.length; i += CHUNK) {
    const chunk = dbRows.slice(i, i + CHUNK);
    const { error } = await supabase.from('places').upsert(chunk, { onConflict: 'slug' });
    if (error) throw error;
    console.log(`  ✓ ${Math.min(i + CHUNK, dbRows.length)}/${dbRows.length}`);
  }
  console.log('\nDone.');
}

main();
