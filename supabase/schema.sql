-- TRIP — Supabase schema (Postgres). Run in the Supabase SQL editor.
-- Covers: auth-linked profiles, curated content (places/themes), UGC
-- (posts/comments/buddies), user relations (saves/votes/follows/itinerary),
-- and the App-Store-required moderation surface (reports/blocks + account deletion).
--
-- Author name/country are denormalized onto posts/comments/buddies at write time
-- (read by the client from `profiles` and sent along with the insert) so list
-- queries never need a join. Vote/comment/interest counts are kept in sync by
-- triggers so the client only ever needs a single `select *`.

-- ─────────────────────────── Profiles ───────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  handle text unique,
  display_name text,
  country text,
  interests text[] default '{}',
  avatar_url text,
  points int default 0,
  banned boolean default false,
  created_at timestamptz default now()
);

-- Auto-create a profile row when a user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, handle, display_name)
  values (new.id, split_part(new.email, '@', 1), coalesce(new.raw_user_meta_data->>'name', 'Traveler'))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ─────────────────────────── Curated content ────────────────────
-- Places: the app's core moat (foreigner tags + K-content). Seeded from data.
create table if not exists public.places (
  slug text primary key,
  name text not null,
  name_ko text,
  category text,
  neighborhood text,
  city text default 'Seoul',
  address text,
  hours text,
  price_range text,
  rating numeric,
  reviews int default 0,
  description text,
  lat double precision,
  lng double precision,
  swatch text[] default '{}',
  solo_ok boolean default false,
  english_menu boolean default false,
  price_transparent boolean default false,
  card_ok boolean default false,
  english_spoken boolean default false,
  votes jsonb default '{}',
  warn_tip text,
  k_content_title text,
  k_content_type text,
  k_content_note text,
  photo_url text,
  created_at timestamptz default now()
);

-- Themes (walks + guides): stored as jsonb for shape flexibility.
create table if not exists public.themes (
  slug text primary key,
  kind text check (kind in ('walk','guide')),
  category text,
  title text,
  data jsonb not null,
  created_at timestamptz default now()
);

-- ─────────────────────────── UGC ────────────────────────────────
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  type text check (type in ('tip','route','question')),
  title text not null,
  body text,
  neighborhood text,
  place_slug text references public.places(slug) on delete set null,
  author_id uuid references public.profiles(id) on delete cascade,
  author_name text not null,
  author_country text,
  route_days jsonb,
  vote_count int default 0,
  comment_count int default 0,
  removed boolean default false,
  created_at timestamptz default now()
);
create index if not exists posts_created_idx on public.posts (created_at desc);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete cascade,
  author_name text not null,
  author_country text,
  body text not null,
  removed boolean default false,
  created_at timestamptz default now()
);
create index if not exists comments_post_idx on public.comments (post_id, created_at);

create table if not exists public.buddies (
  id uuid primary key default gen_random_uuid(),
  activity text not null,
  emoji text,
  author_id uuid references public.profiles(id) on delete cascade,
  author_name text not null,
  author_country text,
  neighborhood text,
  place_slug text references public.places(slug) on delete set null,
  when_text text,
  group_size int default 2,
  note text,
  interested_count int default 0,
  removed boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.buddy_interests (
  buddy_id uuid references public.buddies(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  author_name text,
  author_country text,
  message text,
  created_at timestamptz default now(),
  primary key (buddy_id, user_id)
);

-- ─────────────────────────── User relations ─────────────────────
create table if not exists public.saves (
  user_id uuid references public.profiles(id) on delete cascade,
  place_slug text references public.places(slug) on delete cascade,
  primary key (user_id, place_slug)
);

create table if not exists public.post_votes (
  user_id uuid references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  primary key (user_id, post_id)
);

create table if not exists public.follows (
  follower_id uuid references public.profiles(id) on delete cascade,
  creator_id text not null,
  primary key (follower_id, creator_id)
);

create table if not exists public.itineraries (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz default now()
);

-- ─────────── Moderation (App Store Guideline 1.2 — UGC) ──────────
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete cascade,
  target_type text check (target_type in ('post','comment','buddy','profile')),
  target_id text not null,
  reason text,
  created_at timestamptz default now()
);

create table if not exists public.blocks (
  blocker_id uuid references public.profiles(id) on delete cascade,
  blocked_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (blocker_id, blocked_id)
);

-- Self-serve account deletion (App Store Guideline 5.1.1(v)).
-- Callable by the signed-in user; removes their auth row (cascades to all data).
create or replace function public.delete_account()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from auth.users where id = auth.uid();
end; $$;

-- ─────────────────────────── Counter triggers ────────────────────
create or replace function public.bump_post_comment_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set comment_count = greatest(0, comment_count - 1) where id = old.post_id;
  end if;
  return null;
end; $$;
drop trigger if exists on_comment_change on public.comments;
create trigger on_comment_change
  after insert or delete on public.comments for each row execute function public.bump_post_comment_count();

create or replace function public.bump_post_vote_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set vote_count = vote_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set vote_count = greatest(0, vote_count - 1) where id = old.post_id;
  end if;
  return null;
end; $$;
drop trigger if exists on_vote_change on public.post_votes;
create trigger on_vote_change
  after insert or delete on public.post_votes for each row execute function public.bump_post_vote_count();

create or replace function public.bump_buddy_interest_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.buddies set interested_count = interested_count + 1 where id = new.buddy_id;
  elsif tg_op = 'DELETE' then
    update public.buddies set interested_count = greatest(0, interested_count - 1) where id = old.buddy_id;
  end if;
  return null;
end; $$;
drop trigger if exists on_buddy_interest_change on public.buddy_interests;
create trigger on_buddy_interest_change
  after insert or delete on public.buddy_interests for each row execute function public.bump_buddy_interest_count();

-- ─────────────────────────── RLS ────────────────────────────────
alter table public.profiles enable row level security;
alter table public.places enable row level security;
alter table public.themes enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.buddies enable row level security;
alter table public.buddy_interests enable row level security;
alter table public.saves enable row level security;
alter table public.post_votes enable row level security;
alter table public.follows enable row level security;
alter table public.itineraries enable row level security;
alter table public.reports enable row level security;
alter table public.blocks enable row level security;

-- Public read of curated content + non-removed UGC. Posts/comments/buddies
-- additionally hide content from authors the current user has blocked.
create policy "places readable" on public.places for select using (true);
create policy "themes readable" on public.themes for select using (true);
create policy "profiles readable" on public.profiles for select using (true);

create policy "posts readable" on public.posts for select using (
  not removed and not exists (
    select 1 from public.blocks b where b.blocker_id = auth.uid() and b.blocked_id = posts.author_id
  )
);
create policy "comments readable" on public.comments for select using (
  not removed and not exists (
    select 1 from public.blocks b where b.blocker_id = auth.uid() and b.blocked_id = comments.author_id
  )
);
create policy "buddies readable" on public.buddies for select using (
  not removed and not exists (
    select 1 from public.blocks b where b.blocker_id = auth.uid() and b.blocked_id = buddies.author_id
  )
);
create policy "buddy_interests readable" on public.buddy_interests for select using (true);

-- Owners manage their own profile.
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

-- Authenticated users create UGC as themselves.
create policy "create posts" on public.posts for insert with check (auth.uid() = author_id);
create policy "edit own posts" on public.posts for update using (auth.uid() = author_id);
create policy "delete own posts" on public.posts for delete using (auth.uid() = author_id);
create policy "create comments" on public.comments for insert with check (auth.uid() = author_id);
create policy "edit own comments" on public.comments for update using (auth.uid() = author_id);
create policy "delete own comments" on public.comments for delete using (auth.uid() = author_id);
create policy "create buddies" on public.buddies for insert with check (auth.uid() = author_id);
create policy "edit own buddies" on public.buddies for update using (auth.uid() = author_id);
create policy "delete own buddies" on public.buddies for delete using (auth.uid() = author_id);

-- Interests / saves / votes / follows / itinerary: owner-scoped.
create policy "own buddy_interests" on public.buddy_interests for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own saves" on public.saves for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own votes" on public.post_votes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own follows" on public.follows for all using (auth.uid() = follower_id) with check (auth.uid() = follower_id);
create policy "own itinerary" on public.itineraries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Moderation: any authed user can file a report / block; only see their own.
create policy "file reports" on public.reports for insert with check (auth.uid() = reporter_id);
create policy "see own reports" on public.reports for select using (auth.uid() = reporter_id);
create policy "own blocks" on public.blocks for all using (auth.uid() = blocker_id) with check (auth.uid() = blocker_id);
