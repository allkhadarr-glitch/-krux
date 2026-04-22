-- KRUXVON: Migration 15 — Event Engine
-- Adds: alert_logs (reliability), events (backbone), event_logs (execution tracking)
-- DB triggers emit events on state changes — processor handles them async via cron.

-- ============================================================
-- 1. ALERT LOGS — every email/alert that fires gets recorded
-- ============================================================
create table alert_logs (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id),
  shipment_id      uuid references shipments(id) on delete set null,
  manufacturer_id  uuid references manufacturers(id) on delete set null,
  license_id       uuid references manufacturer_licenses(id) on delete set null,
  alert_type       text not null,   -- PVOC_DEADLINE_14D | PVOC_DEADLINE_7D | PVOC_DEADLINE_3D | LICENSE_EXPIRY_60D | LICENSE_EXPIRY_30D | LICENSE_EXPIRY_7D
  severity         text not null,   -- INFO | WARNING | CRITICAL
  channel          text not null default 'EMAIL',
  recipient_email  text,
  subject          text,
  status           text not null default 'SENT',  -- SENT | FAILED | SKIPPED
  error_message    text,
  metadata         jsonb default '{}',
  created_at       timestamptz default now()
);

create index idx_alert_logs_shipment    on alert_logs(shipment_id);
create index idx_alert_logs_org         on alert_logs(organization_id);
create index idx_alert_logs_created_at  on alert_logs(created_at desc);

-- ============================================================
-- 2. EVENTS — every state change becomes a row here
-- ============================================================
create table events (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  event_type      text not null,   -- SHIPMENT_CREATED | PORTAL_STATUS_CHANGED | DEADLINE_APPROACHING
  entity_type     text not null,   -- shipment | portal | license
  entity_id       uuid not null,
  payload         jsonb default '{}',
  processed_at    timestamptz,     -- null = unprocessed
  created_at      timestamptz default now()
);

create index idx_events_type        on events(event_type);
create index idx_events_entity      on events(entity_id);
create index idx_events_unprocessed on events(created_at) where processed_at is null;

-- ============================================================
-- 3. EVENT LOGS — execution record per event handler run
-- ============================================================
create table event_logs (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references events(id) on delete cascade,
  handler    text not null,   -- SHIPMENT_HANDLER | PORTAL_HANDLER | DEADLINE_HANDLER
  status     text not null,   -- SUCCESS | FAILED
  message    text,
  created_at timestamptz default now()
);

create index idx_event_logs_event_id on event_logs(event_id);
create index idx_event_logs_status   on event_logs(status);

-- ============================================================
-- 4. DB TRIGGER — SHIPMENT_CREATED event
-- ============================================================
create or replace function emit_shipment_created_event()
returns trigger as $$
begin
  insert into events (organization_id, event_type, entity_type, entity_id, payload)
  values (
    new.organization_id,
    'SHIPMENT_CREATED',
    'shipment',
    new.id,
    jsonb_build_object(
      'name',           new.name,
      'reference',      new.reference_number,
      'cif_value_usd',  new.cif_value_usd,
      'pvoc_deadline',  new.pvoc_deadline,
      'regulator_id',   new.regulatory_body_id
    )
  );
  return new;
end;
$$ language plpgsql;

create trigger trg_emit_shipment_created
  after insert on shipments
  for each row execute function emit_shipment_created_event();

-- ============================================================
-- 5. DB TRIGGER — PORTAL_STATUS_CHANGED event
-- ============================================================
create or replace function emit_portal_status_changed_event()
returns trigger as $$
begin
  -- only fire when status actually changes
  if old.status = new.status then return new; end if;

  insert into events (organization_id, event_type, entity_type, entity_id, payload)
  values (
    new.organization_id,
    'PORTAL_STATUS_CHANGED',
    'shipment',
    new.shipment_id,
    jsonb_build_object(
      'portal_id',   new.id,
      'regulator',   new.regulator,
      'old_status',  old.status,
      'new_status',  new.status,
      'ref_number',  new.reference_number
    )
  );
  return new;
end;
$$ language plpgsql;

create trigger trg_emit_portal_status_changed
  after update on shipment_portals
  for each row execute function emit_portal_status_changed_event();

-- ============================================================
-- 6. RLS
-- ============================================================
alter table alert_logs  enable row level security;
alter table events      enable row level security;
alter table event_logs  enable row level security;

create policy "org_isolation" on alert_logs
  using (organization_id = (select organization_id from users where id = auth.uid()));

create policy "org_isolation" on events
  using (organization_id = (select organization_id from users where id = auth.uid()));

-- event_logs readable via join — service role only for writes
create policy "service_read" on event_logs
  using (true);
