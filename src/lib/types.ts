// ============================================================
// KRUXVON PLATFORM — COMPLETE TYPE DEFINITIONS v1.0
// ============================================================

// ENUMS
export type RiskFlag           = 'GREEN' | 'AMBER' | 'RED'
export type RiskLevel          = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type UserRole           = 'krux_admin' | 'operations' | 'management' | 'clearing_agent' | 'client' | 'manufacturer' | 'auditor'
export type OrgType            = 'sme_importer' | 'clearing_agent_firm' | 'manufacturer' | 'audit_agency' | 'kruxvon_internal'
export type ShipmentStatus     = 'DRAFT' | 'PENDING' | 'IN_TRANSIT' | 'AT_PORT' | 'CUSTOMS_HOLD' | 'CUSTOMS_CLEARANCE' | 'DELIVERED' | 'CANCELLED'
export type RemediationStatus  = 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'ESCALATED'
export type LicenseStatus      = 'ACTIVE' | 'EXPIRING_60' | 'EXPIRING_30' | 'EXPIRING_7' | 'EXPIRED' | 'SUSPENDED' | 'PENDING_RENEWAL'
export type AuditStatus        = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
export type POStatus           = 'DRAFT' | 'CONFIRMED' | 'IN_PRODUCTION' | 'QUALITY_CHECK' | 'SHIPPED' | 'DELIVERED' | 'DISPUTED' | 'CANCELLED'
export type CertStatus         = 'PENDING' | 'SUBMITTED' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'EXPIRED'
export type AlertChannel       = 'EMAIL' | 'WHATSAPP' | 'IN_APP' | 'SMS'
export type SubscriptionTier   = 'trial' | 'basic' | 'pro' | 'enterprise'

export type AlertType =
  | 'LICENSE_EXPIRY_60' | 'LICENSE_EXPIRY_30' | 'LICENSE_EXPIRY_7' | 'LICENSE_EXPIRED'
  | 'PVOC_DEADLINE_7' | 'PVOC_DEADLINE_3' | 'PVOC_OVERDUE'
  | 'CERT_EXPIRY_60' | 'CERT_EXPIRY_30'
  | 'SHIPMENT_DELAY' | 'SHIPMENT_HELD'
  | 'RISK_ESCALATION'
  | 'BANKRUPTCY_SIGNAL' | 'CAPACITY_OVERLOAD' | 'KEY_STAFF_DEPARTURE'
  | 'AUDIT_DUE' | 'AUDIT_FAILED'
  | 'PORT_CONGESTION' | 'FOREX_MOVEMENT'
  | 'PO_MILESTONE_DUE' | 'PO_OVERDUE'
  | 'ORDER_PROTECTION_BREACH'

// ============================================================
// CORE
// ============================================================

export interface Organization {
  id: string
  name: string
  type: OrgType
  country: string
  city?: string
  address?: string
  phone?: string
  email?: string
  website?: string
  logo_url?: string
  tax_pin?: string
  registration_number?: string
  subscription_tier: SubscriptionTier
  subscription_status: string
  subscription_expires_at?: string
  monthly_shipment_limit: number
  settings: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  organization_id: string
  email: string
  full_name: string
  role: UserRole
  phone?: string
  whatsapp_number?: string
  avatar_url?: string
  is_active: boolean
  last_login_at?: string
  preferences: Record<string, unknown>
  created_at: string
  updated_at: string
}

// ============================================================
// REGULATORY
// ============================================================

export interface RegulatoryBody {
  id: string
  code: string
  name: string
  country: string
  website?: string
  contact_email?: string
  description?: string
  is_active: boolean
}

export interface RegulatoryRule {
  id: string
  regulatory_body_id: string
  rule_number: number
  name: string
  description?: string
  product_category: string
  risk_level: RiskFlag
  import_duty_rate_pct: number
  applies_to_countries: string[]
  documents_required: string[]
  pvoc_required: boolean
  estimated_process_days: number
  is_active: boolean
  regulatory_body?: RegulatoryBody
}

// ============================================================
// MODULE 1: SHIPMENTS (ICSM)
// ============================================================

export interface Shipment {
  id: string
  organization_id: string
  reference_number: string
  name: string
  manufacturer_id?: string
  clearing_agent_id?: string
  regulatory_body_id?: string
  regulatory_rule_id?: string
  purchase_order_id?: string

  // Logistics
  origin_port: string
  destination_port: string
  origin_country?: string
  hs_code?: string
  product_description?: string
  quantity?: number
  unit?: string
  weight_kg?: number
  container_type?: string
  vessel_name?: string
  bl_number?: string

  // Financials
  cif_value_usd: number
  import_duty_usd?: number
  vat_usd?: number
  idf_levy_usd?: number
  rdl_levy_usd?: number
  pvoc_fee_usd?: number
  clearing_fee_usd?: number
  storage_accrued_usd?: number
  total_landed_cost_usd?: number
  total_landed_cost_kes?: number
  exchange_rate_used: number
  storage_rate_per_day?: number

  // Compliance
  pvoc_deadline?: string
  eta?: string
  actual_arrival_date?: string
  clearance_date?: string
  risk_flag_status: RiskFlag
  remediation_status: RemediationStatus
  shipment_status: ShipmentStatus
  composite_risk_score: number
  open_action_count: number

  // AI
  ai_compliance_brief?: string
  ai_remediation_steps?: string
  ai_document_checklist?: string
  ai_tax_quotation?: string
  ai_generated_at?: string

  // Portal monitoring
  kentrade_ref?: string
  ppb_ref?: string
  kebs_ref?: string
  kra_entry_number?: string
  alert_sent_14d_at?: string
  alert_sent_7d_at?: string
  alert_sent_3d_at?: string

  notes?: string
  created_by?: string
  assigned_to?: string
  created_at: string
  updated_at: string
  deleted_at?: string

  // Joins
  manufacturer?: Manufacturer
  clearing_agent?: ClearingAgent
  regulatory_body?: RegulatoryBody
  risk?: ShipmentRisk
  portals?: ShipmentPortal[]
}

export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface ShipmentRisk {
  shipment_id:        string
  organization_id:    string
  days_to_deadline:   number
  cif_value_usd:      number
  delay_probability:  number
  risk_score:         number
  priority_level:     PriorityLevel
  risk_drivers:       string[]
  last_calculated_at: string
}

export interface Action {
  id:               string
  organization_id:  string
  shipment_id?:     string
  manufacturer_id?: string
  event_id?:        string
  action_type:      string
  priority:         PriorityLevel
  title:            string
  description?:     string
  trigger_reason?:  string
  expected_impact?: Record<string, unknown>
  confidence_score?: number
  assigned_to?:     string
  due_date?:        string
  status:           'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'DISMISSED'
  completed_at?:    string
  completion_signal?: 'EXPLICIT' | 'INFERRED' | 'TIMEOUT'
  effectiveness_score?: number
  evaluated_at?:    string
  outcome_id?:      string
  source:           'SYSTEM' | 'USER'
  created_at:       string
  updated_at:       string

  // Joins
  shipment?: Pick<Shipment, 'id' | 'name' | 'reference_number' | 'pvoc_deadline' | 'risk_flag_status'>
}

export interface ActionOutcome {
  id:               string
  action_id:        string
  shipment_id?:     string
  organization_id:  string
  action_type:      string
  regulator?:       string
  outcome_type?:    string
  delta_delay_days?: number
  success?:         boolean
  effectiveness_score?: number
  confidence_weight: number
  created_at:       string
}

export interface ActionEffectivenessModel {
  id:               string
  organization_id?: string
  action_type:      string
  regulator?:       string
  avg_effectiveness: number
  std_deviation:    number
  sample_size:      number
  ci_lower?:        number
  ci_upper?:        number
  last_updated:     string
}

export type PortalStatusEnum = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'

export interface ShipmentPortal {
  id: string
  organization_id: string
  shipment_id: string
  regulator: string
  status: PortalStatusEnum
  reference_number: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ShipmentDocument {
  id: string
  shipment_id: string
  organization_id: string
  document_type: string
  document_name: string
  file_url?: string
  file_size_bytes?: number
  is_required: boolean
  is_verified: boolean
  verified_by?: string
  verified_at?: string
  expires_at?: string
  notes?: string
  uploaded_by?: string
  created_at: string
}

// ============================================================
// MODULE 2: MANUFACTURER VAULT
// ============================================================

export interface Manufacturer {
  id: string
  organization_id: string
  company_name: string
  trading_name?: string
  country: string
  city?: string
  state?: string
  factory_address?: string
  website?: string
  primary_contact_name?: string
  primary_contact_email?: string
  primary_contact_phone?: string
  whatsapp_number?: string
  product_categories: string[]
  annual_revenue_usd?: number
  annual_capacity_usd?: number
  employee_count?: number
  years_in_business?: number
  is_vetted: boolean
  vetting_date?: string
  vetting_score?: number
  is_preferred_supplier: boolean
  is_blacklisted: boolean
  blacklist_reason?: string
  reliability_score: number
  financial_risk_score: number
  overall_risk: RiskFlag
  total_orders_placed: number
  orders_on_time: number
  orders_disputed: number
  minimum_order_usd?: number
  typical_payment_terms?: string
  typical_lead_time_days?: number
  notes?: string
  created_at: string
  updated_at: string
  deleted_at?: string

  // Joins
  licenses?: ManufacturerLicense[]
  audits?: FactoryAudit[]
  risk_signals?: FinancialRiskSignal[]
}

export interface ManufacturerLicense {
  id: string
  manufacturer_id: string
  organization_id: string
  license_type: string
  license_name: string
  license_number?: string
  issuing_body: string
  issuing_country: string
  scope?: string
  issued_date?: string
  expiry_date: string
  renewal_lead_time_days: number
  status: LicenseStatus
  alert_60_sent_at?: string
  alert_30_sent_at?: string
  alert_7_sent_at?: string
  alert_expired_sent_at?: string
  document_url?: string
  is_verified: boolean
  notes?: string
  created_at: string
  updated_at: string
}

export interface FactoryAudit {
  id: string
  manufacturer_id: string
  organization_id: string
  audit_agency_id?: string
  audit_type: string
  audit_scope?: string
  status: AuditStatus
  scheduled_date?: string
  conducted_date?: string
  overall_score?: number
  quality_mgmt_score?: number
  regulatory_score?: number
  capacity_score?: number
  financial_health_score?: number
  critical_findings?: string[]
  major_findings?: string[]
  recommendations?: string
  report_url?: string
  is_approved?: boolean
  approval_expires?: string
  india_recognized: boolean
  kenya_recognized: boolean
  lead_auditor_name?: string
  audit_fee_usd?: number
  created_at: string
  updated_at: string
  audit_agency?: AuditAgency
}

export interface AuditAgency {
  id: string
  name: string
  code?: string
  country: string
  is_india_accredited: boolean
  is_kenya_accredited: boolean
  is_eac_accredited: boolean
  contact_email?: string
  website?: string
  revenue_share_pct: number
  is_active: boolean
}

export interface FinancialRiskSignal {
  id: string
  manufacturer_id: string
  signal_type: string
  severity: RiskFlag
  title: string
  description: string
  source?: string
  detected_at: string
  is_resolved: boolean
  resolved_at?: string
}

// ============================================================
// MODULE 3: ORDER PROTECTION
// ============================================================

export interface PurchaseOrder {
  id: string
  organization_id: string
  manufacturer_id: string
  shipment_id?: string
  po_number: string
  status: POStatus
  po_value_usd: number
  advance_pct: number
  advance_paid_usd?: number
  advance_paid_date?: string
  balance_due_usd?: number
  order_date: string
  production_start_date?: string
  production_end_date?: string
  inspection_date?: string
  shipping_date?: string
  expected_delivery_date?: string
  actual_delivery_date?: string
  has_priority_clause: boolean
  has_penalty_clause: boolean
  penalty_per_day_usd?: number
  has_escrow: boolean
  manufacturer_risk_flag: RiskFlag
  product_name: string
  quantity?: number
  unit?: string
  contract_url?: string
  incoterms: string
  notes?: string
  created_at: string
  updated_at: string

  // Joins
  manufacturer?: Manufacturer
  milestones?: POMilestone[]
}

export interface POMilestone {
  id: string
  purchase_order_id: string
  organization_id: string
  name: string
  description?: string
  milestone_type?: string
  sequence_number?: number
  due_date: string
  completed_date?: string
  is_completed: boolean
  is_overdue: boolean
  triggers_payment: boolean
  payment_amount_usd?: number
  evidence_urls?: string[]
  created_at: string
}

// ============================================================
// MODULE 4: PRODUCT CERTIFICATION
// ============================================================

export interface ProductCertification {
  id: string
  organization_id: string
  manufacturer_id?: string
  audit_agency_id?: string
  product_name: string
  product_category: string
  hs_code?: string
  certification_type: string
  certificate_number?: string
  status: CertStatus
  india_cert_required: boolean
  india_approved: boolean
  india_expiry_date?: string
  kenya_cert_required: boolean
  kenya_approved: boolean
  kenya_expiry_date?: string
  lab_test_completed: boolean
  lab_report_url?: string
  test_passed?: boolean
  alert_60_sent_at?: string
  alert_30_sent_at?: string
  certification_fee_usd?: number
  created_at: string
  updated_at: string
}

// ============================================================
// MODULE 5: CLEARING AGENTS
// ============================================================

export interface ClearingAgent {
  id: string
  organization_id: string
  company_name: string
  license_number?: string
  license_expiry?: string
  license_status: LicenseStatus
  email?: string
  phone?: string
  whatsapp_number?: string
  ports_covered: string[]
  specializations: string[]
  performance_score: number
  avg_clearance_days?: number
  total_shipments_cleared: number
  is_preferred: boolean
  is_active: boolean
  created_at: string
}

// ============================================================
// MODULE 6: ALERTS
// ============================================================

export interface Alert {
  id: string
  organization_id: string
  alert_type: AlertType
  severity: RiskFlag
  title: string
  message: string
  action_required?: string
  shipment_id?: string
  manufacturer_id?: string
  license_id?: string
  purchase_order_id?: string
  certification_id?: string
  channels: AlertChannel[]
  is_read: boolean
  is_actioned: boolean
  actioned_at?: string
  sent_at?: string
  created_at: string
}

// ============================================================
// INTELLIGENCE
// ============================================================

export interface HSCode {
  id: string
  code: string
  description: string
  import_duty_rate_pct?: number
  vat_applicable: boolean
  pvoc_required: boolean
  product_category?: string
}

export interface ForexRate {
  id: string
  base_currency: string
  target_currency: string
  rate: number
  source: string
  recorded_at: string
}

export interface PortAlert {
  id: string
  port_name: string
  alert_type: string
  severity: RiskFlag
  title: string
  description: string
  estimated_delay_days?: number
  is_active: boolean
  started_at?: string
  created_at: string
}

// ============================================================
// COMPUTED / DASHBOARD TYPES
// ============================================================

export interface DashboardKPIs {
  total_shipments: number
  total_landed_cost_usd: number
  total_landed_cost_kes: number
  risk_distribution: Record<RiskFlag, number>
  compliance_status: Record<RemediationStatus, number>
  expiring_licenses_30d: number
  overdue_milestones: number
  active_port_alerts: number
  unread_alerts: number
}

export interface ManufacturerSummary {
  total: number
  vetted: number
  preferred: number
  blacklisted: number
  avg_reliability_score: number
  expiring_licenses: number
}
