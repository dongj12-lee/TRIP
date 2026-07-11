// Supabase-backed reads/writes, mapped to the app's existing camelCase types
// (see data/types.ts). Every function here is safe to call only when
// isSupabaseConfigured — callers should check that first (see lib/remoteData.tsx).
import { supabase } from '@/lib/supabase';
import { Buddy, BuddyInterest, BuddyMessage, Comment, ForeignerTagKey, Place, Post, PostType, Profile, Theme } from './types';

// Turn a raw Supabase/Postgres error into a short user-facing message. The
// server-side rate-limit triggers (migration-015) raise a "rate limit: …"
// message; surface that as a calm nudge rather than a scary error.
export function friendlyError(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const msg = (error as { message?: string })?.message ?? '';
  if (/rate limit/i.test(msg)) return "You're doing that a bit too fast — take a breather and try again.";
  return fallback;
}

// ─────────────────────────── Profile ───────────────────────────
export async function fetchProfile(userId: string): Promise<Partial<Profile> | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('display_name, handle, country, interests, points, avatar_url')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    displayName: data.display_name ?? undefined,
    handle: data.handle ?? undefined,
    country: data.country ?? null,
    interests: data.interests ?? [],
    points: data.points ?? 0,
    avatarUrl: data.avatar_url ?? undefined,
  };
}

export async function updateProfile(fields: { displayName?: string; handle?: string; country?: string | null; interests?: string[]; avatarUrl?: string | null }) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const row: Record<string, unknown> = {};
  if (fields.displayName !== undefined) row.display_name = fields.displayName;
  if (fields.handle !== undefined) row.handle = fields.handle;
  if (fields.country !== undefined) row.country = fields.country;
  if (fields.interests !== undefined) row.interests = fields.interests;
  if (fields.avatarUrl !== undefined) row.avatar_url = fields.avatarUrl;
  const { error } = await supabase.from('profiles').update(row).eq('id', user.id);
  if (error) throw error;
}

// ─────────────────────────── Passport leaderboard ───────────────────────────
export type LeaderRow = {
  id: string;
  name: string;
  country: string | null;
  stamps: number;
  districts: number;
};

// Mirror the passport totals onto the user's public profile (migration-019).
export async function syncPassport(stampCount: number, districtCount: number) {
  const userId = await currentUserId();
  await supabase.from('profiles').update({ stamp_count: stampCount, district_count: districtCount }).eq('id', userId);
}

export async function fetchLeaderboard(limit = 50): Promise<LeaderRow[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, handle, country, stamp_count, district_count')
    .eq('banned', false)
    .gt('stamp_count', 0)
    .order('stamp_count', { ascending: false })
    .order('district_count', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    name: (r.display_name as string) || (r.handle ? `@${r.handle}` : 'Traveler'),
    country: (r.country as string) ?? null,
    stamps: (r.stamp_count as number) ?? 0,
    districts: (r.district_count as number) ?? 0,
  }));
}

// The signed-in user's rank + the total number of ranked travelers.
export async function fetchMyRank(): Promise<{ rank: number; total: number } | null> {
  const [{ data: rank, error: e1 }, { data: total, error: e2 }] = await Promise.all([
    supabase.rpc('my_passport_rank'),
    supabase.rpc('passport_player_count'),
  ]);
  if (e1 || e2) return null;
  return { rank: (rank as number) ?? 0, total: (total as number) ?? 0 };
}

// ─────────────────────────── Friends (migration-020) ───────────────────────────
const mapLeaderRow = (r: Record<string, unknown>): LeaderRow => ({
  id: r.id as string,
  name: (r.display_name as string) || (r.handle ? `@${r.handle}` : 'Traveler'),
  country: (r.country as string) ?? null,
  stamps: (r.stamp_count as number) ?? 0,
  districts: (r.district_count as number) ?? 0,
});

// Look up a traveler by their exact @handle (public profile) so they can be added.
export async function findProfileByHandle(handle: string): Promise<LeaderRow | null> {
  const clean = handle.trim().replace(/^@/, '');
  if (!clean) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, handle, country, stamp_count, district_count')
    .eq('handle', clean)
    .maybeSingle();
  if (error || !data) return null;
  return mapLeaderRow(data);
}

export async function addFriend(friendId: string) {
  const userId = await currentUserId();
  const { error } = await supabase.from('friend_links').upsert({ user_id: userId, friend_id: friendId });
  if (error) throw error;
}

export async function removeFriend(friendId: string) {
  const userId = await currentUserId();
  await supabase.from('friend_links').delete().eq('user_id', userId).eq('friend_id', friendId);
}

// The current user's friends (their public passport counts), for the Friends board.
export async function fetchFriends(): Promise<LeaderRow[]> {
  const userId = await currentUserId();
  const { data: links, error } = await supabase.from('friend_links').select('friend_id').eq('user_id', userId);
  if (error || !links?.length) return [];
  const ids = links.map((l: { friend_id: string }) => l.friend_id);
  const { data, error: e2 } = await supabase
    .from('profiles')
    .select('id, display_name, handle, country, stamp_count, district_count')
    .in('id', ids);
  if (e2 || !data) return [];
  return data.map(mapLeaderRow);
}

// The current user's own leaderboard row (to include "you" in the friends board).
export async function fetchMyLeaderRow(): Promise<LeaderRow | null> {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, handle, country, stamp_count, district_count')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return mapLeaderRow(data);
}

// Uploads a local image URI to a public bucket under the user's own uid prefix
// and returns its public URL. Bucket RLS (migrations 017/018) enforces that a
// user can only write under <bucket>/<their-uid>/. Shared by avatar + post
// photo uploads.
async function uploadImageTo(bucket: string, localUri: string): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const res = await fetch(localUri);
  const blob = await res.blob();
  const contentType = blob.type || 'image/jpeg';
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  // Timestamped filename busts CDN/Image caches so a new upload shows instantly.
  const path = `${user.id}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, blob, { contentType, upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export const uploadAvatar = (localUri: string) => uploadImageTo('avatars', localUri);
export const uploadPostImage = (localUri: string) => uploadImageTo('post-images', localUri);

// Count of a user's own non-removed posts (for the profile "Posts" stat).
export async function fetchMyPostCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('author_id', userId)
    .eq('removed', false);
  if (error) throw error;
  return count ?? 0;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return `${Math.floor(day / 7)}w ago`;
}

function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 60) +
    '-' +
    Math.random().toString(36).slice(2, 7)
  );
}

// ─────────────────────────── Places ───────────────────────────
function mapPlace(row: any): Place {
  return {
    slug: row.slug,
    lat: row.lat,
    lng: row.lng,
    name: row.name,
    nameKo: row.name_ko,
    category: row.category,
    categoryL2: row.category_l2 ?? undefined,
    categoryL3: row.category_l3 ?? undefined,
    neighborhood: row.neighborhood,
    city: row.city,
    address: row.address,
    hours: row.hours,
    priceRange: row.price_range,
    rating: row.rating != null ? Number(row.rating) : undefined,
    reviews: row.reviews ?? undefined,
    description: row.description,
    soloOk: row.solo_ok,
    englishMenu: row.english_menu,
    priceTransparent: row.price_transparent,
    cardOk: row.card_ok,
    englishSpoken: row.english_spoken,
    votes: row.votes as Partial<Record<ForeignerTagKey, { yes: number; no: number }>>,
    warnTip: row.warn_tip ?? undefined,
    kContentTitle: row.k_content_title ?? undefined,
    kContentType: row.k_content_type ?? undefined,
    kContentNote: row.k_content_note ?? undefined,
    swatch: row.swatch,
    photoUrl: row.photo_url ?? undefined,
    subway: row.subway ?? undefined,
    freeEntry: row.free_entry ?? undefined,
    englishSite: row.english_site ?? undefined,
    wheelchair: row.wheelchair ?? undefined,
    likeCount: row.like_count ?? 0,
    dislikeCount: row.dislike_count ?? 0,
  };
}

// Columns needed to browse/filter/map — everything EXCEPT the heavy
// `description` (avg ~1KB/place). At 2,300+ places, shipping descriptions in
// the list query would add megabytes; the place detail screen lazy-loads the
// full record instead (see fetchPlace).
const BROWSE_COLS =
  'slug,lat,lng,name,name_ko,category,category_l2,category_l3,neighborhood,city,address,hours,' +
  'price_range,rating,reviews,solo_ok,english_menu,price_transparent,card_ok,english_spoken,votes,' +
  'warn_tip,k_content_title,k_content_type,k_content_note,swatch,photo_url,subway,free_entry,' +
  'english_site,wheelchair,like_count,dislike_count';

export async function fetchPlaces(): Promise<Place[]> {
  // PostgREST caps a single response at 1000 rows, so page through the whole
  // catalog (photos-first) to load every place, not an arbitrary slice.
  const PAGE = 1000;
  const all: any[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('places')
      .select(BROWSE_COLS)
      .order('photo_url', { nullsFirst: false })
      .order('name')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    all.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return all.map((row) => ({ ...mapPlace(row), description: '' }));
}

// Full single place incl. description — for the detail screen, which loads it
// lazily since the browse query omits description for payload size.
export async function fetchPlace(slug: string): Promise<Place | null> {
  const { data, error } = await supabase.from('places').select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return data ? mapPlace(data) : null;
}

// ─────────────────────────── Themes ───────────────────────────
function mapTheme(row: any): Theme {
  return { slug: row.slug, kind: row.kind, category: row.category, title: row.title, ...row.data };
}

export async function fetchThemes(): Promise<Theme[]> {
  const { data, error } = await supabase.from('themes').select('*');
  if (error) throw error;
  return (data ?? []).map(mapTheme);
}

// ─────────────────────────── Posts ───────────────────────────
function mapPost(row: any): Post {
  return {
    id: row.id,
    authorId: row.author_id,
    slug: row.slug,
    type: row.type as PostType,
    title: row.title ?? '',
    body: row.body,
    neighborhood: row.neighborhood,
    placeSlug: row.place_slug ?? undefined,
    author: { name: row.author_name, country: row.author_country || '🌐' },
    when: timeAgo(row.created_at),
    votes: row.vote_count,
    comments: row.comment_count,
    routeDays: row.route_days ?? undefined,
    imageUrl: row.image_url ?? undefined,
    commentList: [],
    feedbackCounts: row.feedback_counts ?? {},
  };
}

// The prompt keys the current user has already tapped on a given post.
export async function fetchMyRouteFeedback(postId: string): Promise<string[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('route_feedback')
    .select('prompt')
    .eq('post_id', postId)
    .eq('user_id', user.id);
  if (error) throw error;
  return (data ?? []).map((r: any) => r.prompt as string);
}

export async function toggleRouteFeedback(postId: string, prompt: string, on: boolean) {
  const userId = await currentUserId();
  if (on) await supabase.from('route_feedback').upsert({ post_id: postId, user_id: userId, prompt });
  else await supabase.from('route_feedback').delete().eq('post_id', postId).eq('user_id', userId).eq('prompt', prompt);
}

export async function fetchPosts(): Promise<Post[]> {
  const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapPost);
}

export async function fetchPostComments(postId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  const rows = data ?? [];

  // Which of these comments the current viewer has liked.
  let liked = new Set<string>();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user && rows.length) {
    const { data: likes } = await supabase
      .from('comment_likes')
      .select('comment_id')
      .eq('user_id', user.id)
      .in('comment_id', rows.map((r: any) => r.id));
    liked = new Set((likes ?? []).map((l: any) => l.comment_id as string));
  }

  return rows.map((row: any) => ({
    id: row.id,
    authorId: row.author_id,
    name: row.author_name,
    country: row.author_country || '🌐',
    body: row.body,
    when: timeAgo(row.created_at),
    parentId: row.parent_id ?? null,
    likeCount: row.like_count ?? 0,
    likedByMe: liked.has(row.id),
  }));
}

export async function addComment(
  postId: string,
  body: string,
  authorName: string,
  authorCountry: string | null,
  parentId?: string | null,
): Promise<Comment> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id: postId,
      author_id: user.id,
      author_name: authorName,
      author_country: authorCountry,
      body,
      parent_id: parentId ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return {
    id: data.id,
    authorId: data.author_id,
    name: data.author_name,
    country: data.author_country || '🌐',
    body: data.body,
    when: timeAgo(data.created_at),
    parentId: data.parent_id ?? null,
    likeCount: 0,
    likedByMe: false,
  };
}

export async function toggleCommentLike(commentId: string, on: boolean) {
  const userId = await currentUserId();
  if (on) await supabase.from('comment_likes').upsert({ user_id: userId, comment_id: commentId });
  else await supabase.from('comment_likes').delete().eq('user_id', userId).eq('comment_id', commentId);
}

export async function createPost(input: {
  type: PostType;
  title: string;
  body: string;
  neighborhood?: string;
  placeSlug?: string;
  routeDays?: Post['routeDays'];
  imageUrl?: string;
  authorName: string;
  authorCountry: string | null;
}): Promise<Post> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  // Casual "thought" posts have no title — derive a slug from the body instead.
  const slug = slugify(input.title || input.body.slice(0, 40) || 'post');
  const { data, error } = await supabase
    .from('posts')
    .insert({
      slug,
      type: input.type,
      title: input.title || null,
      body: input.body,
      neighborhood: input.neighborhood ?? null,
      place_slug: input.placeSlug ?? null,
      route_days: input.routeDays ?? null,
      image_url: input.imageUrl ?? null,
      author_id: user.id,
      author_name: input.authorName,
      author_country: input.authorCountry,
    })
    .select()
    .single();
  if (error) throw error;
  return mapPost(data);
}

// ─────────────────────────── Buddies ───────────────────────────
function mapBuddy(row: any): Buddy {
  return {
    id: row.id,
    authorId: row.author_id,
    activity: row.activity,
    emoji: row.emoji,
    author: { name: row.author_name, country: row.author_country || '🌐' },
    neighborhood: row.neighborhood,
    placeSlug: row.place_slug ?? undefined,
    when: row.when_text,
    groupSize: row.group_size,
    note: row.note,
    interested: row.interested_count,
    interestedList: [],
  };
}

export async function fetchBuddies(): Promise<Buddy[]> {
  const { data, error } = await supabase.from('buddies').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapBuddy);
}

export async function fetchBuddyInterests(buddyId: string): Promise<BuddyInterest[]> {
  const { data, error } = await supabase
    .from('buddy_interests')
    .select('*')
    .eq('buddy_id', buddyId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    userId: row.user_id,
    name: row.author_name || 'Traveler',
    country: row.author_country || '🌐',
    message: row.message || '',
    status: (row.status ?? 'pending') as BuddyInterest['status'],
  }));
}

// Host decision on a join request. RLS restricts this to the plan's host.
export async function setInterestStatus(buddyId: string, userId: string, status: 'accepted' | 'declined') {
  const { error } = await supabase
    .from('buddy_interests')
    .update({ status })
    .eq('buddy_id', buddyId)
    .eq('user_id', userId);
  if (error) throw error;
}

// ── Buddy group chat — participants only (host + accepted), enforced by RLS ──
function mapBuddyMessage(row: any): BuddyMessage {
  return {
    id: row.id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    senderCountry: row.sender_country || '🌐',
    body: row.body,
    when: timeAgo(row.created_at),
  };
}

export async function fetchBuddyMessages(buddyId: string): Promise<BuddyMessage[]> {
  const { data, error } = await supabase
    .from('buddy_messages')
    .select('*')
    .eq('buddy_id', buddyId)
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) throw error;
  return (data ?? []).map(mapBuddyMessage);
}

export async function sendBuddyMessage(buddyId: string, body: string, senderName: string, senderCountry: string | null): Promise<BuddyMessage> {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from('buddy_messages')
    .insert({ buddy_id: buddyId, sender_id: userId, sender_name: senderName, sender_country: senderCountry, body })
    .select()
    .single();
  if (error) throw error;
  return mapBuddyMessage(data);
}

export async function createBuddy(input: {
  activity: string;
  emoji: string;
  neighborhood?: string;
  placeSlug?: string;
  whenText: string;
  groupSize: number;
  note: string;
  authorName: string;
  authorCountry: string | null;
}): Promise<Buddy> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { data, error } = await supabase
    .from('buddies')
    .insert({
      activity: input.activity,
      emoji: input.emoji,
      neighborhood: input.neighborhood ?? null,
      place_slug: input.placeSlug ?? null,
      when_text: input.whenText,
      group_size: input.groupSize,
      note: input.note,
      author_id: user.id,
      author_name: input.authorName,
      author_country: input.authorCountry,
    })
    .select()
    .single();
  if (error) throw error;
  return mapBuddy(data);
}

// ───────────────── User relations (saves/votes/follows/joins) ─────────────────
async function currentUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  return user.id;
}

export async function setSaved(placeSlug: string, saved: boolean) {
  const userId = await currentUserId();
  if (saved) await supabase.from('saves').upsert({ user_id: userId, place_slug: placeSlug });
  else await supabase.from('saves').delete().eq('user_id', userId).eq('place_slug', placeSlug);
}

export async function setVoted(postId: string, voted: boolean) {
  const userId = await currentUserId();
  if (voted) await supabase.from('post_votes').upsert({ user_id: userId, post_id: postId });
  else await supabase.from('post_votes').delete().eq('user_id', userId).eq('post_id', postId);
}

export async function setJoined(
  buddyId: string,
  joined: boolean,
  opts?: { message?: string; authorName?: string; authorCountry?: string | null },
) {
  const userId = await currentUserId();
  if (joined) {
    await supabase.from('buddy_interests').upsert({
      buddy_id: buddyId,
      user_id: userId,
      message: opts?.message ?? '',
      author_name: opts?.authorName ?? 'Traveler',
      author_country: opts?.authorCountry ?? null,
    });
  } else {
    await supabase.from('buddy_interests').delete().eq('buddy_id', buddyId).eq('user_id', userId);
  }
}

export async function setFollowed(creatorId: string, followed: boolean) {
  const userId = await currentUserId();
  if (followed) await supabase.from('follows').upsert({ follower_id: userId, creator_id: creatorId });
  else await supabase.from('follows').delete().eq('follower_id', userId).eq('creator_id', creatorId);
}

// Per-user like/dislike on a place. Passing null clears it. A DB trigger keeps
// places.like_count / dislike_count in sync (see migration-006).
export async function setPlaceReaction(placeSlug: string, reaction: 'like' | 'dislike' | null) {
  const userId = await currentUserId();
  if (reaction) await supabase.from('place_reactions').upsert({ user_id: userId, place_slug: placeSlug, reaction });
  else await supabase.from('place_reactions').delete().eq('user_id', userId).eq('place_slug', placeSlug);
}

export async function fetchPlaceReactions(userId: string): Promise<Record<string, 'like' | 'dislike'>> {
  const { data, error } = await supabase.from('place_reactions').select('place_slug, reaction').eq('user_id', userId);
  if (error) throw error;
  const out: Record<string, 'like' | 'dislike'> = {};
  for (const r of data ?? []) out[r.place_slug as string] = r.reaction as 'like' | 'dislike';
  return out;
}

// Real per-user yes/no vote on a Foreigner Fit tag ("Solo OK", "English
// spoken", …). Passing null clears the vote. A DB trigger keeps places.votes
// ({ yes, no } per tag) and the matching boolean column (has = yes > no) in
// sync (see migration-007/008) — this was previously a read-only display with
// no way for a traveler to actually verify or dispute anything.
export async function setPlaceTagVote(placeSlug: string, tagKey: ForeignerTagKey, vote: 'yes' | 'no' | null) {
  const userId = await currentUserId();
  if (vote) await supabase.from('place_tag_votes').upsert({ user_id: userId, place_slug: placeSlug, tag_key: tagKey, vote });
  else await supabase.from('place_tag_votes').delete().eq('user_id', userId).eq('place_slug', placeSlug).eq('tag_key', tagKey);
}

export async function fetchMyPlaceTagVotes(userId: string): Promise<Record<string, 'yes' | 'no'>> {
  const { data, error } = await supabase.from('place_tag_votes').select('place_slug, tag_key, vote').eq('user_id', userId);
  if (error) throw error;
  const out: Record<string, 'yes' | 'no'> = {};
  for (const r of data ?? []) out[`${r.place_slug}:${r.tag_key}`] = r.vote as 'yes' | 'no';
  return out;
}

export async function fetchUserRelations(userId: string) {
  const [saves, votes, joins, follows] = await Promise.all([
    supabase.from('saves').select('place_slug').eq('user_id', userId),
    supabase.from('post_votes').select('post_id').eq('user_id', userId),
    supabase.from('buddy_interests').select('buddy_id').eq('user_id', userId),
    supabase.from('follows').select('creator_id').eq('follower_id', userId),
  ]);
  return {
    saved: (saves.data ?? []).map((r: any) => r.place_slug as string),
    voted: (votes.data ?? []).map((r: any) => r.post_id as string),
    joined: (joins.data ?? []).map((r: any) => r.buddy_id as string),
    following: (follows.data ?? []).map((r: any) => r.creator_id as string),
  };
}

// ─────────────────────────── Itinerary ───────────────────────────
export async function fetchItinerary(userId: string) {
  const { data, error } = await supabase.from('itineraries').select('data').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data?.data ?? null;
}

export async function saveItinerary(userId: string, itinerary: unknown) {
  const { error } = await supabase.from('itineraries').upsert({ user_id: userId, data: itinerary, updated_at: new Date().toISOString() });
  if (error) throw error;
}

// ─────────────────────────── Moderation ───────────────────────────
export async function fileReport(targetType: 'post' | 'comment' | 'buddy' | 'profile', targetId: string, reason: string) {
  const userId = await currentUserId();
  const { error } = await supabase.from('reports').insert({ reporter_id: userId, target_type: targetType, target_id: targetId, reason });
  if (error) throw error;
}

export async function setBlocked(blockedId: string, blocked: boolean) {
  const userId = await currentUserId();
  if (blocked) await supabase.from('blocks').upsert({ blocker_id: userId, blocked_id: blockedId });
  else await supabase.from('blocks').delete().eq('blocker_id', userId).eq('blocked_id', blockedId);
}

// ─────────────────────────── Admin moderation ───────────────────────────
// All gated server-side by is_admin() (migration-016); a non-admin just gets an
// error. Safe to call from the client — the RPCs are the security boundary.
export type ReportRow = {
  reportId: string;
  targetType: 'post' | 'comment' | 'buddy' | 'profile';
  targetId: string;
  reason: string | null;
  reportedAt: string;
  reporterName: string | null;
  preview: string | null;
  author: string | null;
  removed: boolean;
};

export async function isAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin');
  if (error) return false;
  return data === true;
}

export async function adminListReports(): Promise<ReportRow[]> {
  const { data, error } = await supabase.rpc('admin_list_reports');
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    reportId: r.report_id as string,
    targetType: r.target_type as ReportRow['targetType'],
    targetId: r.target_id as string,
    reason: (r.reason as string) ?? null,
    reportedAt: r.reported_at as string,
    reporterName: (r.reporter_name as string) ?? null,
    preview: (r.content_preview as string) ?? null,
    author: (r.content_author as string) ?? null,
    removed: !!r.content_removed,
  }));
}

export async function adminSetRemoved(type: string, id: string, removed: boolean) {
  const { error } = await supabase.rpc('admin_set_removed', { p_type: type, p_id: id, p_removed: removed });
  if (error) throw error;
}

export async function adminDismissReport(reportId: string) {
  const { error } = await supabase.rpc('admin_dismiss_report', { p_report_id: reportId });
  if (error) throw error;
}
