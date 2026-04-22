-- KRUXVON: Migration 17 — Action Intelligence Engine
-- Extends actions, adds action_outcomes, action_effectiveness_model

-- ============================================================
-- 1. EXTEND ACTIONS — outcome tracking + richer context
-- ============================================================
alter table actions
  add column if not exists completion_signal text,   -- EXPLICIT | INFERRED | TIMEOUT
  add column if not exists outcome_id        uuid,
  add column if not exists effectiveness_score numeric,
  add column if not exists evaluated_at      timestamptz,
  add column if not exists trigger_reason    text,   -- human-readable why
  add column if not exists expected_impact   jsonb default '{}',
  add column if not exists confidence_score  numeric default 1.0;

-- ============================================================
-- 2. ACTION OUTCOMES — one record per evaluated action
-- ============================================================
create table action_outcomes (
  id               uuid primary key default gen_random_uuid(),
  action_id        uuid references actions(id) on delete cascade,
  shipment_id      uuid references shipments(id) on delete set null,
  organization_id  uuid not null references organizations(id),

  -- Context bucket (determines which effectiveness model row to update)
  action_type      text not null,
  regulator        text,
  hs_code_prefix   text,     -- first 2 chars of HS code
  origin_country   text,
  value_band       text,     -- LOW | MEDIUM | HIGH | VERY_HIGH

  expected_impact  jsonb default '{}',
  actual_outcome   jsonb default '{}',

  -- Outcome classification
  outcome_type     text,     -- DELAY_REDUCED | COST_SAVED | REJECTED_AVOIDED | NO_EFFECT | UNKNOWN
  delta_delay_days numeric,  -- positive = faster than baseline
  delta_cost_usd   numeric,

  success           boolean,
  effectiveness_score numeric,   -- 0–1
  confidence_weight   numeric default 1.0,  -- lower for TIMEOUT completions (0.5)
  causal_weight       numeric default 1.0,  -- credit attribution across concurrent actions

  created_at timestamptz default now()
);

create index idx_action_outcomes_action on action_outcomes(action_id);
create index idx_action_outcomes_org    on action_outcomes(organization_id);
create index idx_action_outcomes_type   on action_outcomes(action_type, regulator);

-- ============================================================
-- 3. ACTION EFFECTIVENESS MODEL — calibrated per context bucket
-- organization_id IS NULL = global prior (seeded baselines)
-- organization_id = uuid  = org-specific, built from real outcomes
-- ============================================================
create table action_effectiveness_model (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid references organizations(id),

  action_type      text not null,
  regulator        text,
  hs_code_prefix   text,
  origin_country   text,
  value_band       text,

  avg_effectiveness numeric default 0,
  std_deviation     numeric default 0,
  sample_size       int default 0,
  ci_lower          numeric,
  ci_upper          numeric,

  last_updated timestamptz default now()
);

-- Unique per context bucket (NULLs are treated as distinct values here via COALESCE index)
create unique index idx_aem_unique on action_effectiveness_model (
  coalesce(organization_id::text, 'GLOBAL'),
  action_type,
  coalesce(regulator,       ''),
  coalesce(hs_code_prefix,  ''),
  coalesce(origin_country,  ''),
  coalesce(value_band,      '')
);

create index idx_aem_lookup on action_effectiveness_model(organization_id, action_type, regulator);
create index idx_aem_global  on action_effectiveness_model(action_type) where organization_id is null;

-- Seed global priors from Kenya trade intelligence
insert into action_effectiveness_model
  (organization_id, action_type, regulator, avg_effectiveness, std_deviation, sample_size, ci_lower, ci_upper)
values
  (null, 'SUBMIT_DOCUMENTS',      'KEBS',    0.78, 0.15, 0, 0.63, 0.93),
  (null, 'SUBMIT_DOCUMENTS',      'PPB',     0.72, 0.18, 0, 0.54, 0.90),
  (null, 'SUBMIT_DOCUMENTS',      'KEPHIS',  0.80, 0.12, 0, 0.68, 0.92),
  (null, 'SUBMIT_DOCUMENTS',      'KRA',     0.85, 0.10, 0, 0.75, 0.95),
  (null, 'SUBMIT_DOCUMENTS',      'PCPB',    0.70, 0.20, 0, 0.50, 0.90),
  (null, 'SUBMIT_DOCUMENTS',      'EPRA',    0.74, 0.16, 0, 0.58, 0.90),
  (null, 'SUBMIT_DOCUMENTS',      'NEMA',    0.76, 0.14, 0, 0.62, 0.90),
  (null, 'ESCALATE_SHIPMENT',     null,      0.65, 0.22, 0, 0.43, 0.87),
  (null, 'PREEMPTIVE_SUBMISSION', null,      0.82, 0.14, 0, 0.68, 0.96),
  (null, 'CONTACT_AGENT',         null,      0.60, 0.25, 0, 0.35, 0.85),
  (null, 'VERIFY_HS_CODE',        null,      0.90, 0.08, 0, 0.82, 0.98),
  (null, 'FOLLOW_UP_REGULATOR',   null,      0.55, 0.28, 0, 0.27, 0.83),
  (null, 'HIGH_RISK_REVIEW',      null,      0.70, 0.20, 0, 0.50, 0.90);

-- ============================================================
-- 4. RLS
-- ============================================================
alter table action_outcomes          enable row level security;
alter table action_effectiveness_model enable row level security;

create policy "org_isolation" on action_outcomes
  using (organization_id = (select organization_id from users where id = auth.uid()));

-- Own org records + global priors (organization_id IS NULL)
create policy "org_or_global" on action_effectiveness_model
  using (organization_id is null
      or organization_id = (select organization_id from users where id = auth.uid()));
