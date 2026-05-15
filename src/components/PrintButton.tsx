'use client'

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print text-xs px-3 py-1.5 border border-[#1E3A5F] text-[#64748B] hover:border-[#00C896]/40 hover:text-[#00C896] transition-colors uppercase tracking-widest"
    >
      Save as PDF
    </button>
  )
}
