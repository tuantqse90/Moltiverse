'use client'

import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#1a1625] text-gray-200">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link href="/" className="text-monad-400 hover:text-white text-sm mb-6 inline-block">&larr; Back to LobsterPot</Link>

        <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-sm text-monad-500 mb-8">Last updated: February 2026</p>

        <div className="space-y-6 text-sm text-monad-300 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">1. Acceptance of Terms</h2>
            <p>By accessing or using LobsterPot (&quot;the Platform&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Platform.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">2. Description of Service</h2>
            <p>LobsterPot is a decentralized lottery game built on the Monad blockchain. Users can participate in lottery rounds by depositing MON tokens. A random winner is selected at the end of each round. The Platform also provides features including NFT minting, points rewards (pMON), AI agent auto-play, spin wheel, and referral programs.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">3. Eligibility</h2>
            <p>You must be at least 18 years old and legally able to enter into binding agreements in your jurisdiction to use the Platform. You are responsible for ensuring your use of the Platform complies with all applicable local laws and regulations.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">4. Wallet & Funds</h2>
            <ul className="list-disc ml-5 space-y-1">
              <li>You are solely responsible for the security of your wallet and private keys.</li>
              <li>All blockchain transactions are irreversible. We cannot recover lost funds.</li>
              <li>You are responsible for maintaining sufficient gas fees for transactions.</li>
              <li>Agent wallets created through the Platform are managed by the Platform but funded by you.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">5. Game Rules & Risks</h2>
            <ul className="list-disc ml-5 space-y-1">
              <li>Participation in the lottery involves financial risk. You may lose your deposited funds.</li>
              <li>Winners are selected through a randomized process. No guarantees of winning are made.</li>
              <li>The Platform reserves the right to modify game parameters (timer, minimum bet, fees) at any time.</li>
              <li>pMON points have no monetary value outside the Platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">6. NFTs</h2>
            <p>Lobster Robot NFTs are digital collectibles on the Monad blockchain. Ownership is recorded on-chain. The Platform makes no guarantees regarding the future value or utility of NFTs.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">7. AI Agents</h2>
            <p>AI agents operate autonomously based on configured parameters. The Platform is not responsible for any losses incurred by agent activity. You should monitor your agent and maintain adequate funding.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">8. Prohibited Conduct</h2>
            <ul className="list-disc ml-5 space-y-1">
              <li>Exploiting bugs, vulnerabilities, or smart contract flaws.</li>
              <li>Using bots or scripts to manipulate game outcomes (beyond provided agent features).</li>
              <li>Engaging in fraud, money laundering, or other illegal activities.</li>
              <li>Harassment or abusive behavior in chat.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">9. Disclaimer of Warranties</h2>
            <p>The Platform is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, express or implied. We do not guarantee uninterrupted service, error-free operation, or the security of smart contracts.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">10. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, LobsterPot and its team shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Platform, including but not limited to loss of funds, data, or profits.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">11. Changes to Terms</h2>
            <p>We reserve the right to modify these terms at any time. Continued use of the Platform after changes constitutes acceptance of the updated terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">12. Contact</h2>
            <p>For questions about these terms, please reach out through our community channels.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
