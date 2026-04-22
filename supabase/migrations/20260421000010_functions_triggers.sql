-- KRUXVON: Step 10 of 10 — Functions and triggers

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_shipments_updated_at       BEFORE UPDATE ON shipments              FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_manufacturers_updated_at   BEFORE UPDATE ON manufacturers          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_mfr_licenses_updated_at    BEFORE UPDATE ON manufacturer_licenses  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_factory_audits_updated_at  BEFORE UPDATE ON factory_audits         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_certifications_updated_at  BEFORE UPDATE ON product_certifications FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_clearing_agents_updated_at BEFORE UPDATE ON clearing_agents        FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION generate_shipment_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference_number IS NULL OR NEW.reference_number = '' THEN
    NEW.reference_number = 'KRUX-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('shipment_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_shipment_reference BEFORE INSERT ON shipments FOR EACH ROW EXECUTE FUNCTION generate_shipment_reference();

CREATE OR REPLACE FUNCTION update_license_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expiry_date <= CURRENT_DATE THEN
    NEW.status = 'EXPIRED';
  ELSIF NEW.expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN
    NEW.status = 'EXPIRING_7';
  ELSIF NEW.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN
    NEW.status = 'EXPIRING_30';
  ELSIF NEW.expiry_date <= CURRENT_DATE + INTERVAL '60 days' THEN
    NEW.status = 'EXPIRING_60';
  ELSE
    NEW.status = 'ACTIVE';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_license_status BEFORE INSERT OR UPDATE ON manufacturer_licenses FOR EACH ROW EXECUTE FUNCTION update_license_status();
