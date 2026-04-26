-- KRUX: Migration 23 — Shared briefs (public read-only brief links)
create table if not exists shared_briefs (
  id            uuid        primary key default gen_random_uuid(),
  token         text        not null unique default encode(gen_random_bytes(16), 'hex'),
  brief_text    text        not null,
  shipment_name text        not null,
  regulator     text        not null default '',
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default (now() + interval '30 days')
);

alter table shared_briefs enable row level security;

-- Anyone can read a brief if it hasn't expired
create policy "public_read_shared_briefs" on shared_briefs
  for select using (expires_at > now());

-- Authenticated users can create shared briefs
create policy "auth_insert_shared_briefs" on shared_briefs
  for insert with check (auth.role() = 'authenticated');
