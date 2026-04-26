'use client'

import { useState } from 'react'
import { Copy, Share2, CheckCircle2 } from 'lucide-react'

export default function ShareButtons({
  shareUrl,
  shipmentName,
  waMessage,
}: {
  shareUrl:     string
  shipmentName: string
  waMessage:    string
}) {
  const [copied, setCopied] = useState(false)

  function copyLink() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={copyLink}
        className="flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#00C896] transition-colors border border-[#1E3A5F] px-3 py-1.5 rounded-lg"
      >
        {copied ? <CheckCircle2 size={12} className="text-[#00C896]" /> : <Copy size={12} />}
        {copied ? 'Copied!' : 'Copy link'}
      </button>
      <a
        href={`https://api.whatsapp.com/send?text=${waMessage}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-xs text-[#25D366] border border-[#25D366]/30 px-3 py-1.5 rounded-lg hover:bg-[#25D366]/10 transition-colors"
      >
        <Share2 size={12} /> Share on WhatsApp
      </a>
    </div>
  )
}
