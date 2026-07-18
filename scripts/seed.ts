// One-off seed script — loads PLACES/THEMES/POSTS/BUDDIES into Supabase.
// Run with: npm run seed
// Requires SUPABASE_SERVICE_ROLE_KEY (never ship this key in the app) and
// EXPO_PUBLIC_SUPABASE_URL in mobile/.env.
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { PLACES, THEMES } from '../data/seed';
import { POSTS, BUDDIES } from '../data/content';
import { Theme } from '../data/types';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in mobile/.env');
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function seedPlaces() {
  const rows = PLACES.map((p) => ({
    slug: p.slug,
    name: p.name,
    name_ko: p.nameKo,
    category: p.category,
    neighborhood: p.neighborhood,
    city: p.city,
    address: p.address,
    hours: p.hours,
    price_range: p.priceRange,
    rating: p.rating,
    reviews: p.reviews,
    description: p.description,
    lat: p.lat,
    lng: p.lng,
    swatch: p.swatch,
    solo_ok: p.soloOk,
    english_menu: p.englishMenu,
    price_transparent: p.priceTransparent,
    card_ok: p.cardOk,
    english_spoken: p.englishSpoken,
    votes: p.votes,
    warn_tip: p.warnTip ?? null,
    k_content_title: p.kContentTitle,
    k_content_type: p.kContentType,
    k_content_note: p.kContentNote,
  }));
  const { error } = await supabase.from('places').upsert(rows, { onConflict: 'slug' });
  if (error) throw error;
  console.log(`✓ places: ${rows.length}`);
}

async function seedThemes() {
  const rows = THEMES.map((t) => {
    const { slug, kind, category, title, ...rest } = t as Theme;
    return { slug, kind, category, title, data: rest };
  });
  const { error } = await supabase.from('themes').upsert(rows, { onConflict: 'slug' });
  if (error) throw error;
  console.log(`✓ themes: ${rows.length}`);
}

async function seedPosts() {
  const rows = POSTS.map((p) => ({
    slug: p.slug,
    type: p.type, // post | route | question
    title: p.title,
    body: p.body,
    neighborhood: p.neighborhood,
    place_slug: p.placeSlug ?? null,
    author_id: null,
    author_name: p.author.name,
    author_country: p.author.country,
    route_days: p.routeDays ?? null,
    vote_count: p.votes,
    comment_count: p.commentList.length,
  }));
  const { error } = await supabase.from('posts').upsert(rows, { onConflict: 'slug' });
  if (error) throw error;
  console.log(`✓ posts: ${rows.length}`);

  // seed comments for each post (only if that post currently has none, to stay idempotent)
  const { data: postRows } = await supabase.from('posts').select('id, slug');
  const idBySlug = Object.fromEntries((postRows ?? []).map((r: any) => [r.slug, r.id]));
  for (const p of POSTS) {
    if (!p.commentList.length) continue;
    const postId = idBySlug[p.slug];
    if (!postId) continue;
    const { count } = await supabase.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', postId);
    if (count && count > 0) continue;
    const commentRows = p.commentList.map((c) => ({
      post_id: postId,
      author_id: null,
      author_name: c.name,
      author_country: c.country,
      body: c.body,
    }));
    const { error } = await supabase.from('comments').insert(commentRows);
    if (error) throw error;
  }
  console.log('✓ comments seeded for posts that had none');
}

async function seedBuddies() {
  const { count } = await supabase.from('buddies').select('*', { count: 'exact', head: true });
  if (count && count > 0) {
    console.log('… buddies already seeded, skipping');
    return;
  }
  const rows = BUDDIES.map((b) => ({
    activity: b.activity,
    emoji: b.emoji,
    author_id: null,
    author_name: b.author.name,
    author_country: b.author.country,
    neighborhood: b.neighborhood,
    place_slug: b.placeSlug ?? null,
    when_text: b.when,
    group_size: b.groupSize,
    note: b.note,
    interested_count: b.interested,
  }));
  const { error } = await supabase.from('buddies').insert(rows);
  if (error) throw error;
  console.log(`✓ buddies: ${rows.length}`);
  // Note: seed interestedList entries are NOT written to buddy_interests —
  // that table's primary key requires a real user_id (FK to profiles/auth.users),
  // which demo authors don't have. The "interested" count above still shows
  // correctly (it's a plain column); the per-person list simply starts empty
  // and fills in as real signed-in users tap "I'm interested".
}

async function main() {
  console.log('Seeding Supabase from mobile/data …\n');
  await seedPlaces();
  await seedThemes();
  await seedPosts();
  await seedBuddies();
  console.log('\nDone. Restart the app — Explore/Themes/Feed/Buddy will now load live data.');
}

main().catch((e) => {
  console.error('Seed failed:', e.message ?? e);
  process.exit(1);
});
