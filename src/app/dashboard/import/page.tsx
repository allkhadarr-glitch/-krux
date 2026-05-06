'use client'
import { useState, useRef } from 'react'
import { Upload, Download, CheckCircle2, AlertTriangle, Loader2, X, FileText } from 'lucide-react'

const CSV_HEADERS = [
  'name', 'origin_port', 'origin_country', 'hs_code', 'product_description',
  'cif_value_usd', 'import_duty_pct', 'pvoc_deadline', 'vessel_name', 'shipping_line',
  'bl_number', 'eta', 'clearance_date', 'shipment_stage', 'client_name', 'weight_kg',
]

const SAMPLE_ROWS = [
  [
    'PHARMA IMPORT Q1 2025', 'Mumbai, India', 'IN', '3004.90', 'Pharmaceutical tablets',
    '35000', '25', '2025-03-15', 'MSC Amira', 'MSC',
    'MSCU12345678', '2025-02-20', '2025-03-10', 'CLEARED', 'Acme Pharma Ltd', '1200',
  ],
  [
    'ELECTRONICS CONSIGNMENT', 'Shenzhen, China', 'CN', '8471.30', 'Laptops and peripherals',
    '18000', '25', '', 'Maersk Kensington', 'Maersk',
    'MAEU98765432', '', '', 'IN_TRANSIT', 'TechVentures Ltd', '850',
  ],
]

function downloadTemplate() {
  const lines = [CSV_HEADERS.join(','), ...SAMPLE_ROWS.map(r => r.join(','))]
  const blob  = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url   = URL.createObjectURL(blob)
  const a     = document.createElement('a')
  a.href      = url
  a.download  = 'krux_shipment_import_template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = values[i] ?? '' })
    return row
  })
}

function validateRow(row: Record<string, string>, i: number): string | null {
  if (!row.name?.trim())           return `Row ${i + 1}: name is required`
  if (!row.origin_port?.trim())    return `Row ${i + 1}: origin_port is required`
  if (!row.cif_value_usd?.trim() || isNaN(Number(row.cif_value_usd)))
                                   return `Row ${i + 1}: cif_value_usd must be a number`
  return null
}

export default function ImportPage() {
  const fileRef  = useRef<HTMLInputElement>(null)
  const [rows, setRows]         = useState<Record<string, string>[] | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [valErrors, setValErrors] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult]     = useState<{ inserted: number } | null>(null)
  const [error, setError]       = useState<string | null>(null)

  function onFile(file: File) {
    setResult(null)
    setError(null)
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text   = e.target?.result as string
      const parsed = parseCSV(text)
      const errors = parsed.map((r, i) => validateRow(r, i)).filter(Boolean) as string[]
      setValErrors(errors)
      setRows(parsed)
    }
    reader.readAsText(file)
  }

  async function runImport() {
    if (!rows || rows.length === 0) return
    setImporting(true)
    setError(null)
    try {
      const res  = await fetch('/api/shipments/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Import failed')
      setResult({ inserted: data.inserted })
      setRows(null)
      setFileName(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setImporting(false)
    }
  }

  function reset() {
    setRows(null)
    setFileName(null)
    setValErrors([])
    setResult(null)
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-white font-bold text-xl mb-1">Historical Data Backfill</h1>
        <p className="text-[#64748B] text-sm">
          Import past shipments from before you joined KRUX. Every shipment you bring in compounds your compliance record and accelerates your data moat.
        </p>
      </div>

      {/* Step 1 — Download template */}
      <div className="border border-[#1E3A5F] bg-[#0A1628] mb-4">
        <div className="px-5 py-4 border-b border-[#1E3A5F]">
          <p className="text-[9px] text-[#334155] uppercase tracking-[0.25em]">Step 1</p>
          <p className="text-white text-sm font-bold mt-0.5">Download the CSV template</p>
        </div>
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-[#94A3B8] text-xs mb-1">Fill in your historical shipments. Required: name, origin_port, cif_value_usd.</p>
            <p className="text-[#64748B] text-xs">The template includes 2 sample rows showing the expected format.</p>
          </div>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2.5 border border-[#1E3A5F] text-[#94A3B8] text-xs font-bold hover:border-[#334155] hover:text-white transition-all flex-shrink-0 ml-4"
          >
            <Download size={13} /> Download template
          </button>
        </div>
      </div>

      {/* Column guide */}
      <div className="border border-[#1E3A5F] bg-[#0A1628] mb-4">
        <div className="px-5 py-3 border-b border-[#1E3A5F]">
          <p className="text-[9px] text-[#334155] uppercase tracking-[0.25em]">Column reference</p>
        </div>
        <div className="px-5 py-4 grid grid-cols-2 gap-x-6 gap-y-2">
          {[
            { col: 'name', note: 'Required. Short description of the consignment.' },
            { col: 'origin_port', note: 'Required. e.g. "Shanghai, China"' },
            { col: 'cif_value_usd', note: 'Required. CIF value in USD.' },
            { col: 'origin_country', note: 'ISO 2-letter code. e.g. CN, IN, AE' },
            { col: 'hs_code', note: 'HS tariff code. e.g. 8471.30' },
            { col: 'import_duty_pct', note: 'Duty rate %. Defaults to 25 if blank.' },
            { col: 'vessel_name', note: 'Name of the vessel.' },
            { col: 'shipping_line', note: 'e.g. MSC, Maersk, CMA CGM' },
            { col: 'bl_number', note: 'Bill of lading number.' },
            { col: 'eta', note: 'YYYY-MM-DD format.' },
            { col: 'clearance_date', note: 'YYYY-MM-DD. Required if stage = CLEARED.' },
            { col: 'shipment_stage', note: 'PRE_SHIPMENT | IN_TRANSIT | AT_PORT | CUSTOMS | CLEARED' },
            { col: 'client_name', note: 'Importer / client name.' },
            { col: 'weight_kg', note: 'Cargo weight in kilograms.' },
          ].map(({ col, note }) => (
            <div key={col} className="flex gap-2">
              <span className="text-[#00C896] font-mono text-[10px] flex-shrink-0 mt-0.5">{col}</span>
              <span className="text-[#64748B] text-[10px]">{note}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Step 2 — Upload */}
      <div className="border border-[#1E3A5F] bg-[#0A1628] mb-4">
        <div className="px-5 py-4 border-b border-[#1E3A5F]">
          <p className="text-[9px] text-[#334155] uppercase tracking-[0.25em]">Step 2</p>
          <p className="text-white text-sm font-bold mt-0.5">Upload your completed CSV</p>
        </div>
        <div className="px-5 py-5">
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }}
          />
          {!rows ? (
            <div
              onClick={() => fileRef.current?.click()}
              className="border border-dashed border-[#1E3A5F] hover:border-[#00C896]/40 hover:bg-[#00C896]/5 transition-all cursor-pointer p-8 flex flex-col items-center gap-3"
            >
              <Upload size={24} className="text-[#334155]" />
              <p className="text-[#64748B] text-sm">Click to upload CSV</p>
              <p className="text-[#334155] text-xs">Maximum 200 rows per import</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-[#00C896]" />
                  <span className="text-white text-sm font-bold">{fileName}</span>
                  <span className="text-[#64748B] text-xs">— {rows.length} row{rows.length !== 1 ? 's' : ''} parsed</span>
                </div>
                <button onClick={reset} className="text-[#64748B] hover:text-white transition-colors">
                  <X size={15} />
                </button>
              </div>

              {/* Validation errors */}
              {valErrors.length > 0 && (
                <div className="bg-red-500/5 border border-red-500/20 px-4 py-3 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={13} className="text-red-400" />
                    <span className="text-red-400 text-xs font-bold">{valErrors.length} validation error{valErrors.length !== 1 ? 's' : ''}</span>
                  </div>
                  <ul className="space-y-1">
                    {valErrors.map((e, i) => <li key={i} className="text-xs text-red-300">{e}</li>)}
                  </ul>
                </div>
              )}

              {/* Preview table */}
              <div className="overflow-x-auto border border-[#1E3A5F] mb-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#1E3A5F]">
                      {['name', 'origin_port', 'cif_value_usd', 'hs_code', 'shipment_stage', 'vessel_name'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-[#334155] font-mono whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-b border-[#1E3A5F]/50 last:border-0">
                        {['name', 'origin_port', 'cif_value_usd', 'hs_code', 'shipment_stage', 'vessel_name'].map(h => (
                          <td key={h} className="px-3 py-2 text-[#94A3B8] truncate max-w-[140px]">{row[h] || '—'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 5 && (
                  <div className="px-3 py-2 text-[10px] text-[#334155] border-t border-[#1E3A5F]">
                    + {rows.length - 5} more rows not shown in preview
                  </div>
                )}
              </div>

              {error && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-3 mb-4">{error}</div>
              )}

              <button
                onClick={runImport}
                disabled={importing || valErrors.length > 0}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#00C896] text-[#0A1628] font-bold text-sm hover:bg-[#00A87E] transition-colors disabled:opacity-50"
              >
                {importing ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                {importing ? `Importing ${rows.length} shipments…` : `Import ${rows.length} shipment${rows.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Success state */}
      {result && (
        <div className="border border-[#00C896]/30 bg-[#00C896]/5 px-5 py-5 flex items-start gap-4">
          <CheckCircle2 size={20} className="text-[#00C896] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-white text-sm font-bold mb-1">
              {result.inserted} shipment{result.inserted !== 1 ? 's' : ''} imported
            </p>
            <p className="text-[#94A3B8] text-xs">
              Your historical data is now in KRUX. Every cleared shipment compounds your compliance record.
            </p>
            <button onClick={reset} className="mt-3 text-xs text-[#00C896] hover:opacity-80 transition-opacity">
              Import another file →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
