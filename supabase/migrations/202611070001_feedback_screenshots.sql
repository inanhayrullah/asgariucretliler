alter table public.feedback_messages
  add column screenshot_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'feedback-screenshots',
  'feedback-screenshots',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Public uploads feedback screenshots"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'feedback-screenshots'
    and lower(storage.extension(name)) in ('png', 'jpg', 'jpeg', 'webp')
  );

create policy "Editorial staff reads feedback screenshots"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'feedback-screenshots'
    and public.is_editorial_staff()
  );
