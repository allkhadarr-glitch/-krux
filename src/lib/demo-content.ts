/**
 * Pre-written demo content for all 5 demo shipments.
 * Served instantly in demo mode — no API call, no spinner, no risk.
 */

type TabKey = 'brief' | 'remediation' | 'checklist'

interface DemoShipmentContent {
  pattern: string   // matched against shipment.name
  brief:       string
  remediation: string
  checklist:   string
}

const JET_A1: DemoShipmentContent = {
  pattern: 'Jet A-1',

  brief: `KRUX COMPLIANCE BRIEF
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EPRA — Energy and Petroleum Regulatory Authority
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠  CLEARANCE WINDOW CLOSED

EPRA requires a minimum of 25 working days to process a petroleum
import permit under the Energy Act 2019 (Section 47). Only 2 days
remain to your PVoC deadline. This shipment cannot be legally
cleared on time. Every hour of delay increases your exposure.

SHIPMENT : Jet A-1 Aviation Fuel — 500KL
HS CODE  : 2710.19.11  (Kerosene-type jet fuel, aviation turbine fuel)
CIF VALUE: USD 620,000  (KES 79,980,000)
LANDED   : KES 96,055,200
CLIENT   : Kapa Oil Ltd

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGULATORY POSITION — EPRA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Authority : Energy and Petroleum Regulatory Authority (EPRA)
Statute   : Energy Act 2019, Section 47 — Petroleum Import Permit
SLA       : 25 working days from complete application

Required documents status:
  ✗ Petroleum Import Permit (PIP) — NOT FILED
  ✗ ASTM D1655 aviation fuel specification sheet — NOT SUBMITTED
  ✗ Kenya Pipeline Company tank availability confirmation — PENDING
  ✗ Insurance certificate covering pipeline transfer — NOT SUBMITTED
  ✓ Bill of Lading (Jebel Ali → Mombasa) — CONFIRMED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HS CODE ALERT — MISCLASSIFICATION RISK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Declared  : HS 2710.19.11 — Jet A-1 (aviation turbine fuel) → 0% duty ✓
Risk code : HS 2710.19.90 — Other petroleum oils → 25% duty

If KRA reclassifies this shipment to 2710.19.90:
  Import duty penalty: USD 155,000  (KES 19,995,000)
  Late filing penalty: 2% CIF/month = additional KES 2,065,800/month
  Criminal liability possible under Customs & Excise Act, Section 209

You must present the ASTM D1655 spec sheet and the aviation fuel
purchase agreement to KRA customs at Mombasa entry to lock the
2710.19.11 classification before cargo is examined.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COST EXPOSURE IF DEADLINE MISSED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Daily storage at JKIA tank farm : KES 180/day per 1,000L × 500KL = KES 90,000/day
30-day delay storage alone      : KES 2,700,000
EPRA late filing penalty        : up to KES 500,000  (Energy Act 2019, s.47)
KPA demurrage (vessel held)     : ~USD 5,000/day
HS misclassification penalty    : KES 19,995,000

Total exposure (30-day delay scenario): ~KES 24,000,000+

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Verified against EPRA Energy Act 2019 + KRA EAC CET, April 2026
KRUX · Kenya Import Compliance Intelligence · krux-xi.vercel.app`,

  remediation: `KRUX REMEDIATION STEPS — JET A-1 / EPRA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Clearance is impossible before the PVoC deadline.
These steps limit your financial and legal exposure.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 1 — FILE EPRA PERMIT NOW  (today, next 2 hours)
  Portal: epra.go.ke/licensing
  Form: Petroleum Import Permit (PIP) application
  Attach: ASTM D1655 specification sheet, BoL, commercial invoice
  Why: Filing creates a legal record. Even with no chance of on-time
  approval, regulators treat a filed-but-pending application as
  evidence of good faith, which materially reduces penalty exposure.

STEP 2 — CALL EPRA DIRECTOR-GENERAL  (today)
  Number: +254-20-3201202 (EPRA headquarters, Nairobi)
  Request: Expedited review citing operational necessity and
  prior booking commitment with Kenya Pipeline Company (KPC).
  EPRA has a discretionary fast-track process for operationally
  critical petroleum imports — but it must be requested directly.

STEP 3 — ENGAGE KRA CUSTOMS IN ADVANCE  (today)
  Action: Submit a pre-entry classification ruling request to KRA
  Customs confirming HS 2710.19.11 (Jet A-1, 0% duty) before
  the cargo is physically examined at Mombasa port.
  Portal: kra.go.ke/itax → Customs → Pre-entry Classification
  Critical: This locks your duty rate and prevents the KES 19.9M
  misclassification penalty from being applied retroactively.

STEP 4 — ARRANGE INTERIM KPC STORAGE  (within 24 hours)
  Contact: Kenya Pipeline Company, Mombasa: +254-41-2230061
  Request: Emergency holding capacity at JKIA or Mombasa tank farm
  for 500,000 litres Jet A-1 while EPRA permit is processed.
  Without approved storage, cargo may be reexported at your cost.

STEP 5 — PREPARE LEGAL POSITION  (within 48 hours)
  Engage your customs lawyer to prepare a formal Force Majeure
  letter for EPRA citing the processing timeline versus the
  deadline date. This creates a legal basis for penalty reduction
  if EPRA issues a fine post-clearance.

STEP 6 — BRIEF YOUR CLIENT  (today, after Step 1)
  Kapa Oil Ltd must be informed of the delay and the regulatory
  position. Delay this conversation and you lose the relationship;
  have it with a plan in hand and you demonstrate professionalism.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KRUX · Kenya Import Compliance · krux-xi.vercel.app`,

  checklist: `KRUX DOCUMENT CHECKLIST — JET A-1 AVIATION FUEL / EPRA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HS 2710.19.11 · CIF USD 620,000 · Jebel Ali → Mombasa
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CRITICAL — EPRA (Energy and Petroleum Regulatory Authority)
  ✗ Petroleum Import Permit (PIP) — Energy Act 2019, s.47
      NOT FILED. File at epra.go.ke/licensing immediately.
  ✗ ASTM D1655 Aviation Fuel Specification Certificate
      Confirms Jet A-1 product identity. Required for HS classification.
  ✗ EPRA-recognised petroleum trader registration
      Must be on EPRA's licensed importer list. Verify before filing.
  ✓ Bill of Lading — Jebel Ali → Mombasa (signed, telex released)
  ✗ Insurance certificate — pipeline transfer coverage required

KRA CUSTOMS — HS CLASSIFICATION PROTECTION
  ✗ Pre-entry classification ruling: HS 2710.19.11 (0% duty)
      Prevents reclassification to 2710.19.90 (25% duty = KES 19.9M)
  ✓ Commercial invoice (USD 620,000 — CIF Mombasa)
  ✓ Packing list with litreage breakdown
  ✗ Import Declaration Form (IDF) — lodged on KRA iTax portal
  ✗ Certificate of Origin (UAE — confirms source country for EAC CET)

KENYA PIPELINE COMPANY (KPC) — STORAGE
  ✗ KPC tank allocation confirmation letter (500KL capacity)
      Without this: cargo may be refused discharge. Call: +254-41-2230061
  ✗ NEMA environmental compliance letter for fuel storage
      Required for any new tank allocation exceeding 200KL

SHIPPING / PORT
  ✓ Arrival Notice — vessel expected at Mombasa
  ✗ Kenya Ports Authority (KPA) import entry declaration
  ✗ SGS / Bureau Veritas pre-shipment inspection certificate
      Required by EPRA for petroleum products above USD 500,000 CIF

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MISSING: 10 of 14 documents not confirmed
EPRA will not process your application without documents 1–5 above.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KRUX · Kenya Import Compliance · krux-xi.vercel.app`,
}

const PYRETHROID: DemoShipmentContent = {
  pattern: 'Pyrethroid',

  brief: `KRUX COMPLIANCE BRIEF
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KEPHIS — Kenya Plant Health Inspectorate Service
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 CRITICAL — 1 DAY TO DEADLINE

SHIPMENT : Pyrethroid Pesticide — Lot P2024
HS CODE  : 3808.91  (Insecticides based on pyrethroids)
CIF VALUE: USD 38,000  (KES 4,902,000)
LANDED   : KES 7,394,925
CLIENT   : Bidco Africa Ltd

KEPHIS requires 7 working days to process phytosanitary clearance.
You have 1 day remaining. The clearance window is closed. PCPB
(Pest Control Products Board) approval is also outstanding — without
it, this shipment cannot legally enter Kenya regardless of PVoC status.

Required documents status:
  ✗ KEPHIS Phytosanitary Import Permit — NOT FILED
  ✗ PCPB import permit — NOT CONFIRMED
  ✓ Manufacturer's MSDS (Material Safety Data Sheet)
  ✓ Certificate of Analysis — Chennai laboratory
  ✗ Country of origin phytosanitary certificate — STILL IN TRANSIT

IMMEDIATE ACTIONS
  1. CALL KEPHIS NOW — +254-20-3536171. Request emergency clearance.
  2. CONFIRM PCPB REGISTRATION — pcpb.or.ke. If not registered,
     the shipment cannot legally enter Kenya under any circumstance.
  3. ARRANGE CONTROLLED STORAGE under Pest Control Products Act.

COST EXPOSURE
  Storage: KES 1,900/day (50 × 200L drums)
  Destruction order risk if PCPB unregistered: Full KES 7.4M loss
  KPA demurrage: ~USD 2,000/day if vessel waiting

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Verified against KEPHIS + PCPB regulations, April 2026
KRUX · Kenya Import Compliance Intelligence`,

  remediation: `KRUX REMEDIATION STEPS — PYRETHROID PESTICIDE / KEPHIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 1 — CALL KEPHIS DIRECTLY  (now)
  +254-20-3536171 (KEPHIS headquarters, Nairobi)
  Request emergency clearance protocol for cargo already at port.

STEP 2 — VERIFY PCPB REGISTRATION  (within 1 hour)
  Check pcpb.or.ke for active registration of this product.
  Without PCPB approval, clearance is legally blocked regardless.

STEP 3 — FILE PCPB IMPORT PERMIT  (today)
  If not yet filed: pest.pcpb.or.ke — attach MSDS + CoA + BoL.

STEP 4 — ARRANGE CONTROLLED STORAGE  (today)
  Pesticides require licensed storage under Pest Control Products Act.
  Confirm holding facility with KEPHIS officer.

STEP 5 — BRIEF BIDCO AFRICA  (today)
  Client must know the position. Have the PCPB answer first.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KRUX · Kenya Import Compliance · krux-xi.vercel.app`,

  checklist: `KRUX DOCUMENT CHECKLIST — PYRETHROID PESTICIDE / KEPHIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

KEPHIS
  ✗ Phytosanitary Import Permit — NOT FILED
  ✓ Certificate of Analysis (Chennai lab)
  ✓ MSDS — Material Safety Data Sheet
  ✗ Origin phytosanitary certificate — IN TRANSIT

PCPB
  ✗ Import permit — NOT CONFIRMED
  ✗ Product registration number (Kenya)

KRA CUSTOMS
  ✓ Commercial invoice
  ✓ Bill of Lading (Chennai → Mombasa)
  ✗ Import Declaration Form (IDF) on iTax

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MISSING: 5 of 8 documents. File PCPB + KEPHIS today.
KRUX · Kenya Import Compliance · krux-xi.vercel.app`,
}

const AMOXICILLIN: DemoShipmentContent = {
  pattern: 'Amoxicillin',

  brief: `KRUX COMPLIANCE BRIEF
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PPB — Pharmacy and Poisons Board
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠  CLEARANCE WINDOW CLOSED

SHIPMENT : Amoxicillin 500mg — Batch K23B
HS CODE  : 3004.20  (Medicaments containing antibiotics)
CIF VALUE: USD 45,000  (KES 5,805,000)
LANDED   : KES 8,738,138
CLIENT   : Bidco Africa Ltd

PPB requires 45 working days — the longest SLA of all 8 regulators.
Only 8 days remain. Clearance is mathematically impossible. File all
documents now to establish a record and reduce penalty exposure.

Required documents status:
  ✗ PPB Import Permit (Form PPB/IMP/1) — NOT FILED
  ✓ Product Kenya registration (Reg. #KE/PPB/ANTI/2021) — CONFIRMED
  ✗ Certificate of Analysis from Zhejiang Pharma — NOT SUBMITTED
  ✗ WHO-GMP certificate (China NMPA) — PENDING SUBMISSION
  ✓ Commercial invoice + packing list

⚠ MANUFACTURER ALERT: Zhejiang Pharma Co. WHO-GMP certificate
  expires in 35 days. Renewal takes 60+ days. Begin immediately
  or future shipments from this supplier will be blocked by PPB.

COST EXPOSURE
  PPB late import penalty: up to KES 500,000 per consignment
  Destruction order risk: Pharmaceuticals may be ordered destroyed
  Revenue delay (100,000 units off market): KES 3–5M estimated

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Verified against PPB Pharmacy & Poisons Act (Cap.244), April 2026
KRUX · Kenya Import Compliance Intelligence`,

  remediation: `KRUX REMEDIATION STEPS — AMOXICILLIN / PPB
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 1 — FILE PPB IMPORT PERMIT  (today)
  portal.ppb.go.ke → Form PPB/IMP/1
  Attach: CoA from Zhejiang Pharma + WHO-GMP certificate
  Purpose: Creates legal record even with no chance of on-time approval.

STEP 2 — REQUEST LEGAL DELAY NOTICE FROM PPB  (within 48 hours)
  Formal written notice limits liability under Pharmacy & Poisons
  Act, Section 27. Request from PPB Legal Officer.

STEP 3 — INITIATE WHO-GMP RENEWAL  (this week)
  Manufacturer's WHO-GMP expires in 35 days. Renewal: 60+ days.
  Contact Zhejiang Pharma today. This affects all future PPB imports.

STEP 4 — ARRANGE PHARMA-GRADE HOLDING STORAGE  (today)
  PPB requires temperature-controlled storage for antibiotics.
  Confirm cold chain facility at Mombasa port with PPB-licensed warehouse.

STEP 5 — BRIEF BIDCO AFRICA  (today, with Step 1 filed)
  Go with a plan: "We've filed, we've engaged PPB legal, here's
  the timeline." That's a manageable conversation.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KRUX · Kenya Import Compliance · krux-xi.vercel.app`,

  checklist: `KRUX DOCUMENT CHECKLIST — AMOXICILLIN 500MG / PPB
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PPB
  ✗ Import Permit (Form PPB/IMP/1) — NOT FILED
  ✓ Product registration: KE/PPB/ANTI/2021
  ✗ Certificate of Analysis — Zhejiang Pharma, batch-specific
  ✗ WHO-GMP certificate — China NMPA (must be current)
  ✗ Manufacturer authorisation letter

KRA CUSTOMS
  ✓ Commercial invoice (USD 45,000 CIF)
  ✓ Bill of Lading (Shanghai → Mombasa)
  ✗ Import Declaration Form (IDF) on KRA iTax
  ✗ KEBS PVoC Certificate of Conformity

STORAGE
  ✗ PPB-approved cold chain storage facility confirmation
      Required for temperature-sensitive pharmaceuticals

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MISSING: 7 of 10 documents. File PPB permit today.
KRUX · Kenya Import Compliance · krux-xi.vercel.app`,
}

const NPK: DemoShipmentContent = {
  pattern: 'NPK Fertilizer',

  brief: `KRUX COMPLIANCE BRIEF
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PCPB — Pest Control Products Board
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🟡 MANAGEABLE — ACT TODAY

SHIPMENT : NPK Fertilizer 20-10-10 — 50MT
HS CODE  : 3105.20  (Mineral or chemical fertilisers — NPK)
CIF VALUE: USD 28,000  (KES 3,612,000)
LANDED   : KES 4,847,562
CLIENT   : Twiga Foods Ltd

PCPB requires 21 working days. You have 21 days remaining.
This is the edge of the clearance window. File all documents today
to stay in safe territory. One week's delay puts this in the
impossible window and risks the same situation as Jet A-1.

Required documents status:
  ✓ PCPB import permit application filed
  ✓ Manufacturer's certificate of analysis (NPK 20-10-10 confirmed)
  ✓ Gujarat Agrochem Industries — PCPB registered supplier
  ✗ KEBS agricultural input standard mark approval — PENDING
  ✗ Phytosanitary certificate from India — IN TRANSIT

RECOMMENDED ACTIONS (this week)
  1. Chase KEBS agricultural input approval — kebs.org/certification
     This is blocking PCPB final clearance.
  2. Confirm phytosanitary cert is couriered from India urgently.
  3. Verify Gujarat Agrochem is on PCPB's approved exporter list.

STATUS: This shipment is salvageable. Act today.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Verified against PCPB + Fertilizers Act (Cap. 345), April 2026
KRUX · Kenya Import Compliance Intelligence`,

  remediation: `KRUX REMEDIATION STEPS — NPK FERTILIZER / PCPB
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This shipment is manageable. Follow these steps this week.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 1 — CHASE KEBS AGRICULTURAL INPUT APPROVAL  (today)
  kebs.org/certification — apply for KEBS agricultural standard mark.
  Without this, PCPB will not issue final clearance.

STEP 2 — CONFIRM PHYTOSANITARY CERT DISPATCH  (today)
  Contact Gujarat Agrochem: courier the origin phytosanitary
  certificate immediately. Must arrive before vessel reaches Mombasa.

STEP 3 — VERIFY PCPB APPROVED EXPORTER LIST  (today)
  Confirm Gujarat Agrochem Industries is on pcpb.or.ke approved list.
  If not: escalate to PCPB directly before vessel departs India.

STEP 4 — LODGE IDF ON KRA ITAX  (this week)
  File Import Declaration Form before cargo arrives at Mombasa.
  HS 3105.20 carries 10% import duty — confirm rate on KRA iTax.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KRUX · Kenya Import Compliance · krux-xi.vercel.app`,

  checklist: `KRUX DOCUMENT CHECKLIST — NPK FERTILIZER / PCPB
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PCPB
  ✓ Import permit application filed
  ✓ Certificate of Analysis (NPK 20-10-10 ratio confirmed)
  ✓ Gujarat Agrochem — PCPB registered supplier
  ✗ KEBS agricultural input standard mark — PENDING
  ✗ Origin phytosanitary certificate (India) — IN TRANSIT

KRA CUSTOMS
  ✓ Commercial invoice (USD 28,000 CIF)
  ✓ Bill of Lading (Mundra → Mombasa)
  ✗ Import Declaration Form (IDF) on KRA iTax

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MISSING: 3 of 8 documents. Resolve KEBS + phyto this week.
KRUX · Kenya Import Compliance · krux-xi.vercel.app`,
}

const LED: DemoShipmentContent = {
  pattern: 'LED Panel',

  brief: `KRUX COMPLIANCE BRIEF
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KEBS — Kenya Bureau of Standards
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🟢 ON TRACK — NO IMMEDIATE RISK

SHIPMENT : LED Panel Lighting Kit — CR2024
HS CODE  : 9405.40  (Other electric lamps and lighting fittings)
CIF VALUE: USD 15,000  (KES 1,935,000)
LANDED   : KES 2,981,512
CLIENT   : Kapa Oil Ltd

KEBS requires 14 working days. You have 44 days remaining.
This shipment is in a safe window and does not require escalation.
Complete the standard PVoC process this week to stay on track.

Required documents status:
  ✓ KEBS PVoC application — filed
  ✓ IEC 60598 safety certification (China CQC lab)
  ✓ Commercial invoice and packing list
  ✗ KEBS import inspection appointment — BOOK NOW

RECOMMENDED ACTIONS (this week)
  1. Book KEBS inspection: kebs.org/pvoc. LED lighting is a
     mandatory PVoC product category. Book within 7 days.
  2. Confirm IEC 60598 certificate is from a CNAS-accredited lab.
     KEBS only accepts accredited Chinese laboratories.
  3. Prepare KEBS Certificate of Conformity — will travel
     with cargo manifest on clearance.

This is your healthiest shipment. Keep it this way.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Verified against KEBS Standards Act (Cap. 496), April 2026
KRUX · Kenya Import Compliance Intelligence`,

  remediation: `KRUX REMEDIATION STEPS — LED PANEL / KEBS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This shipment is on track. Follow standard process.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 1 — BOOK KEBS INSPECTION  (this week)
  kebs.org/pvoc → book inspection slot for LED lighting.
  LED is a mandatory PVoC category — don't skip this step.

STEP 2 — CONFIRM IEC CERT VALIDITY  (this week)
  IEC 60598 must be from a CNAS-accredited Chinese test lab.
  Verify certificate issuer before KEBS inspection appointment.

STEP 3 — PREPARE KEBS COC  (on clearance)
  Certificate of Conformity issued post-PVoC. Must accompany
  cargo manifest on entry. Request on completion of inspection.

STEP 4 — FILE KRA IDF  (before vessel arrives)
  Import Declaration Form on KRA iTax. HS 9405.40: 25% duty.
  Confirm rate before filing to avoid amendment penalties.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KRUX · Kenya Import Compliance · krux-xi.vercel.app`,

  checklist: `KRUX DOCUMENT CHECKLIST — LED PANEL LIGHTING / KEBS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

KEBS / PVoC
  ✓ PVoC application filed
  ✓ IEC 60598 certificate (CNAS-accredited lab, China)
  ✗ KEBS inspection appointment — BOOK THIS WEEK
  ✗ Certificate of Conformity (CoC) — issued post-inspection

KRA CUSTOMS
  ✓ Commercial invoice (USD 15,000 CIF)
  ✓ Bill of Lading (Shenzhen → Mombasa)
  ✗ Import Declaration Form (IDF) on KRA iTax
      HS 9405.40 → 25% import duty + 16% VAT + IDF 2% + RDL 1.5%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MISSING: 3 of 7 — all low-urgency. Complete by next week.
KRUX · Kenya Import Compliance · krux-xi.vercel.app`,
}

const DEMO_SHIPMENTS: DemoShipmentContent[] = [JET_A1, PYRETHROID, AMOXICILLIN, NPK, LED]

export function getDemoContent(shipmentName: string, tab: TabKey): string | null {
  const match = DEMO_SHIPMENTS.find((s) => shipmentName.includes(s.pattern))
  if (!match) return null
  return match[tab] ?? null
}
