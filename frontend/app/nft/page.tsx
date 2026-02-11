'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPublicClient, http, formatEther, encodeFunctionData } from 'viem'
import { Navigation } from '@/components/Navigation'
import { useWallet, getWalletProvider } from '@/hooks/useWallet'
import { WalletButton } from '@/components/WalletButton'
import { LobsterLoader } from '@/components/LobsterLoader'
import { LOBSTER_NFT_ADDRESS, LOBSTER_NFT_ABI, MINT_PRICE_WEI, PMON_MINT_COST } from '@/lib/contracts/LobsterRobotNFT'
import { generateTraits, calculateRarityScore, drawFullLobster, type Trait, type Traits } from '@/lib/drawLobster'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

// Mint costs
const MINT_COST = PMON_MINT_COST // 500 pMON
const MINT_PRICE_MON = 10 // 10 MON

// Monad chain config for viem
const monadChain = {
  id: 143,
  name: 'Monad',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://monad-mainnet.drpc.org'] },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://monadexplorer.com' },
  },
} as const

interface OwnedNFT {
  tokenId: number
  seed: number
  rarityTier: string
  rarityScore: number
  traits: Traits
  mintedAt: string
}

function addressToSeed(address: string): number {
  const hex = address.slice(2, 10)
  return parseInt(hex, 16)
}

// ═══════════════════════════════════════════════════════════════
// RARITY BADGE COMPONENT
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
// COLLECTION STATS
// ═══════════════════════════════════════════════════════════════
interface CollectionStats {
  totalMinted: number
  uniqueOwners: number
  maxSupply: number
  mintPrice: string
  pmonMintCost: number
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════
export default function NFTGeneratorPage() {
  const { address, isConnected } = useWallet()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mounted, setMounted] = useState(false)
  const [seed, setSeed] = useState(12345)
  const [traits, setTraits] = useState<Traits | null>(null)
  const [pmonBalance, setPmonBalance] = useState(0)
  const [monBalance, setMonBalance] = useState<string>('0')
  const [minting, setMinting] = useState(false)
  const [mintStep, setMintStep] = useState<'idle' | 'preparing' | 'confirming' | 'recording'>('idle')
  const [mintSuccess, setMintSuccess] = useState(false)
  const [mintedTokenId, setMintedTokenId] = useState<number | null>(null)
  const [mintedSeed, setMintedSeed] = useState<number | null>(null)
  const [mintedTraits, setMintedTraits] = useState<Traits | null>(null)
  const [mintedRarity, setMintedRarity] = useState<string>('')
  const [mintTxHash, setMintTxHash] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'generate' | 'collection' | 'my-nfts'>('generate')
  const [ownedNFTs, setOwnedNFTs] = useState<OwnedNFT[]>([])
  const [collectionStats, setCollectionStats] = useState<CollectionStats | null>(null)
  const [loadingNFTs, setLoadingNFTs] = useState(false)

  // Check if user has enough MON and pMON
  const hasEnoughMon = parseFloat(monBalance) >= MINT_PRICE_MON
  const hasEnoughPmon = pmonBalance >= MINT_COST
  const canMintOnChain = hasEnoughMon && hasEnoughPmon && !minting && isConnected

  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch MON balance
  useEffect(() => {
    if (!address || !mounted) return

    const fetchMonBalance = async () => {
      try {
        const publicClient = createPublicClient({
          chain: monadChain,
          transport: http(),
        })
        const balance = await publicClient.getBalance({ address: address as `0x${string}` })
        setMonBalance(formatEther(balance))
      } catch (err) {
        console.error('Failed to fetch MON balance:', err)
      }
    }

    fetchMonBalance()
    const interval = setInterval(fetchMonBalance, 10000) // Refresh every 10s
    return () => clearInterval(interval)
  }, [address, mounted])

  // Fetch pMON balance
  useEffect(() => {
    if (!address) return

    const fetchBalance = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/pmon/balance/${address}`)
        const data = await res.json()
        if (data.success) {
          setPmonBalance(data.data.balance || 0)
        }
      } catch (err) {
        console.error('Failed to fetch pMON balance:', err)
      }
    }

    fetchBalance()
    setSeed(addressToSeed(address))
  }, [address])

  // Fetch collection stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/nft/stats`)
        const data = await res.json()
        if (data.success) {
          setCollectionStats(data.data)
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err)
      }
    }
    fetchStats()
  }, [])

  // Fetch owned NFTs
  useEffect(() => {
    if (!address || activeTab !== 'my-nfts') return

    const fetchOwnedNFTs = async () => {
      setLoadingNFTs(true)
      try {
        const res = await fetch(`${BACKEND_URL}/api/nft/owner/${address}`)
        const data = await res.json()
        if (data.success) {
          setOwnedNFTs(data.data.nfts || [])
        }
      } catch (err) {
        console.error('Failed to fetch owned NFTs:', err)
      } finally {
        setLoadingNFTs(false)
      }
    }

    fetchOwnedNFTs()
  }, [address, activeTab])

  // Auto-random NFT every 2 seconds when on generate tab
  useEffect(() => {
    if (activeTab !== 'generate' || minting || mintSuccess) return

    const interval = setInterval(() => {
      setSeed(Math.floor(Math.random() * 999999) + 1)
    }, 2000)

    return () => clearInterval(interval)
  }, [activeTab, minting, mintSuccess])

  // Draw lobster on canvas
  const drawLobster = useCallback((canvas: HTMLCanvasElement, currentSeed: number, scale: number = 8) => {
    drawFullLobster(canvas, currentSeed, scale)
    setTraits(generateTraits(currentSeed))
  }, [])

  useEffect(() => {
    if (!canvasRef.current) return
    drawLobster(canvasRef.current, seed)
  }, [seed, drawLobster])

  const handleMint = async () => {
    if (!address || !canMintOnChain) return

    setMinting(true)
    setMintStep('preparing')

    try {
      // Step 1: Get wallet provider
      const provider = await getWalletProvider()
      if (!provider) {
        throw new Error('No wallet connected')
      }

      // Step 2: Prepare mint - get random seed from backend and verify pMON balance
      const prepareRes = await fetch(`${BACKEND_URL}/api/nft/prepare-mint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      })

      const prepareData = await prepareRes.json()
      if (!prepareData.success) {
        throw new Error(prepareData.error || 'Failed to prepare mint')
      }

      const mintSeed = prepareData.data.seed
      setMintStep('confirming')

      // Step 3: Create public client for waiting tx
      const publicClient = createPublicClient({
        chain: monadChain,
        transport: http(),
      })

      // Encode the mint function call
      const data = encodeFunctionData({
        abi: LOBSTER_NFT_ABI,
        functionName: 'mint',
        args: [BigInt(mintSeed)],
      })

      // Send transaction via provider directly
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: address,
          to: LOBSTER_NFT_ADDRESS,
          data,
          value: '0x' + MINT_PRICE_WEI.toString(16), // Convert to hex
        }],
      }) as `0x${string}`

      console.log('Transaction sent:', txHash)
      setMintStep('recording')

      // Step 4: Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
      console.log('Transaction confirmed:', receipt)

      if (receipt.status === 'reverted') {
        throw new Error('Transaction reverted')
      }

      // Step 5: Record on backend
      const confirmRes = await fetch(`${BACKEND_URL}/api/nft/confirm-mint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          seed: mintSeed,
          txHash: txHash,
        }),
      })

      const confirmData = await confirmRes.json()
      if (confirmData.success) {
        setSeed(mintSeed)
        setMintedSeed(mintSeed)
        setPmonBalance(confirmData.data.newBalance || pmonBalance - MINT_COST)
        setMintedTokenId(confirmData.data.tokenId)
        setMintedTraits(confirmData.data.traits)
        setMintedRarity(confirmData.data.rarityTier)
        setMintTxHash(txHash)
        setMintSuccess(true)

        // Refresh MON balance
        const newBalance = await publicClient.getBalance({ address: address as `0x${string}` })
        setMonBalance(formatEther(newBalance))
      } else {
        alert(confirmData.error || 'Failed to record mint')
      }

    } catch (err: any) {
      console.error('Failed to mint:', err)
      // User rejected or other error
      if (err.code === 4001 || err.message?.includes('rejected')) {
        // User rejected - don't show alert
      } else {
        alert(err.message || 'Failed to mint NFT')
      }
    } finally {
      setMinting(false)
      setMintStep('idle')
    }
  }

  const handleDownload = () => {
    if (!canvasRef.current) return
    const link = document.createElement('a')
    link.download = `lobster-robot-${seed}.png`
    link.href = canvasRef.current.toDataURL('image/png')
    link.click()
  }

  const { score, overall } = traits ? calculateRarityScore(traits) : { score: 0, overall: 'Common' }

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      <Navigation />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <span>🦞</span> Lobster Robot NFT
              </h1>
              <p className="text-gray-400 mt-1">Generate unique pixel art robots on Monad</p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {collectionStats && (
                <div className="text-sm text-gray-400">
                  <span className="text-white font-semibold">{collectionStats.totalMinted.toLocaleString()}</span> / {collectionStats.maxSupply.toLocaleString()} minted
                </div>
              )}
              {mounted && isConnected && (
                <>
                  <div className="bg-blue-500/20 border border-blue-500/50 rounded-xl px-3 py-1.5 text-sm">
                    <span className="text-blue-400">
                      ⟠ {parseFloat(monBalance).toFixed(2)} MON
                    </span>
                  </div>
                  <div className="bg-purple-500/20 border border-purple-500/50 rounded-xl px-3 py-1.5 text-sm">
                    <span className="text-purple-400">💎 {pmonBalance.toLocaleString()} pMON</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {(['generate', 'my-nfts', 'collection'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-gray-400 hover:text-white'
                }`}
              >
                {tab === 'generate' && '🎨 Generate'}
                {tab === 'my-nfts' && '🖼️ My NFTs'}
                {tab === 'collection' && '📊 Collection'}
              </button>
            ))}
          </div>

          {!isConnected ? (
            <div className="bg-slate-800/50 rounded-xl p-8 text-center border border-slate-700">
              <span className="text-6xl mb-4 block">🦞</span>
              <h2 className="text-xl font-semibold mb-4">Connect Wallet to Generate</h2>
              <p className="text-gray-400 mb-6">Connect your wallet to create your unique Lobster Robot NFT!</p>
              <WalletButton />
            </div>
          ) : (
            <>
              {/* Generate Tab */}
              {activeTab === 'generate' && (
                <div className="grid lg:grid-cols-3 gap-6">
                  {/* Canvas Area */}
                  <div className="lg:col-span-2">
                    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                      <div className="flex justify-center">
                        <motion.div
                          className="rounded-xl overflow-hidden shadow-2xl"
                          whileHover={{ scale: 1.02 }}
                          transition={{ type: 'spring', stiffness: 300 }}
                        >
                          <canvas
                            ref={canvasRef}
                            className="block"
                            style={{ imageRendering: 'pixelated' }}
                          />
                        </motion.div>
                      </div>

                      {traits && (
                        <div className="mt-4 text-center">
                          <span className={`text-lg font-bold ${
                            overall === 'LEGENDARY' ? 'text-yellow-400' :
                            overall === 'Epic' ? 'text-purple-400' :
                            overall === 'Rare' ? 'text-blue-400' :
                            overall === 'Uncommon' ? 'text-green-400' : 'text-gray-400'
                          }`}>
                            {overall === 'LEGENDARY' ? '🌟 ' : ''}{overall}
                          </span>
                          <span className="text-gray-500 ml-2">({score} pts)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Controls Sidebar */}
                  <div className="space-y-6">
                    {/* Traits */}
                    {traits && (
                      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                          <span className="text-purple-400">•</span> Traits
                        </h3>

                        <div className="space-y-2 text-sm">
                          {([
                            ['Shell', traits.shellColor],
                            ['Head', traits.headShape],
                            ['Eyes', traits.eyes],
                            ['Mouth', traits.mouth],
                            ['Claws', traits.claws],
                            ['Body', traits.body],
                            ['Legs', traits.legs],
                            ['Hat', traits.hat],
                            ['Accessory', traits.accessory],
                          ] as [string, Trait][]).map(([label, trait]) => (
                            <div key={label} className="flex items-center justify-between">
                              <span className="text-gray-500">{label}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-200">{trait.name}</span>
                                <RarityBadge rarity={trait.rarity} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <span className="text-purple-400">•</span> Mint On-Chain
                      </h3>

                      {/* Balance Display */}
                      <div className="space-y-2 mb-4 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">MON Balance:</span>
                          <span className={`font-medium ${hasEnoughMon ? 'text-green-400' : 'text-red-400'}`}>
                            {parseFloat(monBalance).toFixed(2)} MON
                            {hasEnoughMon ? ' ✓' : ' ✗'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">pMON Balance:</span>
                          <span className={`font-medium ${hasEnoughPmon ? 'text-green-400' : 'text-red-400'}`}>
                            {pmonBalance.toLocaleString()} pMON
                            {hasEnoughPmon ? ' ✓' : ' ✗'}
                          </span>
                        </div>
                        <div className="border-t border-slate-700 pt-2 mt-2">
                          <div className="flex justify-between items-center text-xs text-gray-500">
                            <span>Mint Cost:</span>
                            <span>{MINT_PRICE_MON} MON + {MINT_COST} pMON</span>
                          </div>
                        </div>
                      </div>

                      <motion.button
                        onClick={handleMint}
                        disabled={!canMintOnChain}
                        className={`w-full py-3 rounded-lg font-medium mb-3 transition-all relative overflow-hidden ${
                          minting
                            ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-[length:200%_100%] animate-gradient'
                            : canMintOnChain
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 hover:shadow-lg hover:shadow-purple-500/25'
                            : 'bg-slate-700 text-gray-500 cursor-not-allowed'
                        }`}
                        whileTap={canMintOnChain ? { scale: 0.98 } : undefined}
                      >
                        {minting ? (
                          <span className="flex items-center justify-center gap-2">
                            <motion.span
                              animate={{ rotate: [0, 15, -15, 0] }}
                              transition={{ duration: 0.5, repeat: Infinity }}
                            >
                              🦞
                            </motion.span>
                            {mintStep === 'preparing' && 'Preparing...'}
                            {mintStep === 'confirming' && 'Confirm in wallet...'}
                            {mintStep === 'recording' && 'Confirming & Recording...'}
                          </span>
                        ) : (
                          <span>🎲 Mint Random NFT</span>
                        )}
                      </motion.button>

                      <button
                        onClick={handleDownload}
                        className="w-full bg-slate-700 hover:bg-slate-600 py-3 rounded-lg font-medium transition-colors"
                      >
                        💾 Download PNG
                      </button>

                      {/* Requirements warning */}
                      {(!hasEnoughMon || !hasEnoughPmon) && (
                        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                          <p className="text-xs text-red-400 text-center">
                            {!hasEnoughMon && !hasEnoughPmon ? (
                              <>Need {MINT_PRICE_MON} MON and {MINT_COST - pmonBalance} more pMON</>
                            ) : !hasEnoughMon ? (
                              <>Need {MINT_PRICE_MON} MON for on-chain mint</>
                            ) : (
                              <>Need {MINT_COST - pmonBalance} more pMON</>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* My NFTs Tab */}
              {activeTab === 'my-nfts' && (
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                  <h3 className="font-semibold mb-6">Your Lobster Robots</h3>

                  {loadingNFTs ? (
                    <LobsterLoader size="lg" text="Loading your NFTs..." />
                  ) : ownedNFTs.length === 0 ? (
                    <div className="text-center py-12">
                      <span className="text-5xl block mb-4">🦞</span>
                      <p className="text-gray-400 mb-4">You don't own any Lobster Robots yet</p>
                      <button
                        onClick={() => setActiveTab('generate')}
                        className="bg-purple-600 hover:bg-purple-500 px-6 py-2 rounded-lg transition-colors"
                      >
                        Mint Your First NFT
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {ownedNFTs.map((nft) => (
                        <motion.div
                          key={nft.tokenId}
                          className="bg-slate-700/50 rounded-xl p-3 cursor-pointer hover:bg-slate-700 transition-colors"
                          whileHover={{ scale: 1.02 }}
                          onClick={() => {
                            setSeed(nft.seed)
                            setActiveTab('generate')
                          }}
                        >
                          <NFTPreview seed={nft.seed} />
                          <div className="mt-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">#{nft.tokenId}</span>
                              <RarityBadge rarity={nft.rarityTier} />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Score: {nft.rarityScore}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Collection Tab */}
              {activeTab === 'collection' && collectionStats && (
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                    <h3 className="font-semibold mb-6">Collection Stats</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Total Minted</span>
                        <span className="text-xl font-bold">{collectionStats.totalMinted.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Max Supply</span>
                        <span className="text-xl font-bold">{collectionStats.maxSupply.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Unique Owners</span>
                        <span className="text-xl font-bold">{collectionStats.uniqueOwners}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Mint Price</span>
                        <span className="text-xl font-bold">{collectionStats.pmonMintCost} pMON</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">On-Chain Price</span>
                        <span className="text-xl font-bold">{collectionStats.mintPrice}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                    <h3 className="font-semibold mb-6">Collection Info</h3>
                    <div className="space-y-4 text-sm">
                      <div>
                        <span className="text-gray-400 block mb-1">Contract</span>
                        <span className="font-mono text-purple-400 text-xs break-all">0x8d9DA2d734DeD78552136833B124E36d3a50EDfB</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block mb-1">Symbol</span>
                        <span className="font-semibold">LBSTR</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block mb-1">Royalty</span>
                        <span className="font-semibold">5%</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block mb-1">Marketplace</span>
                        <span className="font-semibold">Magic Eden (Monad)</span>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                    <h3 className="font-semibold mb-6">Trait Rarity</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                      {['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'].map((tier) => (
                        <div key={tier} className="bg-slate-700/50 rounded-lg p-4">
                          <RarityBadge rarity={tier} />
                          <p className="text-gray-400 text-xs mt-2">
                            {tier === 'Common' && '~35%'}
                            {tier === 'Uncommon' && '~30%'}
                            {tier === 'Rare' && '~20%'}
                            {tier === 'Epic' && '~12%'}
                            {tier === 'Legendary' && '~3%'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </main>

      {/* Mint Success Modal - Shows the ACTUAL minted NFT */}
      <AnimatePresence>
        {mintSuccess && (
          <motion.div
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMintSuccess(false)}
          >
            <motion.div
              className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl p-6 text-center border border-purple-500/50 max-w-sm w-full relative overflow-hidden"
              initial={{ scale: 0.5, rotateY: 180 }}
              animate={{ scale: 1, rotateY: 0 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.8 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sparkle effects */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                    style={{
                      left: `${10 + (i * 8) % 80}%`,
                      top: `${5 + (i * 13) % 90}%`,
                    }}
                    animate={{
                      scale: [0, 1, 0],
                      opacity: [0, 1, 0],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </div>

              {/* Header */}
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <span className="text-5xl block mb-2">🎉</span>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  NFT Minted!
                </h2>
              </motion.div>

              {/* NFT Preview - Shows the ACTUAL minted NFT */}
              <motion.div
                className="my-4 flex justify-center"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', delay: 0.5, duration: 0.8 }}
              >
                <div className="rounded-xl overflow-hidden border-4 border-purple-500/50 shadow-2xl shadow-purple-500/20">
                  <NFTPreview seed={mintedSeed ?? seed} />
                </div>
              </motion.div>

              {/* NFT Info */}
              <motion.div
                className="space-y-2 mb-4"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                <p className="text-lg font-semibold">
                  Lobster Robot #{mintedTokenId}
                </p>
                <p className="text-sm text-gray-400">
                  Seed: <span className="font-mono text-purple-400">{mintedSeed ?? seed}</span>
                </p>
                {mintedRarity && (
                  <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                    mintedRarity === 'Legendary' ? 'bg-yellow-500/20 text-yellow-400 animate-pulse' :
                    mintedRarity === 'Epic' ? 'bg-purple-500/20 text-purple-400' :
                    mintedRarity === 'Rare' ? 'bg-blue-500/20 text-blue-400' :
                    mintedRarity === 'Uncommon' ? 'bg-green-500/20 text-green-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {mintedRarity === 'Legendary' && '🌟 '}
                    {mintedRarity}
                  </div>
                )}
                {mintTxHash && (
                  <a
                    href={`https://monadexplorer.com/tx/${mintTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-blue-400 hover:text-blue-300 mt-2"
                  >
                    View on Explorer ↗
                  </a>
                )}
              </motion.div>

              {/* Actions */}
              <motion.div
                className="flex gap-3 justify-center"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.9 }}
              >
                <button
                  onClick={() => {
                    setMintSuccess(false)
                    setActiveTab('my-nfts')
                  }}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 px-5 py-2 rounded-lg font-medium transition-all"
                >
                  View My NFTs
                </button>
                <button
                  onClick={() => setMintSuccess(false)}
                  className="bg-slate-700 hover:bg-slate-600 px-5 py-2 rounded-lg font-medium transition-colors"
                >
                  Mint More
                </button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// NFT PREVIEW COMPONENT
// ═══════════════════════════════════════════════════════════════
function NFTPreview({ seed }: { seed: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    drawFullLobster(canvasRef.current, seed, 3)
  }, [seed])

  return (
    <canvas
      ref={canvasRef}
      className="w-full block rounded-lg"
      style={{ imageRendering: 'pixelated' }}
    />
  )
}
