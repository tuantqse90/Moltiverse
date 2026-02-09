'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPublicClient, http, formatEther, encodeFunctionData } from 'viem'
import { Navigation } from '@/components/Navigation'
import { useWallet, getWalletProvider } from '@/hooks/useWallet'
import { WalletButton } from '@/components/WalletButton'
import { LobsterLoader } from '@/components/LobsterLoader'
import { LOBSTER_NFT_ADDRESS, LOBSTER_NFT_ABI, MINT_PRICE_WEI, PMON_MINT_COST } from '@/lib/contracts/LobsterRobotNFT'

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

// ═══════════════════════════════════════════════════════════════
// TRAIT POOLS
// ═══════════════════════════════════════════════════════════════

const SHELL_COLORS = [
  { name: 'Classic Red', h: 0, s: 80, b: 90, rarity: 'common' },
  { name: 'Sunset Orange', h: 25, s: 85, b: 95, rarity: 'common' },
  { name: 'Cyber Blue', h: 200, s: 80, b: 95, rarity: 'uncommon' },
  { name: 'Toxic Green', h: 130, s: 75, b: 85, rarity: 'uncommon' },
  { name: 'Royal Purple', h: 270, s: 70, b: 85, rarity: 'rare' },
  { name: 'Bubblegum Pink', h: 330, s: 65, b: 95, rarity: 'rare' },
  { name: 'Golden', h: 45, s: 90, b: 95, rarity: 'epic' },
  { name: 'Shadow Chrome', h: 240, s: 10, b: 45, rarity: 'epic' },
  { name: 'Holographic', h: 180, s: 40, b: 98, rarity: 'legendary' },
  { name: 'Cosmic Void', h: 280, s: 95, b: 30, rarity: 'legendary' },
]

const HEAD_SHAPES = [
  { name: 'Round Bot', rarity: 'common' },
  { name: 'Angular Mecha', rarity: 'common' },
  { name: 'Bubble Dome', rarity: 'uncommon' },
  { name: 'Skull Face', rarity: 'rare' },
  { name: 'Hammerhead', rarity: 'uncommon' },
  { name: 'Flat Top', rarity: 'common' },
  { name: 'Spike Head', rarity: 'rare' },
  { name: 'UFO Head', rarity: 'epic' },
]

const EYES = [
  { name: 'Normal', rarity: 'common' },
  { name: 'Angry', rarity: 'common' },
  { name: 'Derp', rarity: 'uncommon' },
  { name: 'Cyclops', rarity: 'rare' },
  { name: 'Heart Eyes', rarity: 'rare' },
  { name: 'X_X Dead', rarity: 'uncommon' },
  { name: 'Laser', rarity: 'epic' },
  { name: 'Anime Sparkle', rarity: 'epic' },
  { name: 'Bitcoin', rarity: 'legendary' },
  { name: 'Hypno Spiral', rarity: 'legendary' },
]

const MOUTHS = [
  { name: 'Grin', rarity: 'common' },
  { name: 'Teeth', rarity: 'common' },
  { name: 'Tongue Out', rarity: 'uncommon' },
  { name: 'Moustache', rarity: 'rare' },
  { name: 'Cigar', rarity: 'rare' },
  { name: 'Frown', rarity: 'uncommon' },
  { name: 'Blep', rarity: 'common' },
  { name: 'Scream', rarity: 'epic' },
]

const CLAWS = [
  { name: 'Classic Pincers', rarity: 'common' },
  { name: 'Tiny Arms', rarity: 'common' },
  { name: 'Mech Gauntlets', rarity: 'uncommon' },
  { name: 'Hammer Fists', rarity: 'rare' },
  { name: 'Laser Pincers', rarity: 'rare' },
  { name: 'Peace Signs', rarity: 'uncommon' },
  { name: 'Diamond Claws', rarity: 'epic' },
  { name: 'Chainsaw', rarity: 'legendary' },
]

const BODIES = [
  { name: 'Standard', rarity: 'common' },
  { name: 'Buff', rarity: 'uncommon' },
  { name: 'Slim', rarity: 'common' },
  { name: 'Tank Armor', rarity: 'rare' },
  { name: 'Mech Suit', rarity: 'epic' },
  { name: 'Noodle', rarity: 'uncommon' },
  { name: 'Crystal', rarity: 'rare' },
  { name: 'HODL Chest', rarity: 'legendary' },
]

const HATS = [
  { name: 'None', rarity: 'common' },
  { name: 'Top Hat', rarity: 'uncommon' },
  { name: 'Beanie', rarity: 'common' },
  { name: 'Crown', rarity: 'epic' },
  { name: 'Propeller', rarity: 'uncommon' },
  { name: 'Chef Hat', rarity: 'uncommon' },
  { name: 'Devil Horns', rarity: 'rare' },
  { name: 'Halo', rarity: 'rare' },
  { name: 'Antenna', rarity: 'common' },
  { name: 'Doge Crown', rarity: 'legendary' },
]

const ACCESSORIES = [
  { name: 'None', rarity: 'common' },
  { name: 'Headphones', rarity: 'common' },
  { name: 'Sunglasses', rarity: 'common' },
  { name: 'VR Headset', rarity: 'rare' },
  { name: 'Monocle', rarity: 'uncommon' },
  { name: 'Deal With It', rarity: 'epic' },
  { name: 'Earring', rarity: 'uncommon' },
  { name: 'Scar', rarity: 'rare' },
]

const LEGS = [
  { name: 'Rocket Boosters', rarity: 'common' },
  { name: 'Twin Thrusters', rarity: 'common' },
  { name: 'Jet Flames', rarity: 'uncommon' },
  { name: 'Plasma Engines', rarity: 'uncommon' },
  { name: 'Nuclear Propulsion', rarity: 'rare' },
  { name: 'Ion Drives', rarity: 'rare' },
  { name: 'Quantum Thrusters', rarity: 'epic' },
  { name: 'Anti-Gravity', rarity: 'epic' },
  { name: 'Warp Drive', rarity: 'legendary' },
  { name: 'Monad Rockets', rarity: 'legendary' },
]

const BG_COLORS = [
  { name: 'Sky Blue', r: 180, g: 220, b: 255 },
  { name: 'Sunset', r: 255, g: 200, b: 150 },
  { name: 'Neon Pink', r: 255, g: 150, b: 200 },
  { name: 'Mint', r: 180, g: 255, b: 220 },
  { name: 'Lavender', r: 220, g: 200, b: 255 },
  { name: 'Cream', r: 255, g: 250, b: 230 },
  { name: 'Dark Space', r: 20, g: 15, b: 40 },
  { name: 'Deep Ocean', r: 15, g: 40, b: 60 },
]

// ═══════════════════════════════════════════════════════════════
// SEEDED RANDOM
// ═══════════════════════════════════════════════════════════════
class SeededRandom {
  private seed: number

  constructor(seed: number) {
    this.seed = seed
  }

  next(): number {
    this.seed = (this.seed * 16807 + 0) % 2147483647
    return (this.seed - 1) / 2147483646
  }

  nextInt(max: number): number {
    return Math.floor(this.next() * max)
  }

  pick<T>(arr: T[]): T {
    return arr[this.nextInt(arr.length)]
  }
}

// ═══════════════════════════════════════════════════════════════
// GENERATE TRAITS
// ═══════════════════════════════════════════════════════════════
interface Trait {
  name: string
  rarity: string
  h?: number
  s?: number
  b?: number
  r?: number
  g?: number
}

interface Traits {
  shellColor: Trait
  headShape: Trait
  eyes: Trait
  mouth: Trait
  claws: Trait
  body: Trait
  legs: Trait
  hat: Trait
  accessory: Trait
  bgColor: { name: string; r: number; g: number; b: number }
  eyeHue: number
  antennaStyle: number
  bodyDetail: number
  scarSide: number
}

interface OwnedNFT {
  tokenId: number
  seed: number
  rarityTier: string
  rarityScore: number
  traits: Traits
  mintedAt: string
}

function generateTraits(seed: number): Traits {
  const rng = new SeededRandom(seed)
  return {
    shellColor: rng.pick(SHELL_COLORS),
    headShape: rng.pick(HEAD_SHAPES),
    eyes: rng.pick(EYES),
    mouth: rng.pick(MOUTHS),
    claws: rng.pick(CLAWS),
    body: rng.pick(BODIES),
    legs: rng.pick(LEGS),
    hat: rng.pick(HATS),
    accessory: rng.pick(ACCESSORIES),
    bgColor: rng.pick(BG_COLORS),
    eyeHue: rng.nextInt(360),
    antennaStyle: rng.nextInt(4),
    bodyDetail: rng.nextInt(5),
    scarSide: rng.nextInt(2),
  }
}

function calculateRarityScore(traits: Traits): { score: number; overall: string } {
  const rarityMap: Record<string, number> = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 }
  const traitList = [
    traits.shellColor,
    traits.headShape,
    traits.eyes,
    traits.mouth,
    traits.claws,
    traits.body,
    traits.legs,
    traits.hat,
    traits.accessory,
  ]
  const score = traitList.reduce((s, t) => s + (rarityMap[t.rarity] || 0), 0)

  let overall = 'Common'
  if (score >= 32) overall = 'LEGENDARY'
  else if (score >= 25) overall = 'Epic'
  else if (score >= 18) overall = 'Rare'
  else if (score >= 14) overall = 'Uncommon'

  return { score, overall }
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
    if (activeTab !== 'generate' || minting) return

    const interval = setInterval(() => {
      setSeed(Math.floor(Math.random() * 999999) + 1)
    }, 2000)

    return () => clearInterval(interval)
  }, [activeTab, minting])

  // Draw lobster on canvas
  const drawLobster = useCallback((canvas: HTMLCanvasElement, currentSeed: number, scale: number = 8) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const t = generateTraits(currentSeed)
    setTraits(t)

    const sc = scale
    canvas.width = 64 * sc
    canvas.height = 64 * sc

    const px = (x: number, y: number, color: string) => {
      ctx.fillStyle = color
      ctx.fillRect(x * sc, y * sc, sc, sc)
    }

    const pxRect = (x: number, y: number, w: number, h: number, color: string) => {
      ctx.fillStyle = color
      ctx.fillRect(x * sc, y * sc, w * sc, h * sc)
    }

    const hsl = (h: number, s: number, l: number) => `hsl(${h}, ${s}%, ${l}%)`
    const rgb = (r: number, g: number, b: number, a: number = 1) => `rgba(${r}, ${g}, ${b}, ${a})`

    const shellH = t.shellColor.h || 0
    const shellS = t.shellColor.s || 80
    const shellB = t.shellColor.b || 90
    const sh = hsl(shellH, shellS, shellB * 0.5)
    const sd = hsl(shellH, shellS + 5, (shellB - 20) * 0.5)
    const ml = rgb(170, 170, 180)
    const md = rgb(120, 120, 130)
    const eyeC = hsl(t.eyeHue, 80, 50)
    const outC = rgb(20, 20, 30)

    // Background
    ctx.fillStyle = rgb(t.bgColor.r, t.bgColor.g, t.bgColor.b)
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    if (t.bgColor.r < 50) {
      for (let i = 0; i < 30; i++) {
        const sx = (i * 17 + shellH * 3) % 64
        const sy = (i * 23 + t.eyeHue * 2) % 64
        px(sx, sy, rgb(255, 255, 200, 0.7))
      }
    }

    // Body
    const bx = 22, by = 30
    pxRect(bx - 1, by - 1, 22, 22, outC)
    pxRect(bx, by, 20, 20, sh)
    pxRect(bx + 2, by + 2, 16, 16, sd)
    pxRect(bx + 4, by + 4, 12, 8, ml)
    pxRect(bx + 6, by + 6, 8, 4, md)
    pxRect(bx + 2, by + 14, 16, 2, sd)
    pxRect(bx + 2, by + 17, 16, 2, sd)

    // Claws
    const cy = by + 4
    pxRect(5, cy - 1, 14, 10, outC)
    pxRect(43, cy - 1, 16, 10, outC)
    pxRect(6, cy, 12, 6, sh)
    pxRect(4, cy - 2, 4, 4, sd)
    pxRect(4, cy + 4, 4, 4, sd)
    pxRect(44, cy, 12, 6, sh)
    pxRect(54, cy - 2, 4, 4, sd)
    pxRect(54, cy + 4, 4, 4, sd)

    // Head
    const hx = 20, hy = 6
    pxRect(hx - 1, hy - 1, 26, 24, outC)
    pxRect(hx, hy, 24, 20, sh)
    pxRect(hx + 2, hy - 2, 20, 2, sh)
    pxRect(hx + 4, hy - 4, 16, 2, sd)
    pxRect(hx, hy + 16, 24, 6, ml)
    pxRect(hx + 2, hy + 20, 20, 2, md)

    // Antenna
    pxRect(31, 0, 2, hy, ml)
    pxRect(30, 0, 4, 2, eyeC)

    // Eyes
    const ex1 = hx + 4, ex2 = hx + 14, ey = hy + 4
    pxRect(ex1, ey, 6, 6, rgb(17, 17, 17))
    pxRect(ex2, ey, 6, 6, rgb(17, 17, 17))
    pxRect(ex1 + 1, ey + 1, 4, 4, eyeC)
    pxRect(ex2 + 1, ey + 1, 4, 4, eyeC)
    pxRect(ex1 + 2, ey + 2, 2, 2, rgb(255, 255, 255))
    pxRect(ex2 + 2, ey + 2, 2, 2, rgb(255, 255, 255))

    // Mouth
    const mx = hx + 4, my = hy + 16
    pxRect(mx + 2, my + 2, 12, 2, rgb(17, 17, 17))
    px(mx + 4, my + 2, eyeC)
    px(mx + 12, my + 2, eyeC)

    // Hat
    const hatIdx = HATS.findIndex(h => h.name === t.hat.name)
    if (hatIdx === 3) {
      pxRect(hx - 2, hy - 4, 28, 6, rgb(255, 204, 0))
      pxRect(hx, hy - 8, 4, 6, rgb(255, 204, 0))
      pxRect(hx + 10, hy - 10, 4, 8, rgb(255, 204, 0))
      pxRect(hx + 20, hy - 8, 4, 6, rgb(255, 204, 0))
      px(hx + 1, hy - 7, rgb(255, 51, 85))
      px(hx + 11, hy - 9, rgb(85, 170, 255))
      px(hx + 21, hy - 7, rgb(68, 255, 68))
    } else if (hatIdx === 1) {
      pxRect(hx - 2, hy - 2, 28, 2, rgb(34, 34, 34))
      pxRect(hx + 4, hy - 10, 16, 10, rgb(51, 51, 51))
      pxRect(hx + 2, hy - 10, 20, 2, rgb(68, 68, 68))
      pxRect(hx + 6, hy - 6, 12, 1, eyeC)
    } else if (hatIdx === 9) {
      pxRect(hx - 4, hy - 4, 32, 6, rgb(255, 170, 0))
      pxRect(hx - 2, hy - 8, 4, 6, rgb(255, 187, 34))
      pxRect(hx + 6, hy - 10, 4, 8, rgb(255, 187, 34))
      pxRect(hx + 16, hy - 10, 4, 8, rgb(255, 187, 34))
      pxRect(hx + 24, hy - 8, 4, 6, rgb(255, 187, 34))
    }

    // Accessory
    const accIdx = ACCESSORIES.findIndex(a => a.name === t.accessory.name)
    if (accIdx === 2) {
      pxRect(hx + 2, hy + 4, 20, 8, rgb(17, 17, 17))
      pxRect(hx + 4, hy + 6, 6, 4, rgb(51, 51, 51))
      pxRect(hx + 14, ey + 2, 6, 4, rgb(51, 51, 51))
    } else if (accIdx === 5) {
      pxRect(hx - 2, ey, 28, 2, rgb(17, 17, 17))
      pxRect(hx + 2, ey, 8, 6, rgb(17, 17, 17))
      pxRect(hx + 14, ey, 8, 6, rgb(17, 17, 17))
    }

    // Legs / Rockets
    const legIdx = LEGS.findIndex(l => l.name === t.legs.name)
    const ly = by + 18
    const flameC = rgb(255, 100, 0)
    const flameC2 = rgb(255, 200, 0)

    if (legIdx === 0) {
      pxRect(bx + 2, ly, 4, 8, ml)
      pxRect(bx + 3, ly + 1, 2, 6, md)
      pxRect(bx + 1, ly + 8, 6, 4, flameC)
      pxRect(bx + 2, ly + 10, 4, 3, flameC2)
      pxRect(bx + 14, ly, 4, 8, ml)
      pxRect(bx + 15, ly + 1, 2, 6, md)
      pxRect(bx + 13, ly + 8, 6, 4, flameC)
      pxRect(bx + 14, ly + 10, 4, 3, flameC2)
    } else if (legIdx === 1) {
      pxRect(bx, ly, 3, 6, ml)
      pxRect(bx + 4, ly, 3, 6, ml)
      pxRect(bx - 1, ly + 6, 5, 3, flameC)
      pxRect(bx + 3, ly + 6, 5, 3, flameC)
      pxRect(bx + 13, ly, 3, 6, ml)
      pxRect(bx + 17, ly, 3, 6, ml)
      pxRect(bx + 12, ly + 6, 5, 3, flameC)
      pxRect(bx + 16, ly + 6, 5, 3, flameC)
    } else if (legIdx === 2) {
      pxRect(bx + 4, ly, 5, 5, ml)
      pxRect(bx + 11, ly, 5, 5, ml)
      pxRect(bx + 2, ly + 5, 9, 5, flameC)
      pxRect(bx + 9, ly + 5, 9, 5, flameC)
      pxRect(bx + 4, ly + 8, 5, 4, flameC2)
      pxRect(bx + 11, ly + 8, 5, 4, flameC2)
      pxRect(bx + 5, ly + 10, 3, 3, rgb(255, 255, 200))
      pxRect(bx + 12, ly + 10, 3, 3, rgb(255, 255, 200))
    } else if (legIdx === 3) {
      pxRect(bx + 2, ly, 6, 6, rgb(100, 200, 255))
      pxRect(bx + 12, ly, 6, 6, rgb(100, 200, 255))
      pxRect(bx + 3, ly + 1, 4, 4, rgb(150, 230, 255))
      pxRect(bx + 13, ly + 1, 4, 4, rgb(150, 230, 255))
      pxRect(bx + 1, ly + 6, 8, 4, rgb(50, 150, 255))
      pxRect(bx + 11, ly + 6, 8, 4, rgb(50, 150, 255))
      pxRect(bx + 3, ly + 8, 4, 4, rgb(200, 240, 255))
      pxRect(bx + 13, ly + 8, 4, 4, rgb(200, 240, 255))
    } else if (legIdx === 4) {
      pxRect(bx + 2, ly, 6, 7, rgb(100, 255, 100))
      pxRect(bx + 12, ly, 6, 7, rgb(100, 255, 100))
      pxRect(bx + 4, ly + 2, 2, 3, rgb(200, 255, 100))
      pxRect(bx + 14, ly + 2, 2, 3, rgb(200, 255, 100))
      pxRect(bx, ly + 7, 10, 5, rgb(50, 255, 50, 0.7))
      pxRect(bx + 10, ly + 7, 10, 5, rgb(50, 255, 50, 0.7))
      px(bx + 5, ly + 4, rgb(255, 255, 0))
      px(bx + 15, ly + 4, rgb(255, 255, 0))
    } else if (legIdx === 5) {
      pxRect(bx + 3, ly, 4, 8, rgb(80, 80, 120))
      pxRect(bx + 13, ly, 4, 8, rgb(80, 80, 120))
      pxRect(bx + 2, ly + 8, 6, 3, rgb(100, 150, 255))
      pxRect(bx + 12, ly + 8, 6, 3, rgb(100, 150, 255))
      pxRect(bx + 3, ly + 9, 4, 3, rgb(150, 200, 255))
      pxRect(bx + 13, ly + 9, 4, 3, rgb(150, 200, 255))
      px(bx + 4, ly + 10, rgb(255, 255, 255))
      px(bx + 14, ly + 10, rgb(255, 255, 255))
    } else if (legIdx === 6) {
      pxRect(bx + 2, ly, 5, 6, rgb(200, 100, 255))
      pxRect(bx + 13, ly, 5, 6, rgb(200, 100, 255))
      pxRect(bx, ly + 6, 9, 4, rgb(150, 50, 255))
      pxRect(bx + 11, ly + 6, 9, 4, rgb(150, 50, 255))
      px(bx + 1, ly + 8, rgb(255, 100, 255))
      px(bx + 7, ly + 7, rgb(100, 255, 255))
      px(bx + 12, ly + 8, rgb(255, 100, 255))
      px(bx + 18, ly + 7, rgb(100, 255, 255))
      pxRect(bx + 3, ly + 8, 3, 4, rgb(255, 200, 255))
      pxRect(bx + 14, ly + 8, 3, 4, rgb(255, 200, 255))
    } else if (legIdx === 7) {
      pxRect(bx + 2, ly + 2, 6, 6, rgb(150, 255, 255))
      pxRect(bx + 12, ly + 2, 6, 6, rgb(150, 255, 255))
      pxRect(bx + 3, ly + 3, 4, 4, rgb(200, 255, 255))
      pxRect(bx + 13, ly + 3, 4, 4, rgb(200, 255, 255))
      px(bx + 4, ly + 4, rgb(255, 255, 255))
      px(bx + 14, ly + 4, rgb(255, 255, 255))
      pxRect(bx, ly + 8, 10, 1, rgb(100, 200, 255, 0.5))
      pxRect(bx + 10, ly + 8, 10, 1, rgb(100, 200, 255, 0.5))
      pxRect(bx + 1, ly + 10, 8, 1, rgb(100, 200, 255, 0.3))
      pxRect(bx + 11, ly + 10, 8, 1, rgb(100, 200, 255, 0.3))
    } else if (legIdx === 8) {
      pxRect(bx + 1, ly, 8, 8, rgb(100, 50, 200))
      pxRect(bx + 11, ly, 8, 8, rgb(100, 50, 200))
      pxRect(bx + 2, ly + 1, 6, 6, rgb(150, 100, 255))
      pxRect(bx + 12, ly + 1, 6, 6, rgb(150, 100, 255))
      pxRect(bx + 3, ly + 2, 4, 4, rgb(200, 150, 255))
      pxRect(bx + 13, ly + 2, 4, 4, rgb(200, 150, 255))
      px(bx + 4, ly + 3, rgb(255, 255, 255))
      px(bx + 14, ly + 3, rgb(255, 255, 255))
      pxRect(bx, ly + 8, 10, 2, rgb(150, 100, 255, 0.6))
      pxRect(bx + 10, ly + 8, 10, 2, rgb(150, 100, 255, 0.6))
      pxRect(bx + 2, ly + 10, 6, 3, rgb(200, 150, 255, 0.4))
      pxRect(bx + 12, ly + 10, 6, 3, rgb(200, 150, 255, 0.4))
    } else {
      pxRect(bx + 1, ly, 7, 8, rgb(130, 80, 200))
      pxRect(bx + 12, ly, 7, 8, rgb(130, 80, 200))
      pxRect(bx + 2, ly + 1, 5, 6, rgb(160, 100, 230))
      pxRect(bx + 13, ly + 1, 5, 6, rgb(160, 100, 230))
      pxRect(bx - 1, ly + 8, 11, 5, rgb(180, 100, 255))
      pxRect(bx + 10, ly + 8, 11, 5, rgb(180, 100, 255))
      pxRect(bx + 1, ly + 10, 7, 4, rgb(200, 150, 255))
      pxRect(bx + 12, ly + 10, 7, 4, rgb(200, 150, 255))
      pxRect(bx + 3, ly + 12, 3, 2, rgb(255, 200, 255))
      pxRect(bx + 14, ly + 12, 3, 2, rgb(255, 200, 255))
      px(bx + 3, ly + 3, rgb(255, 255, 255))
      px(bx + 4, ly + 2, rgb(255, 255, 255))
      px(bx + 5, ly + 3, rgb(255, 255, 255))
      px(bx + 14, ly + 3, rgb(255, 255, 255))
      px(bx + 15, ly + 2, rgb(255, 255, 255))
      px(bx + 16, ly + 3, rgb(255, 255, 255))
    }

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
                  <NFTPreview seed={seed} />
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
                  Seed: <span className="font-mono text-purple-400">{seed}</span>
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

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const t = generateTraits(seed)
    const sc = 3
    canvas.width = 64 * sc
    canvas.height = 64 * sc

    const pxRect = (x: number, y: number, w: number, h: number, color: string) => {
      ctx.fillStyle = color
      ctx.fillRect(x * sc, y * sc, w * sc, h * sc)
    }

    const hsl = (h: number, s: number, l: number) => `hsl(${h}, ${s}%, ${l}%)`
    const rgb = (r: number, g: number, b: number) => `rgb(${r}, ${g}, ${b})`

    const shellH = t.shellColor.h || 0
    const shellS = t.shellColor.s || 80
    const shellB = t.shellColor.b || 90
    const sh = hsl(shellH, shellS, shellB * 0.5)
    const sd = hsl(shellH, shellS + 5, (shellB - 20) * 0.5)
    const ml = rgb(170, 170, 180)
    const eyeC = hsl(t.eyeHue, 80, 50)

    ctx.fillStyle = rgb(t.bgColor.r, t.bgColor.g, t.bgColor.b)
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const bx = 22, by = 30, hx = 20, hy = 6

    pxRect(bx, by, 20, 20, sh)
    pxRect(bx + 2, by + 2, 16, 16, sd)
    pxRect(6, by + 4, 12, 6, sh)
    pxRect(44, by + 4, 12, 6, sh)
    pxRect(hx, hy, 24, 20, sh)
    pxRect(hx, hy + 16, 24, 6, ml)
    pxRect(hx + 5, hy + 5, 4, 4, eyeC)
    pxRect(hx + 15, hy + 5, 4, 4, eyeC)
    pxRect(31, 0, 2, hy, ml)
    pxRect(30, 0, 4, 2, eyeC)

  }, [seed])

  return (
    <canvas
      ref={canvasRef}
      className="w-full block rounded-lg"
      style={{ imageRendering: 'pixelated' }}
    />
  )
}
