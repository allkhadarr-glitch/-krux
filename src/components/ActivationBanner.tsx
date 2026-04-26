'use client'
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

export function ActivationBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const params    = new URLSearchParams(window.location.search)
    const dismissed = sessionStorage.getItem('krux_activation_seen')
    if (params.get('activated') === '1' && !dismissed) {
      setShow(true)
      sessionStorage.setItem('krux_activation_seen', '1')
      // Clean URL without reloading
      const clean = window.location.pathname
      window.history.replaceState({}, '', clean)
    }
  }, [])

  if (!show) return null

  return (
    <div className="w-full bg-[#0F2040] border-b border-[#1E3A5F] px-6 py-2.5 flex items-center justify-between">
      <p className="text-xs text-[#94A3B8]">
        This workspace is preloaded with sample Kenya shipments.{' '}
        <span className="text-white font-medium">
          Add your real imports to see live risk analysis.
        </span>
      </p>
      <button
        onClick={() => setShow(false)}
        className="ml-4 text-[#64748B] hover:text-white transition-colors shrink-0"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  )
}
