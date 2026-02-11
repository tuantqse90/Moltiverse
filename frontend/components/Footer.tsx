'use client'

import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-monad-700/30 bg-monad-900/50 backdrop-blur-sm mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo & copyright */}
          <div className="flex items-center gap-2 text-sm text-monad-400">
            <span>🦞</span>
            <span>LobsterPot &copy; {new Date().getFullYear()}</span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm">
            <Link
              href="/terms"
              className="text-monad-400 hover:text-white transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/privacy"
              className="text-monad-400 hover:text-white transition-colors"
            >
              Privacy Policy
            </Link>
          </div>

          {/* Chain info */}
          <div className="text-xs text-monad-500">
            Built on Monad
          </div>
        </div>
      </div>
    </footer>
  )
}
