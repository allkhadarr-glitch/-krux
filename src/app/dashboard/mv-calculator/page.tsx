'use client'
import { useState, useMemo } from 'react'
import { Car, Calculator, AlertTriangle, Info, ChevronDown, ChevronUp } from 'lucide-react'

// Kenya Finance Act excise duty on imported motor vehicles
// Applied on: CIF + import duty (customs value)
const EXCISE_BANDS = [
  { maxCC: 1000, label: '≤ 1000cc',         pct: 15 },
  { maxCC: 1500, label: '1001 – 1500cc',     pct: 20 },
  { maxCC: 2000, label: '1501 – 2000cc',     pct: 25 },
  { maxCC: 3000, label: '2001 – 3000cc',     pct: 30 },
  { maxCC: 9999, label: '> 3000cc',          pct: 35 },
]

const VEHICLE_TYPES = [
  { key: 'PASSENGER',  label: 'Passenger vehicle',     dutyPct: 35, excise: true,  note: 'Saloons, hatchbacks, station wagons, SUVs, double-cab pickups (HS 8703)' },
  { key: 'GOODS',      label: 'Light goods vehicle',   dutyPct: 25, excise: false, note: 'Single-cab pickups, vans, panel vans ≤ 5T GVW (HS 8704)' },
  { key: 'MOTORCYCLE', label: 'Motorcycle (boda boda)', dutyPct: 25, excise: false, note: 'Motorcycles 50–250cc. Excise duty waived (Finance Act 2022). PVoC required (HS 8711).' },
  { key: 'TRUCK',      label: 'Heavy truck / lorry',   dutyPct: 25, excise: false, note: 'Goods vehicles > 5T GVW (HS 8704). NTSA axle load inspection mandatory.' },
  { key: 'BUS',        label: 'Bus / minibus',          dutyPct: 25, excise: false, note: 'PSV vehicles — additional NTSA PSV licensing required (HS 8702).' },
]

const POPULAR_MODELS = [
  { make: 'Toyota', model: 'Probox',        year: 2018, cc: 1500, cif: 5500  },
  { make: 'Toyota', model: 'Fielder',       year: 2017, cc: 1500, cif: 7000  },
  { make: 'Toyota', model: 'Land Cruiser',  year: 2019, cc: 4500, cif: 45000 },
  { make: 'Toyota', model: 'Hilux (D/C)',   year: 2020, cc: 2800, cif: 22000 },
  { make: 'Nissan', model: 'March',         year: 2018, cc: 1200, cif: 5000  },
  { make: 'Nissan', model: 'X-Trail',       year: 2019, cc: 2000, cif: 18000 },
  { make: 'Honda',  model: 'Fit',           year: 2018, cc: 1300, cif: 5500  },
  { make: 'Subaru', model: 'Forester',      year: 2019, cc: 2000, cif: 16000 },
]

const KES_RATE = 130 // fallback — real rate loaded from FX API

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
function fmtUSD(n: number) { return `$${fmt(Math.round(n))}` }
function fmtKES(n: number) { return `KES ${fmt(Math.round(n))}` }

export default function MVCalculatorPage() {
  const currentYear = new Date().getFullYear()

  const [cifUSD, setCifUSD]       = useState('')
  const [makeYear, setMakeYear]   = useState('')
  const [make, setMake]           = useState('')
  const [model, setModel]         = useState('')
  const [engineCC, setEngineCC]   = useState('')
  const [vtype, setVtype]         = useState('PASSENGER')
  const [kesRate, setKesRate]     = useState(KES_RATE)
  const [showBreakdown, setShowBreakdown] = useState(true)

  // Load live KES rate
  useState(() => {
    fetch('/api/fx/rate')
      .then(r => r.json())
      .then(d => { if (d.usd_kes) setKesRate(d.usd_kes) })
      .catch(() => {})
  })

  const typeProfile = VEHICLE_TYPES.find(t => t.key === vtype)!

  const vehicleAge = makeYear ? currentYear - Number(makeYear) : null

  const exciseBand = useMemo(() => {
    const cc = Number(engineCC)
    if (!cc) return EXCISE_BANDS[1] // default 1500cc band
    return EXCISE_BANDS.find(b => cc <= b.maxCC) ?? EXCISE_BANDS[EXCISE_BANDS.length - 1]
  }, [engineCC])

  const calc = useMemo(() => {
    const cif = Number(cifUSD)
    if (!cif || cif <= 0) return null

    const dutyPct    = typeProfile.dutyPct
    const duty       = cif * (dutyPct / 100)
    const excisePct  = typeProfile.excise ? exciseBand.pct : 0
    const excise     = typeProfile.excise ? (cif + duty) * (excisePct / 100) : 0
    const idf        = cif * 0.02
    const rdl        = cif * 0.015
    const vatBase    = cif + duty + excise
    const vat        = vatBase * 0.16
    const pvoc       = 500          // KEBS PVoC fee (USD)
    const clearing   = 800          // clearing agent fee (USD)
    const ntsa       = 38           // NTSA registration ~KES 5,000
    const rpb        = vehicleAge && vehicleAge >= 1 ? 8 : 0 // RPB inspection KES 1,000 for used
    const totalUSD   = cif + duty + excise + idf + rdl + vat + pvoc + clearing + ntsa + rpb
    const totalKES   = totalUSD * kesRate

    // Age surcharge warning: KRA may uplift customs value for vehicles older than 5 years
    const ageSurcharge = vehicleAge && vehicleAge > 5

    return {
      cif, duty, dutyPct, excise, excisePct, idf, rdl, vat, vatBase,
      pvoc, clearing, ntsa, rpb, totalUSD, totalKES,
      ageSurcharge, vehicleAge,
      dutyRatioOfTotal: totalUSD > 0 ? (duty + excise + vat) / totalUSD : 0,
    }
  }, [cifUSD, typeProfile, exciseBand, kesRate, vehicleAge])

  function loadPreset(p: typeof POPULAR_MODELS[0]) {
    setCifUSD(String(p.cif))
    setMakeYear(String(p.year))
    setMake(p.make)
    setModel(p.model)
    setEngineCC(String(p.cc))
    setVtype('PASSENGER')
    setShowBreakdown(true)
  }

  const ageOk = vehicleAge !== null && vehicleAge <= 8
  const ageTooOld = vehicleAge !== null && vehicleAge > 8

  return (
    <div className="px-3 lg:px-6 py-5 lg:py-8 max-w-4xl space-y-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-[#00C896]/15 flex items-center justify-center">
            <Car size={18} className="text-[#00C896]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Motor Vehicle Duty Calculator</h1>
            <p className="text-xs text-[#64748B] mt-0.5">Kenya import — full duty stack: KRA CRSP · Excise · VAT · IDF · RDL</p>
          </div>
        </div>
      </div>

      {/* Age limit warning */}
      {ageTooOld && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-400">Vehicle too old to import</p>
            <p className="text-xs text-red-400/70 mt-0.5">Kenya's 8-year age limit: a {makeYear} vehicle is {vehicleAge} years old. KRA will reject clearance. Only right-hand drive vehicles from eligible origins accepted.</p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">

        {/* ── Input panel ── */}
        <div className="space-y-4">
          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-white">Vehicle Details</h2>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Make (optional)">
                <input value={make} onChange={e => setMake(e.target.value)}
                  placeholder="e.g. Toyota" className={INPUT} />
              </Field>
              <Field label="Model (optional)">
                <input value={model} onChange={e => setModel(e.target.value)}
                  placeholder="e.g. Probox" className={INPUT} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Year of Manufacture">
                <input
                  type="number" min={currentYear - 8} max={currentYear}
                  value={makeYear} onChange={e => setMakeYear(e.target.value)}
                  placeholder={`${currentYear - 8}–${currentYear}`} className={INPUT}
                />
              </Field>
              <Field label="Engine CC">
                <input
                  type="number" min={50} max={10000}
                  value={engineCC} onChange={e => setEngineCC(e.target.value)}
                  placeholder="e.g. 1500" className={INPUT}
                />
              </Field>
            </div>

            <Field label="CIF Value (USD)">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] text-sm">$</span>
                <input
                  type="number" min={0}
                  value={cifUSD} onChange={e => setCifUSD(e.target.value)}
                  placeholder="e.g. 6800"
                  className={INPUT + ' pl-6'}
                />
              </div>
              <p className="text-xs text-[#334155] mt-1">CIF = Cost + Insurance + Freight to Mombasa port</p>
            </Field>

            <Field label="Vehicle Type">
              <select value={vtype} onChange={e => setVtype(e.target.value)} className={INPUT}>
                {VEHICLE_TYPES.map(t => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
              <p className="text-xs text-[#334155] mt-1">{typeProfile.note}</p>
            </Field>

            {typeProfile.excise && (
              <div className="bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2.5">
                <p className="text-xs font-bold text-[#64748B] uppercase tracking-wide mb-2">Excise Duty by Engine Size</p>
                <div className="grid grid-cols-5 gap-1">
                  {EXCISE_BANDS.map(b => (
                    <div key={b.maxCC}
                      className={`rounded px-1.5 py-1.5 text-center transition-all ${
                        exciseBand.maxCC === b.maxCC
                          ? 'bg-amber-400/15 border border-amber-400/40'
                          : 'border border-transparent'
                      }`}
                    >
                      <div className={`text-xs font-black ${exciseBand.maxCC === b.maxCC ? 'text-amber-400' : 'text-[#64748B]'}`}>{b.pct}%</div>
                      <div className="text-[8px] text-[#334155] leading-tight">{b.label.replace('≤ ', '≤').replace(' – ', '–')}</div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[#334155] mt-2">Applied on: CIF + Import Duty. Finance Act 2023.</p>
              </div>
            )}
          </div>

          {/* Quick presets */}
          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-4">
            <p className="text-xs font-bold text-[#64748B] uppercase tracking-wide mb-3">Popular vehicles — click to load</p>
            <div className="grid grid-cols-2 gap-1.5">
              {POPULAR_MODELS.map((p) => (
                <button key={`${p.make}-${p.model}`} onClick={() => loadPreset(p)}
                  className="text-left px-3 py-2 rounded-lg border border-[#1E3A5F] hover:border-[#00C896]/30 hover:bg-[#00C896]/5 transition-all group">
                  <div className="text-xs font-semibold text-white group-hover:text-[#00C896]">{p.make} {p.model}</div>
                  <div className="text-xs text-[#64748B]">{p.year} · {p.cc}cc · ${fmt(p.cif)}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Results panel ── */}
        <div className="space-y-4">
          {calc ? (
            <>
              {/* Hero total */}
              <div className="bg-gradient-to-br from-[#0F2040] to-[#0A1628] border border-[#00C896]/20 rounded-2xl p-6 text-center">
                <p className="text-xs font-bold text-[#64748B] uppercase tracking-wide mb-1">Total Landed Cost</p>
                <div className="text-3xl font-black text-[#00C896] tabular-nums">{fmtKES(calc.totalKES)}</div>
                <div className="text-sm text-[#64748B] mt-1">{fmtUSD(calc.totalUSD)}</div>
                <div className="text-xs text-[#334155] mt-1">@ KES {kesRate.toFixed(1)}/USD · {make || 'Vehicle'} {model} {makeYear}</div>

                {/* Tax ratio bar */}
                <div className="mt-4">
                  <div className="h-2 bg-[#0A1628] rounded-full overflow-hidden flex">
                    <div className="h-full bg-[#00C896]" style={{ width: `${Math.round((calc.cif / calc.totalUSD) * 100)}%` }} title="CIF" />
                    <div className="h-full bg-amber-400" style={{ width: `${Math.round((calc.duty / calc.totalUSD) * 100)}%` }} title="Import duty" />
                    {calc.excise > 0 && <div className="h-full bg-red-400" style={{ width: `${Math.round((calc.excise / calc.totalUSD) * 100)}%` }} title="Excise" />}
                    <div className="h-full bg-blue-400" style={{ width: `${Math.round((calc.vat / calc.totalUSD) * 100)}%` }} title="VAT" />
                    <div className="h-full bg-[#334155]" style={{ width: `${Math.round(((calc.idf + calc.rdl + calc.pvoc + calc.clearing + calc.ntsa + calc.rpb) / calc.totalUSD) * 100)}%` }} />
                  </div>
                  <div className="flex justify-center gap-3 mt-2 flex-wrap">
                    {[
                      { color: 'bg-[#00C896]', label: 'CIF' },
                      { color: 'bg-amber-400', label: 'Duty' },
                      ...(calc.excise > 0 ? [{ color: 'bg-red-400', label: 'Excise' }] : []),
                      { color: 'bg-blue-400', label: 'VAT' },
                      { color: 'bg-[#334155]', label: 'Levies' },
                    ].map(({ color, label }) => (
                      <div key={label} className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${color}`} />
                        <span className="text-xs text-[#64748B]">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Age warning */}
              {calc.ageSurcharge && (
                <div className="flex items-start gap-2 bg-amber-400/8 border border-amber-400/25 rounded-xl px-3 py-2.5">
                  <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300/80">
                    Vehicle is {calc.vehicleAge} years old. KRA may uplift customs value above your CIF — CRSP minimum applies. Actual duty may be higher than calculated.
                  </p>
                </div>
              )}

              {/* Breakdown */}
              <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden">
                <button
                  onClick={() => setShowBreakdown(!showBreakdown)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-white hover:bg-[#1E3A5F]/30 transition-colors"
                >
                  Full Breakdown
                  {showBreakdown ? <ChevronUp size={14} className="text-[#64748B]" /> : <ChevronDown size={14} className="text-[#64748B]" />}
                </button>

                {showBreakdown && (
                  <div className="px-4 pb-4 space-y-0">
                    <Row label="CIF Value" usd={calc.cif} kes={calc.cif * kesRate} accent="text-white" />
                    <Divider />
                    <Row label={`Import Duty (${calc.dutyPct}%)`} usd={calc.duty} kes={calc.duty * kesRate} accent="text-amber-400" />
                    {calc.excise > 0 && (
                      <Row
                        label={`Excise Duty (${calc.excisePct}% on CIF+duty)`}
                        usd={calc.excise} kes={calc.excise * kesRate}
                        accent="text-red-400"
                        sublabel={engineCC ? `${engineCC}cc — ${exciseBand.label}` : undefined}
                      />
                    )}
                    <Row label="VAT (16% on CIF+duty+excise)" usd={calc.vat} kes={calc.vat * kesRate} accent="text-blue-400" />
                    <Divider />
                    <Row label="IDF Levy (2%)" usd={calc.idf} kes={calc.idf * kesRate} />
                    <Row label="RDL Levy (1.5%)" usd={calc.rdl} kes={calc.rdl * kesRate} />
                    <Row label="KEBS PVoC / Inspection" usd={calc.pvoc} kes={calc.pvoc * kesRate} />
                    <Row label="Clearing Agent Fee (est.)" usd={calc.clearing} kes={calc.clearing * kesRate} />
                    <Row label="NTSA Registration" usd={calc.ntsa} kes={calc.ntsa * kesRate} />
                    {calc.rpb > 0 && <Row label="RPB Radiation Inspection" usd={calc.rpb} kes={calc.rpb * kesRate} />}
                    <Divider />
                    <Row label="Total Landed Cost" usd={calc.totalUSD} kes={calc.totalKES} accent="text-[#00C896]" bold />
                    <div className="pt-2">
                      <p className="text-xs text-[#334155]">
                        Taxes as % of landed cost: <span className="text-amber-400 font-semibold">{Math.round(calc.dutyRatioOfTotal * 100)}%</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* KRA CRSP note */}
              <div className="flex items-start gap-2.5 bg-[#0F2040] border border-[#1E3A5F] rounded-xl px-4 py-3">
                <Info size={13} className="text-[#64748B] flex-shrink-0 mt-0.5" />
                <div className="text-xs text-[#64748B] leading-relaxed space-y-1">
                  <p><span className="text-[#94A3B8] font-semibold">KRA CRSP:</span> Kenya Revenue Authority uses a Current Retail Selling Price database as the minimum customs value. If your invoice CIF is below CRSP, KRA will uplift to CRSP — increasing all duty calculations above.</p>
                  <p><span className="text-[#94A3B8] font-semibold">Age limit:</span> Imported vehicles must be manufactured within 8 years of import. Left-hand drive vehicles cannot be registered in Kenya.</p>
                  <p><span className="text-[#94A3B8] font-semibold">Rates:</span> Finance Act 2023. Verify against current KRA tariff schedule before filing.</p>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-3 min-h-[400px]">
              <div className="w-12 h-12 rounded-2xl bg-[#1E3A5F] flex items-center justify-center">
                <Calculator size={22} className="text-[#64748B]" />
              </div>
              <p className="text-[#64748B] text-sm">Enter CIF value to see full duty breakdown</p>
              <p className="text-[#334155] text-xs">Or click a popular vehicle above to load example</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const INPUT = 'w-full bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white placeholder-[#334155] focus:outline-none focus:border-[#00C896]'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1">{label}</label>
      {children}
    </div>
  )
}

function Row({ label, usd, kes, accent, bold, sublabel }: {
  label: string; usd: number; kes: number
  accent?: string; bold?: boolean; sublabel?: string
}) {
  return (
    <div className={`flex items-center justify-between py-2 ${bold ? 'border-t border-[#1E3A5F] pt-3 mt-1' : ''}`}>
      <div>
        <span className={`text-xs ${bold ? 'font-bold' : 'font-medium'} ${accent ?? 'text-[#94A3B8]'}`}>{label}</span>
        {sublabel && <div className="text-xs text-[#334155]">{sublabel}</div>}
      </div>
      <div className="text-right">
        <div className={`text-xs tabular-nums ${bold ? 'font-bold' : 'font-medium'} ${accent ?? 'text-[#94A3B8]'}`}>
          {fmtKES(kes)}
        </div>
        <div className="text-xs text-[#334155] tabular-nums">{fmtUSD(usd)}</div>
      </div>
    </div>
  )
}

function Divider() {
  return <div className="border-t border-[#1E3A5F]/50" />
}
