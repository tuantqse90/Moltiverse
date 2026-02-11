'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ProfileAvatar } from './ProfileAvatar'
import { TwitterConnectButton } from './TwitterConnectButton'
import type { Profile, ProfileUpdateInput } from '../../hooks/useProfile'

interface ProfileEditModalProps {
  isOpen: boolean
  onClose: () => void
  profile: Profile | null
  onSave: (input: ProfileUpdateInput) => Promise<Profile | null>
  walletAddress: string | undefined
  onTwitterConnected?: () => void
  onSetNftAvatar?: () => void
}

const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say']

export function ProfileEditModal({
  isOpen,
  onClose,
  profile,
  onSave,
  walletAddress,
  onTwitterConnected,
  onSetNftAvatar,
}: ProfileEditModalProps) {
  const [name, setName] = useState('')
  const [gender, setGender] = useState('')
  const [hobbies, setHobbies] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (profile) {
      setName(profile.name || '')
      setGender(profile.gender || '')
      setHobbies(profile.hobbies || '')
    }
  }, [profile])

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      const result = await onSave({
        name: name.trim() || undefined,
        gender: gender || undefined,
        hobbies: hobbies.trim() || undefined,
      })

      if (result) {
        onClose()
      } else {
        setError('Failed to save profile')
      }
    } catch (err) {
      setError('An error occurred')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/70 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-slate-800 rounded-2xl w-full max-w-md overflow-hidden border border-slate-700"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-700">
                <h2 className="text-xl font-semibold">Edit Profile</h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Avatar */}
                <div className="flex flex-col items-center gap-2">
                  <ProfileAvatar
                    avatarUrl={profile?.avatarUrl || null}
                    name={name || profile?.name}
                    nftSeed={profile?.nftAvatarSeed}
                    size="xl"
                    isAgent={profile?.isAgent}
                  />
                  {onSetNftAvatar && (
                    <button
                      onClick={onSetNftAvatar}
                      className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      {profile?.avatarSource === 'nft' ? 'Change NFT Avatar' : 'Set NFT Avatar'}
                    </button>
                  )}
                </div>

                {/* Twitter Connect */}
                <div className="flex justify-center">
                  <TwitterConnectButton
                    walletAddress={walletAddress}
                    twitterUsername={profile?.twitterUsername || undefined}
                    onConnected={onTwitterConnected}
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Enter your name"
                    maxLength={100}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:border-lobster-500 transition-colors"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Gender</label>
                  <div className="flex flex-wrap gap-2">
                    {GENDER_OPTIONS.map(option => (
                      <button
                        key={option}
                        onClick={() => setGender(gender === option ? '' : option)}
                        className={`px-4 py-2 rounded-xl text-sm transition-colors ${
                          gender === option
                            ? 'bg-lobster-600 text-white'
                            : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hobbies */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Hobbies</label>
                  <textarea
                    value={hobbies}
                    onChange={e => setHobbies(e.target.value)}
                    placeholder="What do you enjoy doing?"
                    rows={3}
                    maxLength={500}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:border-lobster-500 transition-colors resize-none"
                  />
                </div>

                {/* Error */}
                {error && (
                  <p className="text-red-400 text-sm text-center">{error}</p>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <motion.button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 bg-lobster-600 hover:bg-lobster-500 disabled:bg-slate-600 text-white py-3 rounded-xl transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
