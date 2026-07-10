-- Migration 016 — moderation tools (report queue for admins).
-- Run in the Supabase SQL editor.
--
-- Reports already flow into public.reports (Guideline 1.2), but the only way to
-- act on them was raw SQL. This adds an admin role and three security-definer
-- RPCs so a trusted operator can triage the queue from inside the app. Content
-- tables get NO broad admin write policy — moderation happens ONLY through
-- admin_set_removed(), which can toggle just the `removed` flag. That keeps the
-- blast radius tiny even if the admin account is compromised.
--
-- To grant yourself admin after running this:
--   insert into public.admins (user_id) values ('<your-auth-uid>');
-- (find your uid in Supabase → Authentication → Users)

create table if not exists public.admins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz default now()
);
alter table public.admins enable row level security;
drop policy if exists "admins read admins" on public.admins;
create policy "admins read admins" on public.admins for select
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- Keep resolved reports out of the live queue while preserving history.
alter table public.reports add column if not exists resolved boolean default false;

create or replace function public.is_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- The triage queue: every unresolved report, enriched with a content preview
-- and the target author, newest first.
create or replace function public.admin_list_reports()
returns table (
  report_id uuid,
  target_type text,
  target_id text,
  reason text,
  reported_at timestamptz,
  reporter_name text,
  content_preview text,
  content_author text,
  content_removed boolean
) language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = 'insufficient_privilege';
  end if;
  return query
    select
      r.id, r.target_type, r.target_id, r.reason, r.created_at,
      rp.display_name,
      case r.target_type
        when 'post' then (select coalesce(p.title, '') || ' — ' || coalesce(left(p.body, 140), '') from public.posts p where p.id::text = r.target_id)
        when 'comment' then (select left(cm.body, 180) from public.comments cm where cm.id::text = r.target_id)
        when 'buddy' then (select b.activity || ' — ' || coalesce(left(b.note, 140), '') from public.buddies b where b.id::text = r.target_id)
        when 'profile' then (select pr.display_name from public.profiles pr where pr.id::text = r.target_id)
      end,
      case r.target_type
        when 'post' then (select p.author_name from public.posts p where p.id::text = r.target_id)
        when 'comment' then (select cm.author_name from public.comments cm where cm.id::text = r.target_id)
        when 'buddy' then (select b.author_name from public.buddies b where b.id::text = r.target_id)
        else null
      end,
      case r.target_type
        when 'post' then (select p.removed from public.posts p where p.id::text = r.target_id)
        when 'comment' then (select cm.removed from public.comments cm where cm.id::text = r.target_id)
        when 'buddy' then (select b.removed from public.buddies b where b.id::text = r.target_id)
        else false
      end
    from public.reports r
    left join public.profiles rp on rp.id = r.reporter_id
    where not r.resolved
    order by r.created_at desc;
end; $$;

-- Soft-remove or restore reported content, and clear the target's reports from
-- the queue in the same shot.
create or replace function public.admin_set_removed(p_type text, p_id text, p_removed boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = 'insufficient_privilege';
  end if;
  if p_type = 'post' then update public.posts set removed = p_removed where id::text = p_id;
  elsif p_type = 'comment' then update public.comments set removed = p_removed where id::text = p_id;
  elsif p_type = 'buddy' then update public.buddies set removed = p_removed where id::text = p_id;
  else raise exception 'unsupported target type %', p_type;
  end if;
  if p_removed then
    update public.reports set resolved = true where target_type = p_type and target_id = p_id;
  end if;
end; $$;

-- Dismiss a report without touching the content (false alarm).
create or replace function public.admin_dismiss_report(p_report_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = 'insufficient_privilege';
  end if;
  update public.reports set resolved = true where id = p_report_id;
end; $$;
