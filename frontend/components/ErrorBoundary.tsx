'use client'

import { Component, ReactNode } from 'react'
import { motion } from 'framer-motion'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <ErrorDisplay
          title="Something went wrong"
          message={this.state.error?.message || 'An unexpected error occurred'}
          onRetry={() => this.setState({ hasError: false })}
        />
      )
    }

    return this.props.children
  }
}

// Reusable error display component
interface ErrorDisplayProps {
  title?: string
  message?: string
  emoji?: string
  onRetry?: () => void
  showRetry?: boolean
}

export function ErrorDisplay({
  title = 'Oops!',
  message = 'Something went wrong',
  emoji = '🦞',
  onRetry,
  showRetry = true,
}: ErrorDisplayProps) {
  return (
    <motion.div
      className="bg-slate-800/50 rounded-xl p-6 md:p-8 text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <motion.div
        className="text-5xl md:text-6xl mb-4"
        animate={{ rotate: [0, -10, 10, -10, 0] }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {emoji}
      </motion.div>
      <h3 className="text-xl font-bold text-lobster-400 mb-2">{title}</h3>
      <p className="text-gray-400 mb-4 text-sm md:text-base">{message}</p>
      {showRetry && onRetry && (
        <motion.button
          onClick={onRetry}
          className="bg-lobster-600 hover:bg-lobster-500 px-6 py-2 rounded-lg font-medium transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Try Again
        </motion.button>
      )}
    </motion.div>
  )
}

// Network error display
interface NetworkErrorProps {
  onRetry?: () => void
}

export function NetworkError({ onRetry }: NetworkErrorProps) {
  return (
    <ErrorDisplay
      emoji="📡"
      title="Connection Lost"
      message="Unable to connect to the server. Please check your internet connection."
      onRetry={onRetry}
    />
  )
}

// Empty state display
interface EmptyStateProps {
  emoji?: string
  title: string
  message: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({
  emoji = '📭',
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <motion.div
      className="text-center py-8 md:py-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="text-5xl md:text-6xl mb-4"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {emoji}
      </motion.div>
      <h3 className="text-lg font-semibold text-gray-300 mb-2">{title}</h3>
      <p className="text-gray-500 text-sm mb-4">{message}</p>
      {actionLabel && onAction && (
        <motion.button
          onClick={onAction}
          className="bg-ocean-600 hover:bg-ocean-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {actionLabel}
        </motion.button>
      )}
    </motion.div>
  )
}

// Loading error with auto-retry
interface LoadingErrorProps {
  onRetry: () => void
  retryCount?: number
  maxRetries?: number
}

export function LoadingError({ onRetry, retryCount = 0, maxRetries = 3 }: LoadingErrorProps) {
  const canRetry = retryCount < maxRetries

  return (
    <motion.div
      className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="flex items-center justify-center gap-2 text-red-400 mb-2">
        <span>⚠️</span>
        <span className="font-medium">Failed to load</span>
      </div>
      {canRetry ? (
        <motion.button
          onClick={onRetry}
          className="text-sm text-red-300 hover:text-red-200 underline"
          whileHover={{ scale: 1.05 }}
        >
          Retry ({maxRetries - retryCount} attempts left)
        </motion.button>
      ) : (
        <p className="text-sm text-red-300">Please refresh the page</p>
      )}
    </motion.div>
  )
}

// Offline indicator
export function OfflineIndicator() {
  return (
    <motion.div
      className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-yellow-500/90 text-yellow-900 px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50 flex items-center gap-2"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
    >
      <span className="w-2 h-2 bg-yellow-900 rounded-full animate-pulse" />
      You're offline
    </motion.div>
  )
}
