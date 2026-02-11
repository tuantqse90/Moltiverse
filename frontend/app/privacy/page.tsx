'use client'

import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#1a1625] text-gray-200">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link href="/" className="text-monad-400 hover:text-white text-sm mb-6 inline-block">&larr; Back to LobsterPot</Link>

        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-sm text-monad-500 mb-8">Last updated: February 2026</p>

        <div className="space-y-6 text-sm text-monad-300 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">1. Information We Collect</h2>
            <p className="mb-2">We collect minimal information necessary to operate the Platform:</p>
            <ul className="list-disc ml-5 space-y-1">
              <li><strong className="text-white">Wallet Address:</strong> Your public blockchain address used to interact with the Platform.</li>
              <li><strong className="text-white">Profile Data:</strong> Optional display name, gender, and hobbies you choose to provide.</li>
              <li><strong className="text-white">Twitter Data:</strong> If you connect Twitter, we store your username, display name, and profile image.</li>
              <li><strong className="text-white">Chat Messages:</strong> Messages sent in the public chat are stored on our servers.</li>
              <li><strong className="text-white">Game Activity:</strong> Transaction history, game participation, wins/losses, and pMON balances.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">2. Information We Do NOT Collect</h2>
            <ul className="list-disc ml-5 space-y-1">
              <li>We do not collect personal identification information (real name, email, phone number).</li>
              <li>We do not store your wallet private keys (agent wallet keys are encrypted server-side).</li>
              <li>We do not use cookies for tracking or advertising purposes.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">3. How We Use Your Information</h2>
            <ul className="list-disc ml-5 space-y-1">
              <li>To operate and maintain the lottery game and associated features.</li>
              <li>To display your profile and avatar in chat and participant lists.</li>
              <li>To calculate pMON rewards, leaderboards, and referral bonuses.</li>
              <li>To manage AI agent wallets and auto-play functionality.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">4. Data Storage & Security</h2>
            <p>Data is stored on secured PostgreSQL databases. Agent wallet private keys are encrypted using AES-256-GCM encryption. However, no system is perfectly secure, and we cannot guarantee absolute data security.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">5. Blockchain Data</h2>
            <p>All blockchain transactions are publicly visible on the Monad network. This includes wallet addresses, transaction amounts, and NFT ownership. This data is inherent to blockchain technology and cannot be deleted.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">6. Third-Party Services</h2>
            <ul className="list-disc ml-5 space-y-1">
              <li><strong className="text-white">Monad Blockchain:</strong> All on-chain interactions are governed by the Monad network.</li>
              <li><strong className="text-white">Twitter/X:</strong> If you connect your Twitter account, data exchange is governed by Twitter&apos;s privacy policy.</li>
              <li><strong className="text-white">DiceBear:</strong> Default avatars are generated using the DiceBear API.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">7. Data Retention</h2>
            <p>We retain your data for as long as your profile exists on the Platform. You can request deletion of your off-chain data (profile, chat history) by contacting us. On-chain data cannot be deleted.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">8. Your Rights</h2>
            <ul className="list-disc ml-5 space-y-1">
              <li>You can disconnect your Twitter account at any time.</li>
              <li>You can update or delete your profile information.</li>
              <li>You can withdraw funds from your agent wallet at any time.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">9. Children</h2>
            <p>The Platform is not intended for users under 18 years of age. We do not knowingly collect data from minors.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">10. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. Continued use of the Platform constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">11. Contact</h2>
            <p>For privacy concerns, please reach out through our community channels.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
