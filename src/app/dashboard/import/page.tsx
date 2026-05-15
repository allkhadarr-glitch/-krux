'use client'
import { useState, useRef, useCallback } from 'react'
import { Upload, Download, CheckCircle2, AlertTriangle, Loader2, X, FileText, ArrowRight, RefreshCw } from 'lucide-react'

// ── KRUX schema fields ────────────────────────────────────────
const KRUX_FIELDS = [
  { key: 'name',               label: 'Name / Product',     required: true  },
  { key: 'client_name',        label: 'Client / Importer',  required: false },
  { key: 'origin_port',        label: 'Origin Port',        required: false },
  { key: 'origin_country',     label: 'Origin Country',     required: false },
  { key: 'hs_code',            label: 'HS Code',            required: false },
  { key: 'product_description',label: 'Product Description',required: false },
  { key: 'cif_value_usd',      label: 'CIF Value (USD)',    required: true  },
  { key: 'import_duty_pct',    label: 'Duty Rate %',        required: false },
  { key: 'vessel_name',        label: 'Vessel Name',        required: false },
  { key: 'shipping_line',      label: 'Shipping Line',      required: false },
  { key: 'bl_number',          label: 'BL Number',          required: false },
  { key: 'eta',                label: 'ETA (YYYY-MM-DD)',   required: false },
  { key: 'clearance_date',     label: 'Clearance Date',     required: false },
  { key: 'shipment_stage',     label: 'Stage',              required: false },
  { key: 'weight_kg',          label: 'Weight (kg)',        required: false },
] as const

type KruxKey = typeof KRUX_FIELDS[number]['key']

// ── Column alias auto-detection ───────────────────────────────
const ALIASES: Record<string, KruxKey> = {
  product: 'name', cargo: 'name', goods: 'name', shipment: 'name',
  item: 'name', commodity: 'name',
  importer: 'client_name', client: 'client_name', consignee: 'client_name',
  buyer: 'client_name', customer: 'client_name',
  'loading port': 'origin_port', 'port of loading': 'origin_port', pol: 'origin_port',
  'from port': 'origin_port', 'port of origin': 'origin_port',
  country: 'origin_country', 'country of origin': 'origin_country',
  'source country': 'origin_country', coo: 'origin_country',
  hs: 'hs_code', 'tariff code': 'hs_code', 'harmonized code': 'hs_code',
  tariff: 'hs_code', 'commodity code': 'hs_code', hscode: 'hs_code',
  cif: 'cif_value_usd', 'invoice value': 'cif_value_usd', value: 'cif_value_usd',
  'cif value': 'cif_value_usd', 'invoice amount': 'cif_value_usd', amount: 'cif_value_usd',
  duty: 'import_duty_pct', 'duty rate': 'import_duty_pct', 'duty %': 'import_duty_pct',
  vessel: 'vessel_name', ship: 'vessel_name', 'ship name': 'vessel_name',
  carrier: 'shipping_line', 'shipping company': 'shipping_line', line: 'shipping_line',
  bl: 'bl_number', 'bill of lading': 'bl_number', 'b/l': 'bl_number', 'bl no': 'bl_number',
  'arrival date': 'eta', arrival: 'eta', 'expected arrival': 'eta',
  'cleared date': 'clearance_date', 'date cleared': 'clearance_date',
  'date of clearance': 'clearance_date', clearance: 'clearance_date',
  status: 'shipment_stage', stage: 'shipment_stage',
  weight: 'weight_kg', 'weight kg': 'weight_kg',
}

function autoMap(incoming: string[]): Record<string, KruxKey | ''> {
  const map: Record<string, KruxKey | ''> = {}
  for (const col of incoming) {
    const norm = col.toLowerCase().trim()
    if (KRUX_FIELDS.find(f => f.key === norm)) {
      map[col] = norm as KruxKey
    } else {
      map[col] = ALIASES[norm] ?? ''
    }
  }
  return map
}

// ── CSV parser ────────────────────────────────────────────────
function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return { headers: [], rows: [] }
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const rows = lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = vals[i] ?? '' })
    return row
  })
  return { headers, rows }
}

function applyMapping(
  rows: Record<string, string>[],
  mapping: Record<string, KruxKey | ''>,
): Record<string, string>[] {
  return rows.map(row => {
    const out: Record<string, string> = {}
    for (const [col, kruxKey] of Object.entries(mapping)) {
      if (kruxKey) out[kruxKey] = row[col] ?? ''
    }
    return out
  })
}

function downloadTemplate() {
  const headers = KRUX_FIELDS.map(f => f.key)
  const sample = [
    'PHARMA IMPORT Q1 2025,Acme Pharma Ltd,Mumbai India,IN,3004.90,Pharmaceutical tablets,35000,25,MSC Amira,MSC,MSCU12345678,2025-02-20,2025-03-10,CLEARED,1200',
    'ELECTRONICS CONSIGNMENT,TechVentures Ltd,Shenzhen China,CN,8471.30,Laptops and peripherals,18000,25,Maersk Kensington,Maersk,MAEU98765432,,,IN_TRANSIT,850',
  ]
  const blob = new Blob([[headers.join(','), ...sample].join('\n')], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = 'krux_import_template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

const CHUNK = 500

// ── Main page ─────────────────────────────────────────────────
type Stage = 'upload' | 'map' | 'preview' | 'importing' | 'done'

export default function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null)

  const [stage,    setStage]    = useState<Stage>('upload')
  const [fileName, setFileName] = useState<string>('')
  const [headers,  setHeaders]  = useState<string[]>([])
  const [rawRows,  setRawRows]  = useState<Record<string, string>[]>([])
  const [mapping,  setMapping]  = useState<Record<string, KruxKey | ''>>({})

  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [result,   setResult]   = useState<{ inserted: number; failed: number } | null>(null)
  const [error,    setError]    = useState<string | null>(null)

  function onFile(file: File) {
    setError(null)
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const { headers: h, rows } = parseCSV(text)
      if (!h.length) { setError('Could not parse file — make sure it is a CSV.'); return }
      setHeaders(h)
      setRawRows(rows)
      setMapping(autoMap(h))
      setStage('map')
    }
    reader.readAsText(file)
  }

  const mappedRows = applyMapping(rawRows, mapping)

  const missingRequired = KRUX_FIELDS
    .filter(f => f.required)
    .filter(f => !Object.values(mapping).includes(f.key))
    .map(f => f.label)

  async function runImport() {
    setStage('importing')
    setProgress({ done: 0, total: mappedRows.length })
    let inserted = 0
    let failed   = 0

    for (let i = 0; i < mappedRows.length; i += CHUNK) {
      const chunk = mappedRows.slice(i, i + CHUNK)
      try {
        const res  = await fetch('/api/shipments/bulk', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ rows: chunk }),
        })
        const data = await res.json()
        inserted += data.inserted ?? 0
        failed   += data.failed   ?? 0
      } catch {
        failed += chunk.length
      }
      setProgress({ done: Math.min(i + CHUNK, mappedRows.length), total: mappedRows.length })
    }

    setResult({ inserted, failed })
    setStage('done')
  }

  function reset() {
    setStage('upload')
    setFileName('')
    setHeaders([])
    setRawRows([])
    setMapping({})
    setProgress({ done: 0, total: 0 })
    setResult(null)
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

      <div className="mb-8">
        <h1 className="text-white font-bold text-xl mb-1">Historical Data Import</h1>
        <p className="text-[#64748B] text-sm">
          Import past shipments from clearing agent records, freight files, or internal spreadsheets.
          No row limit. Every record compounds KRUX intelligence.
        </p>
      </div>

      {/* ── STAGE: upload ── */}
      {stage === 'upload' && (
        <div className="space-y-4">
          <div className="border border-[#1E3A5F] bg-[#0A1628]">
            <div className="px-5 py-4 border-b border-[#1E3A5F] flex items-center justify-between">
              <div>
                <p className="text-xs text-[#334155] uppercase tracking-[0.25em]">Step 1 — optional</p>
                <p className="text-white text-sm font-bold mt-0.5">Download the KRUX template</p>
              </div>
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 px-4 py-2 border border-[#1E3A5F] text-[#94A3B8] text-xs font-bold hover:border-[#334155] hover:text-white transition-all"
              >
                <Download size={13} /> Template CSV
              </button>
            </div>
            <div className="px-5 py-3">
              <p className="text-[#64748B] text-xs">
                If your file already has columns, skip this step. KRUX will auto-detect and map your columns on the next screen.
              </p>
            </div>
          </div>

          <div className="border border-[#1E3A5F] bg-[#0A1628]">
            <div className="px-5 py-4 border-b border-[#1E3A5F]">
              <p className="text-xs text-[#334155] uppercase tracking-[0.25em]">Step 2</p>
              <p className="text-white text-sm font-bold mt-0.5">Upload your CSV file</p>
            </div>
            <div className="px-5 py-5">
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }}
              />
              <div
                onClick={() => fileRef.current?.click()}
                className="border border-dashed border-[#1E3A5F] hover:border-[#00C896]/40 hover:bg-[#00C896]/5 transition-all cursor-pointer p-10 flex flex-col items-center gap-3"
              >
                <Upload size={28} className="text-[#334155]" />
                <p className="text-[#94A3B8] text-sm font-semibold">Click to upload CSV</p>
                <p className="text-[#64748B] text-xs text-center">
                  Any column names — KRUX will map them automatically.<br />
                  No row limit.
                </p>
              </div>
              {error && (
                <div className="mt-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-3">{error}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── STAGE: map ── */}
      {stage === 'map' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <FileText size={15} className="text-[#00C896]" />
            <span className="text-white text-sm font-bold">{fileName}</span>
            <span className="text-[#64748B] text-xs">— {rawRows.length.toLocaleString()} rows detected</span>
            <button onClick={reset} className="ml-auto text-[#64748B] hover:text-white">
              <X size={15} />
            </button>
          </div>

          <div className="border border-[#1E3A5F] bg-[#0A1628]">
            <div className="px-5 py-4 border-b border-[#1E3A5F]">
              <p className="text-white text-sm font-bold">Column Mapping</p>
              <p className="text-[#64748B] text-xs mt-0.5">
                KRUX detected your columns and mapped them automatically. Review and adjust any that are wrong.
              </p>
            </div>
            <div className="px-5 py-4 space-y-2">
              {headers.map(col => (
                <div key={col} className="flex items-center gap-3">
                  <span className="text-[#94A3B8] text-xs font-mono w-44 truncate flex-shrink-0">{col}</span>
                  <ArrowRight size={12} className="text-[#334155] flex-shrink-0" />
                  <select
                    value={mapping[col] ?? ''}
                    onChange={e => setMapping(m => ({ ...m, [col]: e.target.value as KruxKey | '' }))}
                    className="flex-1 bg-[#0F2040] border border-[#1E3A5F] text-[#94A3B8] text-xs px-3 py-1.5 focus:outline-none focus:border-[#00C896]/40"
                  >
                    <option value="">— skip this column —</option>
                    {KRUX_FIELDS.map(f => (
                      <option key={f.key} value={f.key}>
                        {f.label}{f.required ? ' *' : ''}
                      </option>
                    ))}
                  </select>
                  {mapping[col] && (
                    <span className="text-[#00C896] text-xs flex-shrink-0">✓</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {missingRequired.length > 0 && (
            <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 px-4 py-3">
              <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-amber-300 text-xs">
                Required fields not mapped: <strong>{missingRequired.join(', ')}</strong>.
                Map them above before continuing.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={reset}
              className="px-4 py-2.5 border border-[#1E3A5F] text-[#64748B] text-sm hover:text-white transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStage('preview')}
              disabled={missingRequired.length > 0}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#00C896] text-[#0A1628] font-bold text-sm hover:bg-[#00A87E] disabled:opacity-40 transition-colors"
            >
              Preview {rawRows.length.toLocaleString()} rows <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── STAGE: preview ── */}
      {stage === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <FileText size={15} className="text-[#00C896]" />
            <span className="text-white text-sm font-bold">{fileName}</span>
            <span className="text-[#64748B] text-xs">— {rawRows.length.toLocaleString()} rows ready</span>
          </div>

          <div className="border border-[#1E3A5F] bg-[#0A1628] overflow-hidden">
            <div className="px-5 py-3 border-b border-[#1E3A5F]">
              <p className="text-white text-xs font-bold uppercase tracking-widest">Preview — first 5 rows</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#1E3A5F]">
                    {KRUX_FIELDS.filter(f => Object.values(mapping).includes(f.key)).map(f => (
                      <th key={f.key} className="px-3 py-2 text-left text-[#334155] font-mono whitespace-nowrap">{f.key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mappedRows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-b border-[#1E3A5F]/50 last:border-0">
                      {KRUX_FIELDS.filter(f => Object.values(mapping).includes(f.key)).map(f => (
                        <td key={f.key} className="px-3 py-2 text-[#94A3B8] truncate max-w-[140px]">
                          {row[f.key] || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rawRows.length > 5 && (
              <div className="px-3 py-2 text-xs text-[#334155] border-t border-[#1E3A5F]">
                + {(rawRows.length - 5).toLocaleString()} more rows
              </div>
            )}
          </div>

          <div className="bg-[#0F2040] border border-[#1E3A5F] px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-bold">{rawRows.length.toLocaleString()} shipments</p>
              <p className="text-[#64748B] text-xs mt-0.5">
                Sent in batches of {CHUNK.toLocaleString()} · Errors are skipped, not fatal
              </p>
            </div>
            <div className="text-right">
              <p className="text-[#64748B] text-xs">Mapped fields</p>
              <p className="text-[#00C896] text-xs font-bold mt-0.5">
                {Object.values(mapping).filter(Boolean).length} / {headers.length}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStage('map')}
              className="px-4 py-2.5 border border-[#1E3A5F] text-[#64748B] text-sm hover:text-white transition-colors"
            >
              Back
            </button>
            <button
              onClick={runImport}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#00C896] text-[#0A1628] font-bold text-sm hover:bg-[#00A87E] transition-colors"
            >
              <Upload size={14} /> Import {rawRows.length.toLocaleString()} shipments
            </button>
          </div>
        </div>
      )}

      {/* ── STAGE: importing ── */}
      {stage === 'importing' && (
        <div className="border border-[#1E3A5F] bg-[#0A1628] px-6 py-10 text-center space-y-6">
          <Loader2 size={32} className="text-[#00C896] animate-spin mx-auto" />
          <div>
            <p className="text-white font-bold text-lg">
              {progress.done.toLocaleString()} / {progress.total.toLocaleString()} rows imported
            </p>
            <p className="text-[#64748B] text-sm mt-1">Processing in batches — do not close this tab</p>
          </div>
          <div className="w-full bg-[#0F2040] rounded-full h-2">
            <div
              className="bg-[#00C896] h-2 rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[#334155] text-xs">{pct}% complete</p>
        </div>
      )}

      {/* ── STAGE: done ── */}
      {stage === 'done' && result && (
        <div className="space-y-4">
          <div className="border border-[#00C896]/30 bg-[#00C896]/5 px-6 py-6 flex items-start gap-4">
            <CheckCircle2 size={24} className="text-[#00C896] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-bold text-lg mb-1">
                {result.inserted.toLocaleString()} shipments imported
              </p>
              {result.failed > 0 && (
                <p className="text-amber-400 text-sm mb-2">
                  {result.failed.toLocaleString()} rows skipped — check those records for missing required fields.
                </p>
              )}
              <p className="text-[#94A3B8] text-sm">
                Data is live in KRUX. Corridor intelligence, examination rates, and compliance scores will build as more records accumulate.
              </p>
            </div>
          </div>
          <button
            onClick={reset}
            className="w-full flex items-center justify-center gap-2 py-3 border border-[#1E3A5F] text-[#64748B] text-sm font-bold hover:text-white hover:border-[#334155] transition-all"
          >
            <RefreshCw size={14} /> Import another file
          </button>
        </div>
      )}
    </div>
  )
}
