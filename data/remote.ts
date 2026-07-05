// Supabase-backed reads/writes, mapped to the app's existing camelCase types
// (see data/types.ts). Every function here is safe to call only when
// isSupabaseConfigured — callers should check that first (see lib/remoteData.tsx).
import { supabase } from '@/lib/supabase';
import { Buddy, Comment, ForeignerTagKey, Place, Post, PostType, Profile, Theme } from './types';

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

export async function updateProfile(fields: { displayName?: string; handle?: string; country?: string | null; interests?: string[] }) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const row: Record<string, unknown> = {};
  if (fields.displayName !== undefined) row.display_name = fields.displayName;
  if (fields.handle !== undefined) row.handle = fields.handle;
  if (fields.country !== undefined) row.country = fields.country;
  if (fields.interests !== undefined) row.interests = fields.interests;
  const { error } = await supabase.from('profiles').update(row).eq('id', user.id);
  if (error) throw error;
}

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
    votes: row.votes as Partial<Record<ForeignerTagKey, number>>,
    warnTip: row.warn_tip ?? undefined,
    kContentTitle: row.k_content_title ?? undefined,
    kContentType: row.k_content_type ?? undefined,
    kContentNote: row.k_content_note ?? undefined,
    swatch: row.swatch,
    photoUrl: row.photo_url ?? undefined,
  };
}

export async function fetchPlaces(): Promise<Place[]> {
  const { data, error } = await supabase.from('places').select('*').order('name');
  if (error) throw error;
  return (data ?? []).map(mapPlace);
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
    title: row.title,
    body: row.body,
    neighborhood: row.neighborhood,
    placeSlug: row.place_slug ?? undefined,
    author: { name: row.author_name, country: row.author_country || '🌐' },
    when: timeAgo(row.created_at),
    votes: row.vote_count,
    comments: row.comment_count,
    routeDays: row.route_days ?? undefined,
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
  return (data ?? []).map((row: any) => ({
    id: row.id,
    authorId: row.author_id,
    name: row.author_name,
    country: row.author_country || '🌐',
    body: row.body,
    when: timeAgo(row.created_at),
  }));
}

export async function addComment(postId: string, body: string, authorName: string, authorCountry: string | null) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { error } = await supabase.from('comments').insert({
    post_id: postId,
    author_id: user.id,
    author_name: authorName,
    author_country: authorCountry,
    body,
  });
  if (error) throw error;
}

export async function createPost(input: {
  type: PostType;
  title: string;
  body: string;
  neighborhood?: string;
  placeSlug?: string;
  routeDays?: Post['routeDays'];
  authorName: string;
  authorCountry: string | null;
}): Promise<Post> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const slug = slugify(input.title);
  const { data, error } = await supabase
    .from('posts')
    .insert({
      slug,
      type: input.type,
      title: input.title,
      body: input.body,
      neighborhood: input.neighborhood ?? null,
      place_slug: input.placeSlug ?? null,
      route_days: input.routeDays ?? null,
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

export async function fetchBuddyInterests(buddyId: string): Promise<{ name: string; country: string; message: string }[]> {
  const { data, error } = await supabase.from('buddy_interests').select('*').eq('buddy_id', buddyId);
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    name: row.author_name || 'Traveler',
    country: row.author_country || '🌐',
    message: row.message || '',
  }));
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
