create table public.feedback_messages (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('complaint', 'suggestion')),
  message text not null check (char_length(btrim(message)) between 5 and 2000),
  created_at timestamptz not null default now()
);

create index feedback_messages_created_at on public.feedback_messages (created_at desc);

alter table public.feedback_messages enable row level security;

create policy "Public submits feedback"
  on public.feedback_messages for insert
  to anon, authenticated
  with check (
    type in ('complaint', 'suggestion')
    and char_length(btrim(message)) between 5 and 2000
  );

create policy "Editorial staff reads feedback"
  on public.feedback_messages for select
  to authenticated
  using (public.is_editorial_staff());

grant insert on public.feedback_messages to anon, authenticated;
grant select on public.feedback_messages to authenticated;
