-- KRUXVON: Migration 18 — Suppression Log
-- Every time the action generator skips creating an action,
-- we record why. This becomes the control group for causal learning.

create table suppressed_actions (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id),
  shipment_id      uuid references shipments(id) on delete cascade,

  action_type      text not null,
  reason           text not null,  -- DUPLICATE_OPEN | LOW_EFFECTIVENESS | BELOW_THRESHOLD
  context          jsonb default '{}',  -- snapshot: days_to_deadline, risk_score, regulator, etc.

  created_at       timestamptz default now()
);

create index idx_suppressed_org      on suppressed_actions(organization_id);
create index idx_suppressed_shipment on suppressed_actions(shipment_id);
create index idx_suppressed_type     on suppressed_actions(action_type);
create index idx_suppressed_context  on suppressed_actions using gin(context);

alter table suppressed_actions enable row level security;

create policy "org_isolation" on suppressed_actions
  using (organization_id = (select organization_id from users where id = auth.uid()));
