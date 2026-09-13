// One-off pre-release content cleanup for the feed (dev or production —
// point it at either by which .env file is loaded).
//
// Two things look wrong to a first-time user (and to an App Store reviewer):
//   1. Leftover development test routes ("My 3 Days in Seoul — feedback
//      welcome") sit in the feed, posted by dev/test accounts while manually
//      exercising the share flow. remote.createPost appends a random slug
//      suffix per share (buildRoutePost's own slug is a constant, data/
//      index.ts), so repeated testing leaves one row per attempt, each with
//      a different slug — matched here by the literal title text every one
//      of them shares instead of one hardcoded slug, which only ever caught
//      the single row that happened to still have that exact suffix.
//   2. Four seeded posts are authored by "You", which reads as though the
//      reader wrote them. They now belong to named travellers, matching
//      data/content.ts.
//
// Run once against production:
//   DOTENV_CONFIG_PATH=.env.production npx tsx scripts/prerelease-cleanup.ts
// Add --dry to preview without writing.
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const DRY = process.argv.includes('--dry');
const db = createClient(URL, KEY);

// Seeded rows are author_id NULL; anything with an author_id was posted through
// the app. Only rows with this exact literal title are removed — it's
// buildRoutePost's fixed template output (data/index.ts), not something a
// real traveller would type verbatim, so matching on it never risks a real
// user's post regardless of which random slug suffix that row got.
const TEST_TITLE = 'My 3 Days in Seoul — feedback welcome 🙏';

// Accounts created only to verify sign-up works. Matched by email prefix so
// re-running the check later still cleans up after itself.
const TEST_EMAIL_PREFIX = 'bada.release.check.';

const RENAMES: [slug: string, name: string, country: string][] = [
  ['my-first-seoul-route', 'Noah', '🇦🇺'],
  ['order-budae-jjigae-solo', 'Tom', '🇬🇧'],
  ['best-solo-naengmyeon', 'Elif', '🇹🇷'],
  ['cheap-eats-seoul-station', 'Kai', '🇸🇬'],
];

(async () => {
  console.log(`target: ${URL}${DRY ? '  (dry run)' : ''}\n`);

  // Safety: show every post that came through the app, so a real user's post is
  // never deleted by accident.
  const { data: authored, error: e1 } = await db
    .from('posts')
    .select('id,slug,title,author_id,created_at')
    .not('author_id', 'is', null);
  if (e1) throw e1;
  console.log(`posts with an author_id: ${authored?.length ?? 0}`);
  authored?.forEach((p) => console.log(`  ${p.slug}  (${p.created_at?.slice(0, 10)})`));

  const targets = authored?.filter((p) => p.title === TEST_TITLE) ?? [];
  if (!targets.length) {
    console.log('\n· no test routes found (already removed)');
  } else if (DRY) {
    targets.forEach((t) => console.log(`\n· would delete: ${t.slug}`));
  } else {
    const { error } = await db.from('posts').delete().in('id', targets.map((t) => t.id));
    if (error) throw error;
    targets.forEach((t) => console.log(`\n· deleted test route: ${t.slug}`));
  }

  for (const [slug, name, country] of RENAMES) {
    if (DRY) {
      console.log(`· would rename ${slug} -> ${name} ${country}`);
      continue;
    }
    const { error } = await db
      .from('posts')
      .update({ author_name: name, author_country: country })
      .eq('slug', slug)
      .is('author_id', null); // only seeded rows
    if (error) throw error;
    console.log(`· renamed ${slug} -> ${name} ${country}`);
  }

  // Remove the throwaway accounts used to verify sign-up.
  const { data: users, error: e2 } = await db.auth.admin.listUsers({ perPage: 200 });
  if (e2) {
    console.log(`\n· could not list users: ${e2.message}`);
  } else {
    const throwaway = users.users.filter((u) => (u.email ?? '').startsWith(TEST_EMAIL_PREFIX));
    if (!throwaway.length) console.log('\n· no sign-up test accounts to remove');
    for (const u of throwaway) {
      if (DRY) { console.log(`\n· would delete test account: ${u.email}`); continue; }
      const { error } = await db.auth.admin.deleteUser(u.id);
      console.log(error ? `· failed to delete ${u.email}: ${error.message}` : `· deleted test account: ${u.email}`);
    }
  }

  console.log('\ndone.');
})();
