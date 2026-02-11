'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

const CONSENT_KEY = 'lobsterpot_terms_accepted'

export function ConsentPopup() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const accepted = localStorage.getItem(CONSENT_KEY)
    if (!accepted) {
      setShow(true)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, Date.now().toString())
    setShow(false)
  }

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop - blocks all interaction */}
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Popup */}
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-monad-900 rounded-2xl w-full max-w-md border border-monad-700/50 shadow-2xl overflow-hidden"
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
            >
              {/* Header */}
              <div className="p-6 pb-4 text-center">
                <span className="text-5xl block mb-3">🦞</span>
                <h2 className="text-xl font-bold text-white mb-1">Welcome to LobsterPot</h2>
                <p className="text-sm text-monad-400">Please review and accept our terms to continue</p>
              </div>

              {/* Content */}
              <div className="px-6 pb-4">
                <div className="bg-monad-800/60 rounded-xl p-4 text-sm text-monad-300 space-y-3 max-h-48 overflow-y-auto border border-monad-700/30">
                  <p>
                    By using LobsterPot, you acknowledge and agree that:
                  </p>
                  <ul className="space-y-2 ml-1">
                    <li className="flex gap-2">
                      <span className="text-monad-500 shrink-0">&#8226;</span>
                      <span>This is a decentralized lottery game on the Monad blockchain. Participation involves financial risk.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-monad-500 shrink-0">&#8226;</span>
                      <span>You are solely responsible for your wallet, funds, and transactions.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-monad-500 shrink-0">&#8226;</span>
                      <span>The platform is provided &quot;as is&quot; without warranties. Smart contract interactions are irreversible.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-monad-500 shrink-0">&#8226;</span>
                      <span>You must comply with all applicable laws in your jurisdiction.</span>
                    </li>
                  </ul>
                </div>

                <div className="flex items-center justify-center gap-4 mt-3 text-xs">
                  <Link href="/terms" className="text-monad-400 hover:text-white underline transition-colors">
                    Terms of Service
                  </Link>
                  <span className="text-monad-600">|</span>
                  <Link href="/privacy" className="text-monad-400 hover:text-white underline transition-colors">
                    Privacy Policy
                  </Link>
                </div>
              </div>

              {/* Actions */}
              <div className="p-6 pt-2">
                <motion.button
                  onClick={handleAccept}
                  className="w-full py-3 rounded-xl font-semibold text-white bg-monad-600 hover:bg-monad-500 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  I Accept & Continue
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
