-- KRUXVON: Step 6 of 10 — Purchase orders + resolve circular FK with shipments

CREATE TABLE purchase_orders (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id            UUID NOT NULL REFERENCES organizations(id),
  manufacturer_id            UUID NOT NULL REFERENCES manufacturers(id),
  shipment_id                UUID REFERENCES shipments(id),
  po_number                  TEXT UNIQUE NOT NULL,
  status                     po_status NOT NULL DEFAULT 'DRAFT',
  po_value_usd               DECIMAL(12,2) NOT NULL,
  advance_pct                DECIMAL(5,2) DEFAULT 30,
  advance_paid_usd           DECIMAL(12,2),
  advance_paid_date          DATE,
  balance_due_usd            DECIMAL(12,2),
  balance_due_trigger        TEXT,
  order_date                 DATE NOT NULL,
  production_start_date      DATE,
  production_end_date        DATE,
  inspection_date            DATE,
  shipping_date              DATE,
  expected_delivery_date     DATE,
  actual_delivery_date       DATE,
  has_priority_clause        BOOLEAN DEFAULT false,
  priority_clause_detail     TEXT,
  has_penalty_clause         BOOLEAN DEFAULT false,
  penalty_per_day_usd        DECIMAL(8,2),
  max_penalty_pct            DECIMAL(5,2),
  has_force_majeure_clause   BOOLEAN DEFAULT false,
  has_substitution_clause    BOOLEAN DEFAULT false,
  substitute_manufacturer_id UUID REFERENCES manufacturers(id),
  has_escrow                 BOOLEAN DEFAULT false,
  escrow_provider            TEXT,
  manufacturer_risk_flag     risk_flag DEFAULT 'GREEN',
  last_risk_check_at         TIMESTAMPTZ,
  risk_alerts_count          INTEGER DEFAULT 0,
  product_name               TEXT NOT NULL,
  product_description        TEXT,
  quantity                   DECIMAL(12,3),
  unit                       TEXT,
  specifications_url         TEXT,
  sample_approved            BOOLEAN DEFAULT false,
  sample_approved_date       DATE,
  contract_url               TEXT,
  incoterms                  TEXT DEFAULT 'FOB',
  notes                      TEXT,
  created_by                 UUID REFERENCES users(id),
  created_at                 TIMESTAMPTZ DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ DEFAULT NOW()
);

-- Resolve circular dependency: shipments <-> purchase_orders
ALTER TABLE shipments
  ADD CONSTRAINT fk_shipment_purchase_order
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id);
