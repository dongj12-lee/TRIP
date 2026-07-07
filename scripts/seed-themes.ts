// Upserts the canonical THEMES (data/seed.ts) into the Supabase `themes` table.
// THEMES is the single source of truth (also the offline fallback); this pushes
// it to the DB the live app reads. Run after editing themes:
//   npm run seed:themes
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { THEMES } from '../data/seed';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in mobile/.env');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  const rows = THEMES.map((t) => {
    const { slug, kind, category, title, ...data } = t;
    return { slug, kind, category, title, data };
  });
  console.log(`Upserting ${rows.length} themes…`);
  const { error } = await supabase.from('themes').upsert(rows, { onConflict: 'slug' });
  if (error) throw error;

  // Remove any DB themes no longer in the canonical list (e.g. retired ones).
  const slugs = rows.map((r) => r.slug);
  const { data: existing } = await supabase.from('themes').select('slug');
  const stale = (existing ?? []).map((r: any) => r.slug).filter((s: string) => !slugs.includes(s));
  if (stale.length) {
    await supabase.from('themes').delete().in('slug', stale);
    console.log(`Removed ${stale.length} stale themes: ${stale.join(', ')}`);
  }
  console.log('Done — themes in DB:', rows.length);
}

main().catch((e) => {
  console.error('\nSeed failed:', e?.message ?? e);
  process.exit(1);
});
