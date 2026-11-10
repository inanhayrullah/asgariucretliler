-- Initial editorial schema. Apply only after configuring a Supabase project.
create extension if not exists pgcrypto;

create type public.article_status as enum ('draft', 'review', 'scheduled', 'published', 'archived');
create type public.article_origin as enum ('editorial', 'rss', 'assisted');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('admin', 'editor')),
  display_name text,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text not null default '',
  content jsonb not null default '[]'::jsonb,
  cover_image_url text,
  cover_image_alt text not null default '',
  category_id uuid references public.categories(id) on delete set null,
  tags text[] not null default '{}',
  author_id uuid references public.profiles(id) on delete set null,
  author_name text,
  source_url text,
  first_published_at timestamptz,
  updated_at timestamptz not null default now(),
  status public.article_status not null default 'draft',
  scheduled_at timestamptz,
  published_at timestamptz,
  seo_title text,
  seo_description text,
  origin public.article_origin not null default 'editorial',
  editorial_verified_at timestamptz,
  editorial_verified_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint scheduled_articles_have_time check (status <> 'scheduled' or scheduled_at is not null)
);
create index articles_public_listing on public.articles (published_at desc) where status = 'published';
create index articles_category_listing on public.articles (category_id, published_at desc) where status = 'published';
create index articles_review_queue on public.articles (created_at asc) where status = 'review';

create table public.rss_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  feed_url text not null,
  allowed_host text not null,
  active boolean not null default false,
  last_checked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  unique (feed_url)
);

create table public.rss_items (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.rss_sources(id) on delete cascade,
  source_guid text,
  source_url text not null,
  title text not null,
  summary text,
  source_published_at timestamptz,
  article_id uuid references public.articles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (source_id, source_url),
  unique (source_id, source_guid)
);

create table public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  task text not null,
  status text not null check (status in ('running', 'succeeded', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  summary jsonb not null default '{}'::jsonb,
  error_message text
);

create or replace function public.is_editorial_staff()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'editor')) $$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.articles enable row level security;
alter table public.rss_sources enable row level security;
alter table public.rss_items enable row level security;
alter table public.automation_runs enable row level security;

create policy "Users read own profile" on public.profiles for select using (id = auth.uid());
create policy "Public reads published articles" on public.articles for select using (status = 'published');
create policy "Staff reads all articles" on public.articles for select using (public.is_editorial_staff());
create policy "Staff manages articles" on public.articles for all using (public.is_editorial_staff()) with check (public.is_editorial_staff());
create policy "Public reads categories" on public.categories for select using (true);
create policy "Staff manages categories" on public.categories for all using (public.is_editorial_staff()) with check (public.is_editorial_staff());
create policy "Staff manages RSS sources" on public.rss_sources for all using (public.is_editorial_staff()) with check (public.is_editorial_staff());
create policy "Staff manages RSS items" on public.rss_items for all using (public.is_editorial_staff()) with check (public.is_editorial_staff());
create policy "Staff reads automation runs" on public.automation_runs for select using (public.is_editorial_staff());
create policy "Staff writes automation runs" on public.automation_runs for insert with check (public.is_editorial_staff());

grant usage on schema public to anon, authenticated;
grant select on public.categories, public.articles to anon, authenticated;
grant select, insert, update, delete on public.articles, public.categories, public.rss_sources, public.rss_items to authenticated;
grant select on public.automation_runs to authenticated;

create or replace function public.publish_due_articles()
returns setof uuid language plpgsql security definer set search_path = public
as $$
begin
  return query
  with due as (
    select a.id from public.articles a
    where a.status = 'scheduled' and a.scheduled_at <= now()
    order by a.scheduled_at asc
    for update skip locked
    limit 100
  )
  update public.articles a
  set status = 'published', published_at = now(),
      first_published_at = coalesce(a.first_published_at, now()), updated_at = now()
  from due where a.id = due.id
  returning a.id;
end;
$$;
revoke all on function public.publish_due_articles() from public, anon, authenticated;
grant execute on function public.publish_due_articles() to service_role;
