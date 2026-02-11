'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { drawFullLobster } from '@/lib/drawLobster'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

interface OwnedNFT {
  tokenId: number
  seed: number
  rarityTier: string
  rarityScore: number
}

interface NFTAvatarPickerProps {
  isOpen: boolean
  onClose: () => void
  walletAddress: string | undefined
  currentNftSeed?: number | null
  onSelect: (seed: number | null) => Promise<boolean>
}

function NFTPreviewSmall({ seed }: { seed: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    drawFullLobster(canvasRef.current, seed, 2)
  }, [seed])

  return (
    <canvas
      ref={canvasRef}
      className="w-full block rounded-lg"
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

function RarityBadge({ rarity }: { rarity: string }) {
  const colors: Record<string, string> = {
    common: 'bg-gray-500/30 text-gray-300',
    uncommon: 'bg-green-500/30 text-green-300',
    rare: 'bg-blue-500/30 text-blue-300',
    epic: 'bg-purple-500/30 text-purple-300',
    legendary: 'bg-yellow-500/30 text-yellow-300',
  }

  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold ${colors[rarity.toLowerCase()] || colors.common}`}>
      {rarity}
    </span>
  )
}

export function NFTAvatarPicker({
  isOpen,
  onClose,
  walletAddress,
  currentNftSeed,
  onSelect,
}: NFTAvatarPickerProps) {
  const [nfts, setNfts] = useState<OwnedNFT[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedSeed, setSelectedSeed] = useState<number | null>(currentNftSeed || null)

  useEffect(() => {
    if (!isOpen || !walletAddress) return

    const fetchNFTs = async () => {
      setLoading(true)
      try {
        const res = await fetch(`${BACKEND_URL}/api/nft/owner/${walletAddress}`)
        const data = await res.json()
        if (data.success) {
          setNfts(data.data.nfts || [])
        }
      } catch (err) {
        console.error('Failed to fetch NFTs:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchNFTs()
  }, [isOpen, walletAddress])

  useEffect(() => {
    setSelectedSeed(currentNftSeed || null)
  }, [currentNftSeed])

  const handleConfirm = async () => {
    setSaving(true)
    const success = await onSelect(selectedSeed)
    setSaving(false)
    if (success) onClose()
  }

  const handleRemove = async () => {
    setSaving(true)
    const success = await onSelect(null)
    setSaving(false)
    if (success) onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/70 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-slate-800 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden border border-slate-700 flex flex-col"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-700">
                <h2 className="text-lg font-semibold">Set NFT Avatar</h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Content */}
              <div className="p-4 overflow-y-auto flex-1">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">Loading your NFTs...</p>
                  </div>
                ) : nfts.length === 0 ? (
                  <div className="text-center py-8">
                    <span className="text-4xl block mb-3">🦞</span>
                    <p className="text-gray-400 mb-2">No NFTs found</p>
                    <p className="text-gray-500 text-sm">Mint a Lobster Robot NFT first!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {nfts.map((nft) => (
                      <motion.div
                        key={nft.tokenId}
                        className={`rounded-xl p-2 cursor-pointer transition-colors border-2 ${
                          selectedSeed === nft.seed
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-transparent bg-slate-700/50 hover:bg-slate-700'
                        }`}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setSelectedSeed(nft.seed)}
                      >
                        <NFTPreviewSmall seed={nft.seed} />
                        <div className="mt-1.5 flex items-center justify-between">
                          <span className="text-xs font-medium">#{nft.tokenId}</span>
                          <RarityBadge rarity={nft.rarityTier} />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-700 flex gap-3">
                {currentNftSeed != null && (
                  <button
                    onClick={handleRemove}
                    disabled={saving}
                    className="px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-xl text-sm transition-colors disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  onClick={handleConfirm}
                  disabled={saving || selectedSeed === null}
                  className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-600 text-white py-2 rounded-xl transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {saving ? 'Saving...' : 'Set Avatar'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
