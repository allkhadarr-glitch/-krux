-- KRUXVON: Step 9 of 10 — Row Level Security (data isolation per organization)

ALTER TABLE organizations              ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_documents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_timeline          ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturer_licenses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE factory_audits             ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_milestones              ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_risk_signals     ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_certifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE clearing_agents            ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_shipment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts                     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON shipments
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation" ON manufacturers
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation" ON manufacturer_licenses
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation" ON purchase_orders
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation" ON alerts
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation" ON clearing_agents
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation" ON product_certifications
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation" ON factory_audits
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));
