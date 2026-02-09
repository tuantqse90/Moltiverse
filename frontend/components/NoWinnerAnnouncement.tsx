'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface NoWinnerAnnouncementProps {
  round: number
  participantCount: number
  isVisible: boolean
}

export function NoWinnerAnnouncement({ round, participantCount, isVisible }: NoWinnerAnnouncementProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center z-50 bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-gradient-to-br from-slate-700 to-slate-900 p-8 rounded-2xl text-center max-w-md mx-4 border border-slate-600"
            initial={{ scale: 0, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0, y: -50 }}
            transition={{ type: 'spring', damping: 15 }}
          >
            <motion.div
              className="text-8xl mb-4"
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              🦞
            </motion.div>

            <h2 className="text-2xl font-bold mb-2 text-gray-200">Round #{round} Ended</h2>
            <p className="text-lg text-gray-400 mb-4">Not enough lobsters!</p>

            <div className="bg-black/30 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-400 mb-1">Participants</p>
              <p className="text-2xl font-bold text-yellow-400">{participantCount}</p>
              <p className="text-sm text-gray-500 mt-1">Need at least 2 to draw winner</p>
            </div>

            <div className="bg-ocean-600/20 border border-ocean-500 rounded-xl p-4">
              <p className="text-ocean-300">
                Entry fees refunded!
              </p>
            </div>

            <motion.p
              className="mt-6 text-gray-400"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              New round starting...
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
