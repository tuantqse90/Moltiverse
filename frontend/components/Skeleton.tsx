'use client'

import { motion } from 'framer-motion'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
}

export function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
}: SkeletonProps) {
  const baseClasses = 'bg-slate-700/50 animate-pulse'

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  }

  const style = {
    width: width || '100%',
    height: height || (variant === 'text' ? '1em' : '100%'),
  }

  return (
    <motion.div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity }}
    />
  )
}

// Card skeleton for loading states
export function CardSkeleton() {
  return (
    <div className="bg-slate-800/50 rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="60%" height={16} />
          <Skeleton variant="text" width="40%" height={12} />
        </div>
      </div>
      <Skeleton variant="rectangular" height={100} />
      <div className="flex gap-2">
        <Skeleton variant="rectangular" width={80} height={32} />
        <Skeleton variant="rectangular" width={80} height={32} />
      </div>
    </div>
  )
}

// List skeleton
export function ListSkeleton({ items = 3 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg">
          <Skeleton variant="circular" width={32} height={32} />
          <div className="flex-1 space-y-1">
            <Skeleton variant="text" width="50%" height={14} />
            <Skeleton variant="text" width="30%" height={10} />
          </div>
        </div>
      ))}
    </div>
  )
}

// Timer skeleton
export function TimerSkeleton() {
  return (
    <div className="text-center space-y-4">
      <Skeleton variant="rectangular" width={200} height={80} className="mx-auto rounded-xl" />
      <Skeleton variant="rectangular" width={150} height={40} className="mx-auto" />
      <Skeleton variant="rectangular" width={180} height={24} className="mx-auto" />
    </div>
  )
}

// Button skeleton
export function ButtonSkeleton() {
  return <Skeleton variant="rectangular" height={48} className="rounded-xl" />
}
