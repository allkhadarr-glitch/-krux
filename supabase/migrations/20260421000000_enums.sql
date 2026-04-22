-- KRUXVON: Step 1 of 10 — ENUMS

CREATE TYPE risk_flag          AS ENUM ('GREEN', 'AMBER', 'RED');
CREATE TYPE risk_level         AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE user_role          AS ENUM ('krux_admin', 'operations', 'management', 'clearing_agent', 'client', 'manufacturer', 'auditor');
CREATE TYPE org_type           AS ENUM ('sme_importer', 'clearing_agent_firm', 'manufacturer', 'audit_agency', 'kruxvon_internal');
CREATE TYPE shipment_status    AS ENUM ('DRAFT', 'PENDING', 'IN_TRANSIT', 'AT_PORT', 'CUSTOMS_HOLD', 'CUSTOMS_CLEARANCE', 'DELIVERED', 'CANCELLED');
CREATE TYPE remediation_status AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED', 'ESCALATED');
CREATE TYPE license_status     AS ENUM ('ACTIVE', 'EXPIRING_60', 'EXPIRING_30', 'EXPIRING_7', 'EXPIRED', 'SUSPENDED', 'PENDING_RENEWAL');
CREATE TYPE audit_status       AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE po_status          AS ENUM ('DRAFT', 'CONFIRMED', 'IN_PRODUCTION', 'QUALITY_CHECK', 'SHIPPED', 'DELIVERED', 'DISPUTED', 'CANCELLED');
CREATE TYPE cert_status        AS ENUM ('PENDING', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED');
CREATE TYPE alert_type         AS ENUM (
  'LICENSE_EXPIRY_60', 'LICENSE_EXPIRY_30', 'LICENSE_EXPIRY_7', 'LICENSE_EXPIRED',
  'PVOC_DEADLINE_7', 'PVOC_DEADLINE_3', 'PVOC_OVERDUE',
  'CERT_EXPIRY_60', 'CERT_EXPIRY_30',
  'SHIPMENT_DELAY', 'SHIPMENT_HELD',
  'RISK_ESCALATION',
  'BANKRUPTCY_SIGNAL', 'CAPACITY_OVERLOAD', 'KEY_STAFF_DEPARTURE',
  'AUDIT_DUE', 'AUDIT_FAILED',
  'PORT_CONGESTION', 'FOREX_MOVEMENT',
  'PO_MILESTONE_DUE', 'PO_OVERDUE',
  'ORDER_PROTECTION_BREACH'
);
CREATE TYPE alert_channel      AS ENUM ('EMAIL', 'WHATSAPP', 'IN_APP', 'SMS');
CREATE TYPE subscription_tier  AS ENUM ('trial', 'basic', 'pro', 'enterprise');
