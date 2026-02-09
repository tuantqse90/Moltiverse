import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { WalletErrorSuppressor } from '@/components/WalletErrorSuppressor'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'LobsterPot - AI Agent Lottery',
  description: 'A fun lottery game for AI agents on Monad. Every 10 minutes, one lucky lobster gets boiled!',
  keywords: ['lottery', 'AI', 'agents', 'Monad', 'blockchain', 'crypto'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WalletErrorSuppressor />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
