export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0A1628] text-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <a href="/" className="text-[#00C896] text-sm font-medium hover:underline">← Back to KRUX</a>
        </div>
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-[#64748B] text-sm mb-10">Effective date: 24 April 2026 · KRUX Compliance Intelligence</p>

        <div className="space-y-8 text-[#94A3B8] leading-relaxed">
          <section>
            <h2 className="text-white font-semibold text-lg mb-3">1. What We Collect</h2>
            <ul className="list-disc list-inside space-y-1.5">
              <li>Account information: name, email address, organization details</li>
              <li>Shipment data: documents, costs, timelines, compliance records you enter</li>
              <li>Usage data: pages visited, features used, session timestamps</li>
              <li>Payment data: processed by Stripe — we do not store card numbers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">2. How We Use Your Data</h2>
            <ul className="list-disc list-inside space-y-1.5">
              <li>To provide and operate the KRUX platform</li>
              <li>To generate AI compliance briefs (document content is sent to Anthropic's API)</li>
              <li>To send deadline alerts and compliance notifications</li>
              <li>To process payments and manage subscriptions</li>
              <li>To improve the Service — usage patterns only, never shipment content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">3. Data Isolation</h2>
            <p>Each organization's data is strictly isolated. Your shipments, manufacturers, contacts, and documents are never visible to other organizations. Row-level security is enforced at the database level.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">4. Third-Party Processors</h2>
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-[#1E3A5F]">
                    <th className="text-left py-2 pr-6 text-white font-medium">Processor</th>
                    <th className="text-left py-2 pr-6 text-white font-medium">Purpose</th>
                    <th className="text-left py-2 text-white font-medium">Data Shared</th>
                  </tr>
                </thead>
                <tbody className="space-y-1">
                  <tr className="border-b border-[#1E3A5F]/50">
                    <td className="py-2 pr-6">Supabase</td>
                    <td className="py-2 pr-6">Database and file storage</td>
                    <td className="py-2">All platform data</td>
                  </tr>
                  <tr className="border-b border-[#1E3A5F]/50">
                    <td className="py-2 pr-6">Anthropic</td>
                    <td className="py-2 pr-6">AI analysis and briefs</td>
                    <td className="py-2">Shipment context, documents</td>
                  </tr>
                  <tr className="border-b border-[#1E3A5F]/50">
                    <td className="py-2 pr-6">Stripe</td>
                    <td className="py-2 pr-6">Payment processing</td>
                    <td className="py-2">Email, billing address</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-6">Resend</td>
                    <td className="py-2 pr-6">Transactional email</td>
                    <td className="py-2">Email address, alert content</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">5. Data Retention</h2>
            <p>Your data is retained while your account is active. On account deletion, data is removed within 30 days. Backups may retain data for up to 90 days after deletion.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">6. Your Rights</h2>
            <p>You may request export or deletion of your data at any time by emailing <a href="mailto:privacy@krux.ai" className="text-[#00C896] hover:underline">privacy@krux.ai</a>. We will respond within 14 business days.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">7. Security</h2>
            <p>Data is encrypted in transit (TLS 1.3) and at rest. Access is protected by Supabase Row Level Security policies. We conduct security reviews regularly.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">8. Contact</h2>
            <p>Privacy questions: <a href="mailto:privacy@krux.ai" className="text-[#00C896] hover:underline">privacy@krux.ai</a></p>
          </section>
        </div>
      </div>
    </div>
  )
}
