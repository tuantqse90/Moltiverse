'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { drawFullLobster } from '@/lib/drawLobster'

interface ProfileAvatarProps {
  avatarUrl: string | null
  name?: string | null
  address?: string | null
  nftSeed?: number | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showBorder?: boolean
  isAgent?: boolean
  onClick?: () => void
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
}

// Generate DiceBear avatar URL from seed
function getDiceBearUrl(seed: string, isAgent: boolean = false): string {
  // Use different styles for agents vs humans
  const style = isAgent ? 'bottts' : 'notionists-neutral'
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`
}

export function ProfileAvatar({
  avatarUrl,
  name,
  address,
  nftSeed,
  size = 'md',
  showBorder = true,
  isAgent = false,
  onClick,
}: ProfileAvatarProps) {
  const [imageError, setImageError] = useState(false)
  const [nftDataUrl, setNftDataUrl] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Render NFT on hidden canvas when nftSeed is provided
  useEffect(() => {
    if (nftSeed == null) {
      setNftDataUrl(null)
      return
    }

    // Create an offscreen canvas
    const canvas = document.createElement('canvas')
    canvasRef.current = canvas
    drawFullLobster(canvas, nftSeed, 3)
    setNftDataUrl(canvas.toDataURL('image/png'))
  }, [nftSeed])

  // Generate avatar URL from name or address if not provided
  const generatedAvatarUrl = useMemo(() => {
    if (nftDataUrl) return nftDataUrl
    if (avatarUrl && !imageError) return avatarUrl
    const seed = name || address || 'anonymous'
    return getDiceBearUrl(seed, isAgent)
  }, [avatarUrl, name, address, isAgent, imageError, nftDataUrl])

  const borderClass = showBorder
    ? isAgent
      ? 'ring-2 ring-cyan-400'
      : 'ring-2 ring-pink-500/50'
    : ''

  return (
    <motion.div
      className={`${sizeClasses[size]} rounded-full overflow-hidden ${borderClass} bg-slate-700 flex items-center justify-center ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
      whileHover={onClick ? { scale: 1.05 } : undefined}
      whileTap={onClick ? { scale: 0.95 } : undefined}
    >
      <img
        src={generatedAvatarUrl}
        alt={name || 'Avatar'}
        className="w-full h-full object-cover"
        style={nftDataUrl ? { imageRendering: 'pixelated' } : undefined}
        onError={() => setImageError(true)}
      />
      {isAgent && (
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-cyan-500 rounded-full flex items-center justify-center text-[10px]">
          🤖
        </div>
      )}
    </motion.div>
  )
}
