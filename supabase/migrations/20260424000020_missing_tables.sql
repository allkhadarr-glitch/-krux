-- KRUXVON: Migration 20 — Missing operational tables
-- Adds: user_profiles, org_invites, notifications, org_contacts,
--       org_documents, compliance_obligations, shipment_costs

-- ============================================================
-- 1. USER PROFILES — maps Supabase auth users → org + role
-- ============================================================
create table if not exists user_profiles (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  organization_id  uuid not null references organizations(id) on delete cascade,
  full_name        text,
  role             text not null default 'operations',
  phone            text,
  is_active        boolean not null default true,
  updated_at       timestamptz not null default now()
);

create index if not exists idx_user_profiles_org on user_profiles(organization_id);

alter table user_profiles enable row level security;
create policy "org_isolation" on user_profiles
  using (organization_id = (
    select organization_id from user_profiles up2
    where up2.user_id = auth.uid()
    limit 1
  ));
-- Service role bypasses RLS — used by session.ts upserts

-- ============================================================
-- 2. ORG INVITES — pending email invitations
-- ============================================================
create table if not exists org_invites (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  email            text not null,
  role             text not null default 'operations',
  invited_by       uuid references auth.users(id) on delete set null,
  token            uuid not null default gen_random_uuid(),
  accepted_at      timestamptz,
  expires_at       timestamptz not null default (now() + interval '7 days'),
  created_at       timestamptz not null default now(),
  unique(token)
);

create index if not exists idx_org_invites_org   on org_invites(organization_id);
create index if not exists idx_org_invites_token on org_invites(token);
create index if not exists idx_org_invites_email on org_invites(email);

alter table org_invites enable row level security;
create policy "org_isolation" on org_invites
  using (organization_id = (
    select organization_id from user_profiles
    where user_id = auth.uid()
    limit 1
  ));

-- ============================================================
-- 3. NOTIFICATIONS — in-app notification feed
-- ============================================================
create table if not exists notifications (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  title            text not null,
  body             text not null default '',
  type             text not null default 'INFO',   -- INFO | WARNING | CRITICAL | SUCCESS
  read             boolean not null default false,
  action_url       text,
  metadata         jsonb default '{}',
  created_at       timestamptz not null default now()
);

create index if not exists idx_notifications_org_unread on notifications(organization_id, read) where read = false;
create index if not exists idx_notifications_org_time   on notifications(organization_id, created_at desc);

alter table notifications enable row level security;
create policy "org_isolation" on notifications
  using (organization_id = (
    select organization_id from user_profiles
    where user_id = auth.uid()
    limit 1
  ));

-- ============================================================
-- 4. ORG CONTACTS — clearing agents, forwarders, suppliers
-- ============================================================
create table if not exists org_contacts (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  name             text not null,
  contact_type     text not null default 'CLEARING_AGENT',  -- CLEARING_AGENT | FREIGHT_FORWARDER | CUSTOMS | OTHER
  phone            text,
  email            text,
  whatsapp         text,
  ports            text[] not null default '{}',
  specializations  text[] not null default '{}',
  notes            text,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_org_contacts_org on org_contacts(organization_id);

alter table org_contacts enable row level security;
create policy "org_isolation" on org_contacts
  using (organization_id = (
    select organization_id from user_profiles
    where user_id = auth.uid()
    limit 1
  ));

-- ============================================================
-- 5. ORG DOCUMENTS — org-level documents (licenses, certs, etc.)
-- ============================================================
create table if not exists org_documents (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  title            text not null,
  document_type    text not null default 'OTHER',
  file_url         text,
  file_name        text,
  file_size_bytes  bigint,
  status           text not null default 'ACTIVE',   -- ACTIVE | ARCHIVED
  notes            text,
  expires_at       date,
  uploaded_by      uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_org_documents_org on org_documents(organization_id);

alter table org_documents enable row level security;
create policy "org_isolation" on org_documents
  using (organization_id = (
    select organization_id from user_profiles
    where user_id = auth.uid()
    limit 1
  ));

-- ============================================================
-- 6. COMPLIANCE OBLIGATIONS — recurring compliance calendar items
-- ============================================================
create table if not exists compliance_obligations (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  title             text not null,
  regulator         text,            -- PPB | KEBS | KRA | …
  obligation_type   text not null default 'RECURRING',   -- RECURRING | ONE_TIME
  due_date          date not null,
  recurrence_days   int,             -- null = one-time; 30/90/365 = recurring
  status            text not null default 'OPEN',        -- OPEN | COMPLETED | ARCHIVED
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_compliance_obligations_org      on compliance_obligations(organization_id);
create index if not exists idx_compliance_obligations_due_date on compliance_obligations(due_date);

alter table compliance_obligations enable row level security;
create policy "org_isolation" on compliance_obligations
  using (organization_id = (
    select organization_id from user_profiles
    where user_id = auth.uid()
    limit 1
  ));

-- ============================================================
-- 7. SHIPMENT COSTS — itemised cost records per shipment
-- ============================================================
create table if not exists shipment_costs (
  id               uuid primary key default gen_random_uuid(),
  shipment_id      uuid not null references shipments(id) on delete cascade,
  organization_id  uuid not null references organizations(id) on delete cascade,
  cost_type        text not null,    -- STORAGE | DUTY | VAT | IDF | RDL | PVOC | CLEARING | PENALTY | OTHER
  amount_kes       numeric(14,2) not null default 0,
  amount_usd       numeric(10,2),
  note             text,
  recorded_at      timestamptz not null default now()
);

create index if not exists idx_shipment_costs_shipment on shipment_costs(shipment_id);
create index if not exists idx_shipment_costs_org      on shipment_costs(organization_id);

alter table shipment_costs enable row level security;
create policy "org_isolation" on shipment_costs
  using (organization_id = (
    select organization_id from user_profiles
    where user_id = auth.uid()
    limit 1
  ));

-- ============================================================
-- 8. WAITLIST — public landing page sign-ups (no auth required)
-- ============================================================
create table if not exists waitlist (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  company     text,
  role        text,
  source      text default 'landing',
  created_at  timestamptz not null default now()
);

-- No RLS — publicly insertable, admin-readable only
