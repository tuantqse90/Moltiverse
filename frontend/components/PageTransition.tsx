'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface PageTransitionProps {
  children: ReactNode
  className?: string
}

const pageVariants = {
  initial: {
    opacity: 0,
    y: 10,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.2,
    },
  },
}

export function PageTransition({ children, className = '' }: PageTransitionProps) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Staggered children animation wrapper
interface StaggerContainerProps {
  children: ReactNode
  className?: string
  delay?: number
}

export function StaggerContainer({ children, className = '', delay = 0.1 }: StaggerContainerProps) {
  return (
    <motion.div
      className={className}
      initial="initial"
      animate="animate"
      variants={{
        animate: {
          transition: {
            staggerChildren: delay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  )
}

// Stagger child item
interface StaggerItemProps {
  children: ReactNode
  className?: string
}

export function StaggerItem({ children, className = '' }: StaggerItemProps) {
  return (
    <motion.div
      className={className}
      variants={{
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
      }}
    >
      {children}
    </motion.div>
  )
}

// Fade in component
interface FadeInProps {
  children: ReactNode
  className?: string
  delay?: number
  direction?: 'up' | 'down' | 'left' | 'right' | 'none'
}

export function FadeIn({ children, className = '', delay = 0, direction = 'up' }: FadeInProps) {
  const directionMap = {
    up: { y: 20 },
    down: { y: -20 },
    left: { x: 20 },
    right: { x: -20 },
    none: {},
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...directionMap[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

// Scale in component
interface ScaleInProps {
  children: ReactNode
  className?: string
  delay?: number
}

export function ScaleIn({ children, className = '', delay = 0 }: ScaleInProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3, type: 'spring', stiffness: 200 }}
    >
      {children}
    </motion.div>
  )
}
