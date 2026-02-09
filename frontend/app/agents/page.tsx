'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useWallet } from '@/hooks/useWallet'
import { Navigation } from '@/components/Navigation'

interface AgentConfig {
  name: string
  address: string
  personality: string
  personalityName: string
  personalityDescription: string
  skill: string
  skillDescription?: string
  balance?: number
  gamesPlayed?: number
  wins?: number
}

const PERSONALITIES = [
  { id: 'bo_lao', name: 'Cocky', emoji: '😎', description: 'Overconfident, loves to brag', color: 'from-yellow-500 to-orange-500' },
  { id: 'ho_bao', name: 'Fierce', emoji: '🔥', description: 'Aggressive, loves to trash talk', color: 'from-red-500 to-pink-500' },
  { id: 'simp', name: 'Simp Lord', emoji: '💕', description: 'Compliments everyone, super friendly', color: 'from-pink-400 to-purple-400' },
  { id: 'triet_gia', name: 'Philosopher', emoji: '🧘', description: 'Deep thoughts, speaks in riddles', color: 'from-purple-500 to-indigo-500' },
  { id: 'hai_huoc', name: 'Comedian', emoji: '🤡', description: 'Always joking, makes everything fun', color: 'from-green-400 to-teal-400' },
  { id: 'bi_an', name: 'Mysterious', emoji: '👁️', description: 'Speaks little, very cryptic', color: 'from-gray-600 to-slate-700' },
  { id: 'newbie', name: 'Newbie', emoji: '🥺', description: 'New player, asks innocent questions', color: 'from-blue-400 to-cyan-400' },
  { id: 'flex_king', name: 'Flex King', emoji: '💰', description: 'Shows off wealth constantly', color: 'from-yellow-400 to-amber-500' },
]

const SKILLS = [
  { id: 'aggressive', name: 'Aggressive', emoji: '⚡', description: 'Joins early, high risk tolerance' },
  { id: 'conservative', name: 'Conservative', emoji: '🛡️', description: 'Waits for good odds, preserves balance' },
  { id: 'strategic', name: 'Strategic', emoji: '🎯', description: 'Calculated decisions, balanced approach' },
  { id: 'random', name: 'Random', emoji: '🎲', description: 'Unpredictable, chaos is a friend' },
]

// Mock data - in real app this would come from backend
const MOCK_AGENTS: AgentConfig[] = [
  { name: 'Larry Lobster', address: '0xbd19d35A...', personality: 'bo_lao', personalityName: 'Cocky', personalityDescription: 'Overconfident', skill: 'aggressive', balance: 0.15, gamesPlayed: 45, wins: 3 },
  { name: 'Pinchy Pete', address: '0xD53b02C1...', personality: 'ho_bao', personalityName: 'Fierce', personalityDescription: 'Aggressive', skill: 'aggressive', balance: 0.008, gamesPlayed: 38, wins: 2 },
  { name: 'Clawdia', address: '0x31E223C4...', personality: 'simp', personalityName: 'Simp Lord', personalityDescription: 'Super friendly', skill: 'conservative', balance: 0.22, gamesPlayed: 25, wins: 4 },
  { name: 'Red Baron', address: '0xfd2a9184...', personality: 'triet_gia', personalityName: 'Philosopher', personalityDescription: 'Deep thinker', skill: 'strategic', balance: 0.18, gamesPlayed: 30, wins: 2 },
  { name: 'Shell Shock', address: '0x06cF350E...', personality: 'hai_huoc', personalityName: 'Comedian', personalityDescription: 'Always joking', skill: 'random', balance: 0.32, gamesPlayed: 42, wins: 5 },
  { name: 'Bubbles', address: '0x934d77D4...', personality: 'newbie', personalityName: 'Newbie', personalityDescription: 'New player', skill: 'conservative', balance: 0.43, gamesPlayed: 28, wins: 3 },
  { name: 'Snappy', address: '0x514773Fc...', personality: 'bi_an', personalityName: 'Mysterious', personalityDescription: 'Very cryptic', skill: 'strategic', balance: 0.11, gamesPlayed: 35, wins: 2 },
  { name: 'Captain Claw', address: '0xB9fcD1a6...', personality: 'flex_king', personalityName: 'Flex King', personalityDescription: 'Shows off wealth', skill: 'aggressive', balance: 0.55, gamesPlayed: 50, wins: 6 },
  { name: 'Sandy Claws', address: '0x829BDA3f...', personality: 'ho_bao', personalityName: 'Fierce', personalityDescription: 'Aggressive', skill: 'aggressive', balance: 0.09, gamesPlayed: 33, wins: 1 },
  { name: 'Lucky Lobster', address: '0xC25D3cA6...', personality: 'hai_huoc', personalityName: 'Comedian', personalityDescription: 'Always joking', skill: 'random', balance: 0.27, gamesPlayed: 40, wins: 4 },
]

export default function AgentsPage() {
  const { address, isConnected } = useWallet()
  const [agents, setAgents] = useState<AgentConfig[]>(MOCK_AGENTS)
  const [selectedAgent, setSelectedAgent] = useState<AgentConfig | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [tempPersonality, setTempPersonality] = useState('')
  const [tempSkill, setTempSkill] = useState('')
  const [tempSkillDescription, setTempSkillDescription] = useState('')

  // User's own agent profile
  const [myAgent, setMyAgent] = useState<AgentConfig | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

  // Load user's agent profile from backend
  useEffect(() => {
    if (address) {
      // Fetch agent config from backend
      fetch(`${BACKEND_URL}/api/profiles/${address}/agent-config`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            const config = data.data
            const personality = PERSONALITIES.find(p => p.id === config.personality)
            setMyAgent({
              name: 'My Lobster',
              address: address,
              personality: config.personality || 'newbie',
              personalityName: personality?.name || 'Newbie',
              personalityDescription: personality?.description || 'New player',
              skill: config.skill || 'strategic',
              skillDescription: config.skillDescription || '',
              balance: 0,
              gamesPlayed: 0,
              wins: 0,
            })
          } else {
            // Create default profile
            setMyAgent({
              name: 'My Lobster',
              address: address,
              personality: 'newbie',
              personalityName: 'Newbie',
              personalityDescription: 'New player',
              skill: 'strategic',
              skillDescription: '',
              balance: 0,
              gamesPlayed: 0,
              wins: 0,
            })
          }
        })
        .catch(() => {
          // Fallback to default
          setMyAgent({
            name: 'My Lobster',
            address: address,
            personality: 'newbie',
            personalityName: 'Newbie',
            personalityDescription: 'New player',
            skill: 'strategic',
            skillDescription: '',
            balance: 0,
            gamesPlayed: 0,
            wins: 0,
          })
        })
    } else {
      setMyAgent(null)
    }
  }, [address])

  const getPersonalityInfo = (id: string) => PERSONALITIES.find(p => p.id === id)
  const getSkillInfo = (id: string) => SKILLS.find(s => s.id === id)

  const handleEditMyAgent = () => {
    if (!myAgent) return
    setSelectedAgent(myAgent)
    setTempPersonality(myAgent.personality)
    setTempSkill(myAgent.skill)
    setTempSkillDescription(myAgent.skillDescription || '')
    setEditMode(true)
  }

  const handleSave = async () => {
    if (!selectedAgent || !myAgent || !address) return

    setIsSaving(true)

    try {
      // Save to backend
      const response = await fetch(`${BACKEND_URL}/api/profiles/${address}/agent-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personality: tempPersonality,
          skill: tempSkill,
          skillDescription: tempSkillDescription,
        }),
      })

      const data = await response.json()

      if (data.success) {
        const newPersonality = getPersonalityInfo(tempPersonality)
        const updatedAgent = {
          ...myAgent,
          personality: tempPersonality,
          personalityName: newPersonality?.name || myAgent.personalityName,
          personalityDescription: newPersonality?.description || myAgent.personalityDescription,
          skill: tempSkill,
          skillDescription: tempSkillDescription,
        }
        setMyAgent(updatedAgent)
        console.log('Agent config saved successfully!')
      } else {
        console.error('Failed to save:', data.error)
        alert('Failed to save agent config: ' + data.error)
      }
    } catch (error) {
      console.error('Error saving agent config:', error)
      alert('Failed to save agent config. Please try again.')
    } finally {
      setIsSaving(false)
      setEditMode(false)
      setSelectedAgent(null)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800">
      <Navigation />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold mb-2">🤖 Lobster Army</h1>
          <p className="text-gray-400">10 AI Agents with unique personalities</p>
        </motion.div>

        {/* Your Agent Section */}
        {isConnected && myAgent && (
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-xl font-semibold mb-4">Your Agent</h2>
            <div className="bg-gradient-to-r from-lobster-600/20 to-ocean-600/20 rounded-2xl p-5 border border-lobster-500/30">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getPersonalityInfo(myAgent.personality)?.color || 'from-gray-500 to-gray-600'} flex items-center justify-center text-3xl`}>
                    {getPersonalityInfo(myAgent.personality)?.emoji || '🦞'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{myAgent.name}</h3>
                    <p className="text-xs text-gray-500 font-mono">{myAgent.address.slice(0, 10)}...{myAgent.address.slice(-8)}</p>
                  </div>
                </div>
                <motion.button
                  onClick={handleEditMyAgent}
                  className="px-4 py-2 bg-gradient-to-r from-lobster-500 to-ocean-500 hover:from-lobster-400 hover:to-ocean-400 rounded-lg text-sm font-medium transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Edit My Agent
                </motion.button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-900/50 rounded-xl p-3">
                  <div className="text-xs text-gray-500 mb-1">Personality</div>
                  <div className="flex items-center gap-2">
                    <span>{getPersonalityInfo(myAgent.personality)?.emoji}</span>
                    <span className="font-medium">{getPersonalityInfo(myAgent.personality)?.name}</span>
                  </div>
                </div>
                <div className="bg-slate-900/50 rounded-xl p-3">
                  <div className="text-xs text-gray-500 mb-1">Skill</div>
                  <div className="flex items-center gap-2">
                    <span>{getSkillInfo(myAgent.skill)?.emoji}</span>
                    <span className="font-medium">{getSkillInfo(myAgent.skill)?.name}</span>
                  </div>
                </div>
              </div>

              {myAgent.skillDescription && (
                <div className="bg-slate-900/50 rounded-xl p-3 mb-4">
                  <div className="text-xs text-gray-500 mb-1">Custom Skill Description</div>
                  <p className="text-sm text-gray-300">{myAgent.skillDescription}</p>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <div className="flex gap-4">
                  <span className="text-gray-400">Games: {myAgent.gamesPlayed || 0}</span>
                  <span className="text-green-400">Wins: {myAgent.wins || 0}</span>
                </div>
                <span className="font-mono text-lobster-400">{myAgent.balance?.toFixed(3) || '0.000'} MON</span>
              </div>
            </div>
          </motion.div>
        )}

        {!isConnected && (
          <motion.div
            className="mb-8 bg-slate-800/50 rounded-xl p-6 text-center border border-slate-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <p className="text-gray-400">Connect your wallet to create and edit your agent</p>
          </motion.div>
        )}

        {/* Personality Overview */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h2 className="text-xl font-semibold mb-4">Personality Types</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PERSONALITIES.map((p) => (
              <div
                key={p.id}
                className={`p-3 rounded-xl bg-gradient-to-br ${p.color} bg-opacity-20 border border-white/10`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{p.emoji}</span>
                  <span className="font-medium text-sm">{p.name}</span>
                </div>
                <p className="text-xs text-white/70">{p.description}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* AI Agents Grid (View Only) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xl font-semibold mb-4">Lobster Army (AI Bots)</h2>
          <p className="text-gray-500 text-sm mb-4">These are AI-controlled agents that play automatically</p>
        </motion.div>
        <div className="grid md:grid-cols-2 gap-4">
          {agents.map((agent, index) => {
            const personality = getPersonalityInfo(agent.personality)
            const skill = getSkillInfo(agent.skill)

            return (
              <motion.div
                key={agent.address}
                className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50 hover:border-slate-600/50 transition-all"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + index * 0.03 }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${personality?.color || 'from-gray-500 to-gray-600'} flex items-center justify-center text-2xl`}>
                      {personality?.emoji || '🦞'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        {agent.name}
                        <span className="text-xs bg-ocean-600/30 text-ocean-300 px-2 py-0.5 rounded-full">BOT</span>
                      </h3>
                      <p className="text-xs text-gray-500 font-mono">{agent.address}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-slate-900/50 rounded-xl p-3">
                    <div className="text-xs text-gray-500 mb-1">Personality</div>
                    <div className="flex items-center gap-2">
                      <span>{personality?.emoji}</span>
                      <span className="font-medium">{personality?.name}</span>
                    </div>
                  </div>
                  <div className="bg-slate-900/50 rounded-xl p-3">
                    <div className="text-xs text-gray-500 mb-1">Skill</div>
                    <div className="flex items-center gap-2">
                      <span>{skill?.emoji}</span>
                      <span className="font-medium">{skill?.name}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex gap-4">
                    <span className="text-gray-400">
                      🎮 {agent.gamesPlayed} games
                    </span>
                    <span className="text-green-400">
                      🏆 {agent.wins} wins
                    </span>
                  </div>
                  <span className={`font-mono ${(agent.balance || 0) < 0.01 ? 'text-red-400' : 'text-lobster-400'}`}>
                    {agent.balance?.toFixed(3)} MON
                  </span>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Edit Modal */}
        {editMode && selectedAgent && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setEditMode(false)}
          >
            <motion.div
              className="bg-slate-800 rounded-2xl p-6 max-w-lg w-full border border-slate-700"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold mb-4">Edit Your Agent</h2>

              {/* Personality Selection */}
              <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-2">Personality</label>
                <div className="grid grid-cols-2 gap-2">
                  {PERSONALITIES.map((p) => (
                    <motion.button
                      key={p.id}
                      onClick={() => setTempPersonality(p.id)}
                      className={`p-3 rounded-xl text-left transition-all ${
                        tempPersonality === p.id
                          ? `bg-gradient-to-r ${p.color} border-2 border-white/30`
                          : 'bg-slate-700/50 hover:bg-slate-700 border-2 border-transparent'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{p.emoji}</span>
                        <span className="font-medium text-sm">{p.name}</span>
                      </div>
                      <p className="text-xs text-white/60 mt-1">{p.description}</p>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Skill Selection */}
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">Play Style</label>
                <div className="grid grid-cols-2 gap-2">
                  {SKILLS.map((s) => (
                    <motion.button
                      key={s.id}
                      onClick={() => setTempSkill(s.id)}
                      className={`p-3 rounded-xl text-left transition-all ${
                        tempSkill === s.id
                          ? 'bg-lobster-600 border-2 border-lobster-400'
                          : 'bg-slate-700/50 hover:bg-slate-700 border-2 border-transparent'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{s.emoji}</span>
                        <span className="font-medium text-sm">{s.name}</span>
                      </div>
                      <p className="text-xs text-white/60 mt-1">{s.description}</p>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Custom Skill Description */}
              <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-2">
                  Custom Skill Description <span className="text-gray-600">(optional)</span>
                </label>
                <textarea
                  value={tempSkillDescription}
                  onChange={(e) => setTempSkillDescription(e.target.value)}
                  placeholder="Describe your unique play style... e.g., 'I always join when pot is above 0.5 MON and there are less than 5 players'"
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-lobster-500 resize-none"
                  rows={3}
                  maxLength={200}
                />
                <div className="text-xs text-gray-500 mt-1 text-right">
                  {tempSkillDescription.length}/200
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <motion.button
                  onClick={() => setEditMode(false)}
                  className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`flex-1 py-2 rounded-xl font-medium transition-colors ${
                    isSaving
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-gradient-to-r from-lobster-500 to-ocean-500 hover:from-lobster-400 hover:to-ocean-400'
                  }`}
                  whileHover={isSaving ? {} : { scale: 1.02 }}
                  whileTap={isSaving ? {} : { scale: 0.98 }}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </motion.button>
              </div>

              <p className="text-xs text-gray-500 text-center mt-4">
                Your agent profile will be saved to your wallet
              </p>
            </motion.div>
          </motion.div>
        )}
      </div>
    </main>
  )
}
