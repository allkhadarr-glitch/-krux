export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0A1628] text-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <a href="/" className="text-[#00C896] text-sm font-medium hover:underline">← Back to KRUX</a>
        </div>
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-[#64748B] text-sm mb-10">Effective date: 24 April 2026 · KRUX Compliance Intelligence</p>

        <div className="space-y-8 text-[#94A3B8] leading-relaxed">
          <section>
            <h2 className="text-white font-semibold text-lg mb-3">1. Acceptance</h2>
            <p>By accessing or using KRUX ("Service"), you agree to be bound by these Terms. If you are using the Service on behalf of an organization, you represent that you have authority to bind that organization.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">2. Description of Service</h2>
            <p>KRUX is a Kenya import compliance management platform. It provides shipment tracking, regulatory deadline monitoring, AI-assisted compliance briefs, manufacturer vetting, and cost calculation tools. KRUX does not constitute legal or regulatory advice.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">3. Accounts and Access</h2>
            <p>You are responsible for maintaining the confidentiality of your credentials. Each organization account is isolated — your data is not shared with other organizations. You must not share access credentials with unauthorized parties.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">4. Subscriptions and Payment</h2>
            <p>Paid plans are billed monthly or annually in advance. Subscriptions renew automatically unless cancelled before the renewal date. Refunds are not provided for partial periods. Pricing is shown in USD. We reserve the right to change pricing with 30 days notice.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">5. Acceptable Use</h2>
            <p>You may not use KRUX to process illegal shipments, evade customs duties, circumvent regulatory requirements, or interfere with the Service. We may suspend accounts that violate these terms.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">6. Data and Confidentiality</h2>
            <p>Your shipment data belongs to you. We do not sell or share your data with third parties except as required to operate the Service (e.g., AI processing via Anthropic). AI processing may involve sending document content to Anthropic's API for analysis.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">7. Disclaimer</h2>
            <p>KRUX provides compliance guidance based on publicly available regulatory information. Regulatory requirements change. Always verify requirements with the relevant authority (PPB, KEBS, KEPHIS, PCPB, EPRA, NEMA, KRA) before making compliance decisions. KRUX is not liable for missed deadlines or regulatory penalties.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">8. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, KRUX's liability is limited to the amount you paid in the 3 months preceding the claim. We are not liable for indirect, consequential, or incidental damages.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">9. Governing Law</h2>
            <p>These Terms are governed by the laws of Kenya. Disputes shall be resolved in the courts of Nairobi, Kenya.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">10. Contact</h2>
            <p>Questions about these Terms: <a href="mailto:legal@krux.ai" className="text-[#00C896] hover:underline">legal@krux.ai</a></p>
          </section>
        </div>
      </div>
    </div>
  )
}
