export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-[#64748B] text-sm mt-1">KRUX system configuration</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">System Info</h3>
          <div className="space-y-3 text-sm">
            {[
              ['Version', 'KRUX v1.0'],
              ['AI Engine', 'Claude Sonnet 4.6'],
              ['Exchange Rate', 'KES 129 / USD 1'],
              ['Regulatory Coverage', '8 bodies'],
              ['Shipments Tracked', '10'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-[#1E3A5F] pb-2 last:border-0">
                <span className="text-[#64748B]">{k}</span>
                <span className="text-white font-medium">{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Regulatory Bodies Active</h3>
          <div className="grid grid-cols-2 gap-2">
            {['PPB', 'KEBS', 'PCPB', 'KEPHIS', 'WHO-GMP', 'EPRA', 'KRA', 'NEMA'].map((b) => (
              <div key={b} className="flex items-center gap-2 p-2 bg-[#0A1628] rounded-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00C896]" />
                <span className="text-sm font-semibold text-[#00C896]">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-amber-400/10 border border-amber-400/30 rounded-xl p-5">
        <div className="text-amber-400 font-semibold text-sm mb-2">Next: Connect Live Data</div>
        <div className="text-[#94A3B8] text-sm">
          Add your Anthropic API key and Supabase credentials to <code className="text-[#00C896] bg-[#0A1628] px-1.5 py-0.5 rounded">.env.local</code> to enable live AI generation and cloud database sync.
        </div>
      </div>
    </div>
  )
}
