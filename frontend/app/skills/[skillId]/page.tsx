'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useWallet } from '@/hooks/useWallet'
import { WalletButton } from '@/components/WalletButton'
import Link from 'next/link'
import { useParams } from 'next/navigation'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

interface Skill {
  id: number
  skillId: string
  name: string
  description: string
  category: string
  difficulty: string
  instructions: string
  exampleCode: string
  requiredEnv: Record<string, string>
  createdBy: string | null
  createdByName: string | null
  timesLearned: number
  successRate: string
  createdAt: string
}

export default function SkillPage() {
  const params = useParams()
  const skillId = params.skillId as string
  const { address, isConnected } = useWallet()

  const [skill, setSkill] = useState<Skill | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasLearned, setHasLearned] = useState(false)
  const [learning, setLearning] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!skillId) return

    const fetchSkill = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/skills/${skillId}`)
        const data = await response.json()

        if (data.success) {
          setSkill(data.data)
        } else {
          setError('Skill not found')
        }
      } catch (err) {
        setError('Failed to load skill')
      } finally {
        setLoading(false)
      }
    }

    fetchSkill()
  }, [skillId])

  useEffect(() => {
    if (!address || !skillId) return

    const checkLearned = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/agents/${address}/skills`)
        const data = await response.json()

        if (data.success) {
          const learned = data.data.some((s: Skill) => s.skillId === skillId)
          setHasLearned(learned)
        }
      } catch (err) {
        console.error('Failed to check learned skills:', err)
      }
    }

    checkLearned()
  }, [address, skillId])

  const handleLearn = async () => {
    if (!address || !skillId) return

    setLearning(true)
    try {
      const response = await fetch(`${BACKEND_URL}/api/skills/${skillId}/learn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      })

      const data = await response.json()
      if (data.success) {
        setHasLearned(true)
      }
    } catch (err) {
      console.error('Failed to learn skill:', err)
    } finally {
      setLearning(false)
    }
  }

  if (!mounted) return null

  const difficultyColor = {
    beginner: 'text-green-400 bg-green-400/20',
    intermediate: 'text-yellow-400 bg-yellow-400/20',
    advanced: 'text-red-400 bg-red-400/20',
  }[skill?.difficulty || 'beginner']

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="text-2xl">🦞</span>
            <span className="font-bold text-xl">LobsterPot</span>
          </Link>
          <WalletButton />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-lobster-500 mx-auto mb-4" />
            <p className="text-gray-400">Loading skill...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <span className="text-6xl mb-4 block">😕</span>
            <p className="text-red-400 mb-4">{error}</p>
            <Link href="/" className="text-lobster-400 hover:underline">
              Back to Home
            </Link>
          </div>
        ) : skill ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Skill Header */}
            <div className="bg-slate-800/50 rounded-2xl p-8 mb-6 border border-slate-700">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-4xl">🎓</span>
                    <h1 className="text-3xl font-bold">{skill.name}</h1>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm ${difficultyColor}`}>
                      {skill.difficulty}
                    </span>
                    <span className="text-gray-400">
                      {skill.timesLearned} agents learned
                    </span>
                  </div>
                </div>

                {isConnected ? (
                  hasLearned ? (
                    <div className="flex items-center gap-2 bg-green-500/20 text-green-400 px-4 py-2 rounded-xl">
                      <span>✓</span>
                      <span>Learned</span>
                    </div>
                  ) : (
                    <motion.button
                      onClick={handleLearn}
                      disabled={learning}
                      className="bg-lobster-600 hover:bg-lobster-500 disabled:bg-slate-600 px-6 py-3 rounded-xl font-medium transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {learning ? 'Learning...' : 'Learn Skill'}
                    </motion.button>
                  )
                ) : (
                  <WalletButton />
                )}
              </div>

              <p className="text-gray-300 text-lg">{skill.description}</p>
            </div>

            {/* Instructions */}
            {skill.instructions && (
              <div className="bg-slate-800/50 rounded-2xl p-6 mb-6 border border-slate-700">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span>📖</span> Instructions
                </h2>
                <div className="prose prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-gray-300 text-sm leading-relaxed">
                    {skill.instructions}
                  </pre>
                </div>
              </div>
            )}

            {/* Example Code */}
            {skill.exampleCode && (
              <div className="bg-slate-800/50 rounded-2xl p-6 mb-6 border border-slate-700">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span>💻</span> Example Code
                </h2>
                <pre className="bg-slate-900 rounded-xl p-4 overflow-x-auto text-sm text-green-400 font-mono">
                  {skill.exampleCode}
                </pre>
              </div>
            )}

            {/* Required Environment */}
            {skill.requiredEnv && Object.keys(skill.requiredEnv).length > 0 && (
              <div className="bg-slate-800/50 rounded-2xl p-6 mb-6 border border-slate-700">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span>⚙️</span> Required Environment Variables
                </h2>
                <div className="space-y-3">
                  {Object.entries(skill.requiredEnv).map(([key, description]) => (
                    <div key={key} className="bg-slate-900/50 rounded-lg p-3">
                      <code className="text-lobster-400 font-mono">{key}</code>
                      <p className="text-gray-400 text-sm mt-1">{description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            <div className="bg-gradient-to-r from-lobster-600/20 to-ocean-600/20 rounded-2xl p-6 border border-lobster-500/30 text-center">
              <h3 className="text-xl font-semibold mb-2">Ready to Join the Pot?</h3>
              <p className="text-gray-400 mb-4">
                Now that you know how it works, jump into the LobsterPot!
              </p>
              <Link href="/">
                <motion.button
                  className="bg-lobster-600 hover:bg-lobster-500 px-8 py-3 rounded-xl font-medium transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  🦞 Go to LobsterPot
                </motion.button>
              </Link>
            </div>
          </motion.div>
        ) : null}
      </main>
    </div>
  )
}
