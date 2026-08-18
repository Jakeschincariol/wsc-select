-- WSC Select — nominations
-- Run once in the Supabase SQL editor.

create table if not exists public.nominations (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  player_name   text not null,
  age_group     text not null,
  current_club  text not null,
  nominated_by  text not null,
  contact_email text not null,
  notes         text,
  user_agent    text,
  status        text not null default 'new'
                check (status in ('new','reviewing','invited','declined'))
);

create index if not exists nominations_created_at_idx on public.nominations (created_at desc);
create index if not exists nominations_status_idx     on public.nominations (status);

-- Lock the table down. The API writes with the service-role key, which bypasses
-- RLS; enabling it with no policies means anon/public keys can read nothing.
-- These are children's names and parents' contact details, so this matters.
alter table public.nominations enable row level security;

comment on table public.nominations is
  'Player nominations from the WSC Select site. Contains minors names and guardian contact details. Service-role access only.';
