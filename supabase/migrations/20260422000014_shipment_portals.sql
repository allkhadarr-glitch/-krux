-- KRUXVON: Migration 14 — Shipment Portals
-- Replaces JSONB portal_statuses column on shipments with a proper normalized table.
-- Each shipment gets one row per regulator it must clear through.

-- ============================================================
-- 1. ENUM
-- ============================================================
create type portal_status_enum as enum (
  'NOT_STARTED',
  'IN_PROGRESS',
  'SUBMITTED',
  'APPROVED',
  'REJECTED'
);

-- ============================================================
-- 2. TABLE
-- ============================================================
create table shipment_portals (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id),
  shipment_id      uuid not null references shipments(id) on delete cascade,
  regulator        text not null,           -- matches regulatory_bodies.code (PPB, KEBS, KRA, etc.)
  status           portal_status_enum not null default 'NOT_STARTED',
  reference_number text,
  notes            text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),

  unique (shipment_id, regulator)
);

-- ============================================================
-- 3. UPDATED_AT TRIGGER (reuses existing function)
-- ============================================================
create trigger trg_shipment_portals_updated_at
  before update on shipment_portals
  for each row execute function update_updated_at();

-- ============================================================
-- 4. AUTO-CREATE PORTALS ON SHIPMENT INSERT
-- When a shipment is created, we auto-create portal rows for
-- KenTrade (every shipment) + the assigned regulatory body.
-- Ops team never has to manually create portal rows.
-- ============================================================
create or replace function auto_create_shipment_portals()
returns trigger as $$
declare
  reg_code text;
begin
  -- KenTrade is required for every single shipment
  insert into shipment_portals (organization_id, shipment_id, regulator)
  values (new.organization_id, new.id, 'KENTRADE')
  on conflict (shipment_id, regulator) do nothing;

  -- KRA (customs) is required for every shipment
  insert into shipment_portals (organization_id, shipment_id, regulator)
  values (new.organization_id, new.id, 'KRA')
  on conflict (shipment_id, regulator) do nothing;

  -- Add the assigned regulatory body if one is set
  if new.regulatory_body_id is not null then
    select code into reg_code
    from regulatory_bodies
    where id = new.regulatory_body_id;

    if reg_code is not null then
      insert into shipment_portals (organization_id, shipment_id, regulator)
      values (new.organization_id, new.id, reg_code)
      on conflict (shipment_id, regulator) do nothing;
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_auto_create_portals
  after insert on shipments
  for each row execute function auto_create_shipment_portals();

-- ============================================================
-- 5. TOUCH SHIPMENT WHEN PORTAL STATUS CHANGES
-- Keeps shipments.updated_at fresh so any listener watching
-- the shipments table picks up portal changes too.
-- ============================================================
create or replace function touch_shipment_on_portal_update()
returns trigger as $$
begin
  update shipments set updated_at = now() where id = new.shipment_id;
  return new;
end;
$$ language plpgsql;

create trigger trg_touch_shipment_on_portal_update
  after update of status on shipment_portals
  for each row execute function touch_shipment_on_portal_update();

-- ============================================================
-- 6. INDEXES
-- ============================================================
create index idx_shipment_portals_shipment_id    on shipment_portals(shipment_id);
create index idx_shipment_portals_org_id         on shipment_portals(organization_id);
create index idx_shipment_portals_status         on shipment_portals(status);

-- ============================================================
-- 7. ROW LEVEL SECURITY
-- ============================================================
alter table shipment_portals enable row level security;

create policy "org_isolation" on shipment_portals
  using (organization_id = (select organization_id from users where id = auth.uid()));
