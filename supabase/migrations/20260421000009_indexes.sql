-- KRUXVON: Step 9 of 10 — Performance indexes

CREATE INDEX idx_shipments_org         ON shipments(organization_id);
CREATE INDEX idx_shipments_pvoc        ON shipments(pvoc_deadline) WHERE deleted_at IS NULL;
CREATE INDEX idx_shipments_risk        ON shipments(risk_flag_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_shipments_status      ON shipments(shipment_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_mfr_org               ON manufacturers(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_licenses_expiry       ON manufacturer_licenses(expiry_date, status);
CREATE INDEX idx_licenses_mfr          ON manufacturer_licenses(manufacturer_id);
CREATE INDEX idx_certs_expiry          ON product_certifications(kenya_expiry_date, india_expiry_date);
CREATE INDEX idx_alerts_org_unread     ON alerts(organization_id, is_read) WHERE is_read = false;
CREATE INDEX idx_alerts_scheduled      ON alerts(scheduled_for) WHERE sent_at IS NULL;
CREATE INDEX idx_po_org                ON purchase_orders(organization_id);
CREATE INDEX idx_po_manufacturer       ON purchase_orders(manufacturer_id);
CREATE INDEX idx_ai_cache_key          ON ai_cache(cache_key);
CREATE INDEX idx_ai_cache_expires      ON ai_cache(expires_at);
CREATE INDEX idx_forex_current         ON forex_rates(base_currency, target_currency) WHERE is_current = true;
