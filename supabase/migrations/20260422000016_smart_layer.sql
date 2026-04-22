-- KRUXVON: Migration 16 — Smart Layer
-- Builds: actions, shipment_risk, regulator_delay_profiles,
--         supplier_profiles, shipment_outcomes, org_intelligence

-- ============================================================
-- 1. ACTIONS — the load-bearing wall everything depends on
-- ============================================================
create table actions (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id),
  shipment_id      uuid references shipments(id) on delete cascade,
  manufacturer_id  uuid references manufacturers(id) on delete cascade,
  event_id         uuid references events(id) on delete set null,

  action_type      text not null,         -- APPLY | FOLLOW_UP | ESCALATE | SUBMIT | REVIEW | URGENT
  priority         text not null default 'MEDIUM',  -- LOW | MEDIUM | HIGH | CRITICAL
  title            text not null,
  description      text,

  assigned_to      uuid references users(id) on delete set null,
  due_date         date,

  status           text not null default 'OPEN',  -- OPEN | IN_PROGRESS | COMPLETED | DISMISSED
  completed_at     timestamptz,
  completed_by     uuid references users(id) on delete set null,

  source           text not null default 'SYSTEM',  -- SYSTEM | USER

  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create index idx_actions_shipment  on actions(shipment_id);
create index idx_actions_org       on actions(organization_id);
create index idx_actions_status    on actions(status) where status = 'OPEN';
create index idx_actions_priority  on actions(priority);
create trigger trg_actions_updated_at before update on actions
  for each row execute function update_updated_at();

-- ============================================================
-- 2. REGULATOR DELAY PROFILES — Kenya-specific baselines
-- ============================================================
create table regulator_delay_profiles (
  regulator            text primary key,
  avg_processing_days  numeric not null,
  delay_probability    numeric not null,  -- 0 to 1
  rejection_rate       numeric default 0,
  sample_size          int default 0,     -- 0 = seeded baseline, grows with real data
  last_updated         timestamptz default now()
);

-- Seeded from public Kenya trade data + industry knowledge
insert into regulator_delay_profiles (regulator, avg_processing_days, delay_probability, rejection_rate) values
  ('KENTRADE', 1,  0.05, 0.02),
  ('KRA',      2,  0.10, 0.05),
  ('KEBS',     5,  0.25, 0.12),
  ('KEPHIS',   4,  0.20, 0.08),
  ('PPB',      7,  0.30, 0.15),
  ('PCPB',     6,  0.22, 0.10),
  ('EPRA',     5,  0.18, 0.07),
  ('NEMA',     4,  0.15, 0.06),
  ('WHO-GMP',  3,  0.12, 0.04);

-- ============================================================
-- 3. SHIPMENT RISK — live risk score per shipment
-- ============================================================
create table shipment_risk (
  shipment_id        uuid primary key references shipments(id) on delete cascade,
  organization_id    uuid not null references organizations(id),
  days_to_deadline   int,
  cif_value_usd      numeric,
  delay_probability  numeric,      -- compound across pending portals
  risk_score         numeric,      -- 0–10
  priority_level     text,         -- LOW | MEDIUM | HIGH | CRITICAL
  risk_drivers       jsonb default '[]',  -- top reasons, shown in UI
  last_calculated_at timestamptz default now()
);

create index idx_shipment_risk_org      on shipment_risk(organization_id);
create index idx_shipment_risk_score    on shipment_risk(risk_score desc);
create index idx_shipment_risk_priority on shipment_risk(priority_level);

-- ============================================================
-- 4. SHIPMENT OUTCOMES — memory ingestion (silent, compounds)
-- ============================================================
create table shipment_outcomes (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  shipment_id     uuid references shipments(id) on delete set null,
  regulator       text not null,
  outcome         text not null,       -- APPROVED | REJECTED | DELAYED
  duration_days   numeric,             -- actual days taken
  expected_days   numeric,             -- baseline at time of recording
  deviation       numeric,             -- duration - expected (positive = slower)
  cost_impact_kes numeric default 0,
  features        jsonb default '{}',  -- {origin, hs_code, value_band, supplier_id}
  created_at      timestamptz default now()
);

create index idx_outcomes_regulator on shipment_outcomes(regulator);
create index idx_outcomes_org       on shipment_outcomes(organization_id);
create index idx_outcomes_features  on shipment_outcomes using gin(features);

-- ============================================================
-- 5. SUPPLIER PROFILES — auto-built from outcomes
-- ============================================================
create table supplier_profiles (
  manufacturer_id  uuid primary key references manufacturers(id) on delete cascade,
  organization_id  uuid not null references organizations(id),
  total_shipments  int default 0,
  approval_rate    numeric default 0,
  avg_delay_days   numeric default 0,
  rejection_rate   numeric default 0,
  sample_size      int default 0,
  last_updated     timestamptz default now()
);

create index idx_supplier_profiles_org on supplier_profiles(organization_id);

-- ============================================================
-- 6. ORG INTELLIGENCE — per-enterprise calibration
-- ============================================================
create table org_intelligence (
  organization_id        uuid primary key references organizations(id) on delete cascade,
  kentrade_avg_days      numeric,
  kra_avg_days           numeric,
  kebs_avg_days          numeric,
  kephis_avg_days        numeric,
  ppb_avg_days           numeric,
  total_shipments        int default 0,
  prediction_confidence  text default 'LOW',  -- LOW (<10) | MEDIUM (10-50) | HIGH (50+)
  last_calibrated_at     timestamptz
);

-- ============================================================
-- 7. RLS
-- ============================================================
alter table actions             enable row level security;
alter table shipment_risk       enable row level security;
alter table shipment_outcomes   enable row level security;
alter table supplier_profiles   enable row level security;
alter table org_intelligence    enable row level security;

create policy "org_isolation" on actions
  using (organization_id = (select organization_id from users where id = auth.uid()));
create policy "org_isolation" on shipment_risk
  using (organization_id = (select organization_id from users where id = auth.uid()));
create policy "org_isolation" on shipment_outcomes
  using (organization_id = (select organization_id from users where id = auth.uid()));
create policy "org_isolation" on supplier_profiles
  using (organization_id = (select organization_id from users where id = auth.uid()));
create policy "org_isolation" on org_intelligence
  using (organization_id = (select organization_id from users where id = auth.uid()));

-- regulator_delay_profiles is global reference data — no RLS needed
