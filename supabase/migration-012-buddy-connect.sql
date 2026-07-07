-- Migration 012 — Buddy tab grows a real way to connect, safely.
-- Run in the Supabase SQL editor.
--
-- Until now a buddy plan collected "I'm interested" rows and stopped there:
-- no approval, no way to actually reach each other short of posting your
-- phone number publicly. This adds the missing back half:
--
--   request (with intro) → host accepts/declines → private group chat
--
-- Safety is structural, not advisory:
--   * the host gates who gets contact (accept/decline),
--   * contact happens in an in-app group chat readable/writable ONLY by the
--     host and accepted members (enforced by RLS, not just UI), so nobody
--     has to hand out a phone number or social handle to strangers,
--   * chat history stays in-app where it can be reported.

-- 1. Requests get a status. Existing rows become 'accepted' so current plans
--    keep working (they were made under the auto-join model).
alter table public.buddy_interests add column if not exists status text not null default 'pending'
  check (status in ('pending', 'accepted', 'declined'));
update public.buddy_interests set status = 'accepted' where status = 'pending';

-- Hosts may update the status of requests on their own plans.
drop policy if exists "host manages request status" on public.buddy_interests;
create policy "host manages request status" on public.buddy_interests for update
  using (exists (select 1 from public.buddies b where b.id = buddy_id and b.author_id = auth.uid()))
  with check (exists (select 1 from public.buddies b where b.id = buddy_id and b.author_id = auth.uid()));

-- 2. The group chat.
create table if not exists public.buddy_messages (
  id uuid primary key default gen_random_uuid(),
  buddy_id uuid not null references public.buddies(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  sender_name text not null,
  sender_country text,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists buddy_messages_buddy_idx on public.buddy_messages (buddy_id, created_at);
alter table public.buddy_messages enable row level security;

-- Participants = the plan's host + accepted members. Only they can read or
-- send. (Not `using (true)` like public content — this chat is private.)
drop policy if exists "participants read messages" on public.buddy_messages;
create policy "participants read messages" on public.buddy_messages for select using (
  exists (select 1 from public.buddies b where b.id = buddy_id and b.author_id = auth.uid())
  or exists (
    select 1 from public.buddy_interests bi
    where bi.buddy_id = buddy_messages.buddy_id and bi.user_id = auth.uid() and bi.status = 'accepted'
  )
);

drop policy if exists "participants send messages" on public.buddy_messages;
create policy "participants send messages" on public.buddy_messages for insert with check (
  sender_id = auth.uid() and (
    exists (select 1 from public.buddies b where b.id = buddy_id and b.author_id = auth.uid())
    or exists (
      select 1 from public.buddy_interests bi
      where bi.buddy_id = buddy_messages.buddy_id and bi.user_id = auth.uid() and bi.status = 'accepted'
    )
  )
);
