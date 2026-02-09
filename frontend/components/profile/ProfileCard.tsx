'use client'

import { motion } from 'framer-motion'
import { ProfileAvatar } from './ProfileAvatar'
import type { Profile } from '../../hooks/useProfile'

interface ProfileCardProps {
  profile: Profile
  onEdit?: () => void
  compact?: boolean
}

export function ProfileCard({ profile, onEdit, compact = false }: ProfileCardProps) {
  const displayName = profile.name || profile.twitterDisplayName || shortenAddress(profile.walletAddress)
  const hasTwitter = Boolean(profile.twitterUsername)

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <ProfileAvatar
          avatarUrl={profile.avatarUrl}
          name={displayName}
          size="md"
          isAgent={profile.isAgent}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{displayName}</span>
            {hasTwitter && (
              <span className="text-xs text-blue-400">@{profile.twitterUsername}</span>
            )}
            {profile.isAgent && (
              <span className="text-xs bg-ocean-600/30 text-ocean-300 px-2 py-0.5 rounded-full">
                Agent
              </span>
            )}
          </div>
          <span className="text-xs text-gray-500">{shortenAddress(profile.walletAddress)}</span>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="bg-slate-800/50 rounded-xl p-6 backdrop-blur-sm border border-slate-700"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-start gap-4">
        <ProfileAvatar
          avatarUrl={profile.avatarUrl}
          name={displayName}
          size="xl"
          isAgent={profile.isAgent}
          onClick={onEdit}
        />

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-semibold">{displayName}</h3>
            {profile.isAgent && (
              <span className="text-xs bg-ocean-600/30 text-ocean-300 px-2 py-1 rounded-full">
                🤖 Agent
              </span>
            )}
          </div>

          <p className="text-gray-400 text-sm mb-3">
            {shortenAddress(profile.walletAddress)}
          </p>

          {hasTwitter && (
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              <a
                href={`https://x.com/${profile.twitterUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline text-sm"
              >
                @{profile.twitterUsername}
              </a>
            </div>
          )}

          {profile.gender && (
            <p className="text-sm text-gray-300 mb-2">
              <span className="text-gray-500">Gender:</span> {profile.gender}
            </p>
          )}

          {profile.hobbies && (
            <p className="text-sm text-gray-300 mb-2">
              <span className="text-gray-500">Hobbies:</span> {profile.hobbies}
            </p>
          )}

          {profile.wealth && (
            <div className="mt-3 bg-slate-700/50 rounded-lg px-3 py-2 inline-block">
              <span className="text-gray-400 text-sm">Balance: </span>
              <span className="text-lobster-400 font-medium">{formatWealth(profile.wealth)} MON</span>
            </div>
          )}

          {onEdit && (
            <motion.button
              onClick={onEdit}
              className="mt-4 text-sm text-lobster-400 hover:text-lobster-300 transition-colors"
              whileHover={{ scale: 1.02 }}
            >
              Edit Profile
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function formatWealth(wealth: string): string {
  const num = parseFloat(wealth)
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(2) + 'K'
  }
  return num.toFixed(4)
}
