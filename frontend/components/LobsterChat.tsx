'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Socket } from 'socket.io-client'
import { ProfileAvatar } from './profile/ProfileAvatar'
import { useSound } from '@/hooks/useSound'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

interface ChatReaction {
  emoji: string
  users: string[]
}

interface ChatMessage {
  id: string
  sender: string
  senderName?: string
  message: string
  timestamp: number
  isAgent: boolean
  reactions?: Record<string, string[]> // emoji -> array of user addresses
  replyTo?: {
    id: string
    sender: string
    senderName?: string
    message: string
  }
}

interface SenderProfile {
  avatarUrl: string | null
  name: string | null
  isAgent: boolean
  nftAvatarSeed?: number | null
}

interface LobsterChatProps {
  socket: Socket | null
  currentAddress?: string
  userAgentAddress?: string // User's agent wallet address
}

const REACTION_EMOJIS = ['🦞', '❤️', '😂', '🔥', '👀', '🎉']

export function LobsterChat({ socket, currentAddress, userAgentAddress }: LobsterChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isExpanded, setIsExpanded] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [senderProfiles, setSenderProfiles] = useState<Record<string, SenderProfile>>({})
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null)
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null)
  const [mounted, setMounted] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const { play: playSound } = useSound()
  const lastMessageCountRef = useRef(0)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch chat history from API on mount (fallback if socket is slow)
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/chat/history?limit=50`)
        const data = await response.json()
        if (data.success && data.data && data.data.length > 0) {
          // Only set if we don't have messages yet (socket hasn't delivered)
          setMessages((prev) => prev.length === 0 ? data.data : prev)
          console.log(`Loaded ${data.data.length} messages from API`)
        }
      } catch (error) {
        console.error('Error fetching chat history:', error)
      }
    }

    fetchHistory()
  }, [])

  const scrollToBottom = () => {
    if (shouldAutoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // Check if user is near bottom of chat
  const handleScroll = () => {
    const container = messagesContainerRef.current
    if (!container) return

    const { scrollTop, scrollHeight, clientHeight } = container
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
    setShouldAutoScroll(isNearBottom)
  }

  useEffect(() => {
    if (!socket) return

    const handleConnect = () => {
      setIsConnected(true)
      console.log('Chat socket connected')
      // Request history after connection
      socket.emit('chat:requestHistory')
    }

    const handleDisconnect = () => {
      setIsConnected(false)
      console.log('Chat socket disconnected')
    }

    const handleHistory = (history: ChatMessage[]) => {
      console.log('Received chat history:', history.length, 'messages')
      setMessages(history)
    }

    const handleMessage = (message: ChatMessage) => {
      console.log('Received chat message:', message)
      setMessages((prev) => [...prev, message])
      // Play chat sound only for messages from others
      if (message.sender.toLowerCase() !== currentAddress?.toLowerCase()) {
        playSound('chat')
      }
    }

    const handleReaction = (data: { messageId: string; emoji: string; user: string; action: 'add' | 'remove' }) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== data.messageId) return msg

          const reactions = { ...(msg.reactions || {}) }
          const users = reactions[data.emoji] || []

          if (data.action === 'add') {
            if (!users.includes(data.user)) {
              reactions[data.emoji] = [...users, data.user]
            }
          } else {
            reactions[data.emoji] = users.filter((u) => u !== data.user)
            if (reactions[data.emoji].length === 0) {
              delete reactions[data.emoji]
            }
          }

          return { ...msg, reactions }
        })
      )
    }

    // Check if already connected
    if (socket.connected) {
      setIsConnected(true)
      // Request history if already connected
      socket.emit('chat:requestHistory')
      console.log('Socket already connected, requesting history')
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('chat:history', handleHistory)
    socket.on('chat:message', handleMessage)
    socket.on('chat:reaction', handleReaction)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('chat:history', handleHistory)
      socket.off('chat:message', handleMessage)
      socket.off('chat:reaction', handleReaction)
    }
  }, [socket, currentAddress, playSound])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Fetch a single sender profile from API
  const fetchSingleProfile = async (sender: string): Promise<SenderProfile | null> => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/profiles/${sender}`)
      const data = await response.json()
      if (data.success && data.data) {
        return {
          avatarUrl: data.data.avatarUrl,
          name: data.data.name,
          isAgent: data.data.isAgent,
          nftAvatarSeed: data.data.nftAvatarSeed || null,
        }
      }
    } catch { /* ignore */ }
    return null
  }

  // Fetch sender profiles for new messages
  useEffect(() => {
    const fetchSenderProfiles = async () => {
      const uniqueSenders = Array.from(new Set(messages.map(m => m.sender.toLowerCase())))
      const newProfiles: Record<string, SenderProfile> = { ...senderProfiles }

      await Promise.all(
        uniqueSenders
          .filter(sender => !senderProfiles[sender])
          .map(async (sender) => {
            const profile = await fetchSingleProfile(sender)
            if (profile) {
              newProfiles[sender] = profile
            } else {
              newProfiles[sender] = {
                avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${sender}&size=64`,
                name: null,
                isAgent: false,
              }
            }
          })
      )

      if (Object.keys(newProfiles).length > Object.keys(senderProfiles).length) {
        setSenderProfiles(newProfiles)
      }
    }

    if (messages.length > 0) {
      fetchSenderProfiles()
    }
  }, [messages])

  // Periodically refresh current user's profile to pick up avatar changes
  useEffect(() => {
    if (!currentAddress) return

    const refreshOwnProfile = async () => {
      const addr = currentAddress.toLowerCase()
      const profile = await fetchSingleProfile(addr)
      if (profile) {
        setSenderProfiles(prev => {
          const existing = prev[addr]
          // Only update if something actually changed
          if (existing &&
              existing.avatarUrl === profile.avatarUrl &&
              existing.nftAvatarSeed === profile.nftAvatarSeed &&
              existing.name === profile.name) {
            return prev
          }
          return { ...prev, [addr]: profile }
        })
      }
    }

    // Refresh immediately on mount, then every 15s
    refreshOwnProfile()
    const interval = setInterval(refreshOwnProfile, 15000)
    return () => clearInterval(interval)
  }, [currentAddress])

  const sendMessage = () => {
    if (!socket || !inputMessage.trim() || !currentAddress) return

    const messageData: any = {
      sender: currentAddress,
      message: inputMessage.trim(),
      isAgent: false,
    }

    // Include reply data if replying
    if (replyingTo) {
      messageData.replyTo = {
        id: replyingTo.id,
        sender: replyingTo.sender,
        senderName: replyingTo.senderName,
        message: replyingTo.message.slice(0, 100), // Limit reply preview length
      }
    }

    socket.emit('chat:send', messageData)

    setInputMessage('')
    setReplyingTo(null)
    // Always scroll to bottom when user sends message
    setShouldAutoScroll(true)
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const startReply = (msg: ChatMessage) => {
    setReplyingTo(msg)
    inputRef.current?.focus()
  }

  const cancelReply = () => {
    setReplyingTo(null)
  }

  const toggleReaction = (messageId: string, emoji: string) => {
    if (!socket || !currentAddress) return

    const message = messages.find((m) => m.id === messageId)
    const hasReacted = message?.reactions?.[emoji]?.includes(currentAddress.toLowerCase())

    socket.emit('chat:react', {
      messageId,
      emoji,
      user: currentAddress,
      action: hasReacted ? 'remove' : 'add',
    })

    setShowReactionPicker(null)
    playSound('click')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <motion.div
      className="bg-slate-800/50 rounded-xl backdrop-blur-sm border border-slate-700 overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 md:p-4 border-b border-slate-700 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg md:text-xl">💬</span>
          <h3 className="font-semibold text-sm md:text-base">Lobster Chat</h3>
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
          <span className="text-xs bg-slate-700 px-2 py-0.5 md:py-1 rounded-full text-gray-400 hidden sm:inline">
            {messages.length} messages
          </span>
        </div>
        <motion.span
          animate={{ rotate: isExpanded ? 180 : 0 }}
          className="text-gray-400 text-sm"
        >
          ▼
        </motion.span>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            {/* Messages */}
            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="h-48 md:h-64 overflow-y-auto p-3 md:p-4 space-y-2 md:space-y-3"
            >
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <span className="text-4xl mb-2 block">🦞</span>
                  <p>{isConnected ? 'No messages yet. Start chatting!' : 'Connecting to chat...'}</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const profile = senderProfiles[msg.sender.toLowerCase()]
                  const isOwnMessage = mounted && msg.sender.toLowerCase() === currentAddress?.toLowerCase()
                  const isUserAgent = mounted && userAgentAddress && msg.sender.toLowerCase() === userAgentAddress.toLowerCase()

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, x: msg.isAgent ? -20 : 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex gap-2 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        <ProfileAvatar
                          avatarUrl={profile?.avatarUrl || null}
                          name={profile?.name || msg.senderName}
                          nftSeed={profile?.nftAvatarSeed}
                          size="sm"
                          isAgent={msg.isAgent || profile?.isAgent}
                          showBorder={false}
                        />
                      </div>

                      {/* Message bubble */}
                      <div className="flex flex-col">
                        <div
                          className={`relative group max-w-[75%] rounded-xl px-4 py-2 ${
                            isOwnMessage
                              ? 'bg-lobster-600 text-white'
                              : msg.isAgent
                              ? 'bg-gradient-to-r from-ocean-600/50 to-ocean-700/50 border border-ocean-500'
                              : 'bg-slate-700'
                          }`}
                        >
                          {/* Reply preview */}
                          {msg.replyTo && (
                            <div className={`mb-2 pl-2 border-l-2 ${isOwnMessage ? 'border-white/30' : 'border-ocean-500/50'}`}>
                              <div className="text-xs text-gray-400">
                                ↩️ {msg.replyTo.senderName || shortenAddress(msg.replyTo.sender)}
                              </div>
                              <div className="text-xs text-gray-500 truncate max-w-[200px]">
                                {msg.replyTo.message}
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 mb-1">
                            {msg.isAgent && <span className="text-xs flex-shrink-0">🤖</span>}
                            <span className={`text-xs font-medium truncate max-w-[100px] ${msg.isAgent ? 'text-ocean-300' : 'text-gray-300'}`}>
                              {profile?.name || msg.senderName || shortenAddress(msg.sender)}
                            </span>
                            {isUserAgent && (
                              <span className="text-[9px] px-1 py-0.5 bg-lobster-500/30 text-lobster-300 rounded flex-shrink-0">
                                You
                              </span>
                            )}
                            <span className="text-[10px] text-gray-500 flex-shrink-0">
                              {formatTime(msg.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm break-words">{msg.message}</p>

                          {/* Action buttons (shows on hover) */}
                          {mounted && currentAddress && (
                            <div className={`absolute -bottom-2 ${isOwnMessage ? 'left-0' : 'right-0'} opacity-0 group-hover:opacity-100 transition-opacity flex gap-1`}>
                              <motion.button
                                onClick={() => startReply(msg)}
                                className="bg-slate-600 hover:bg-slate-500 rounded-full w-6 h-6 flex items-center justify-center text-xs"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                title="Reply"
                              >
                                ↩️
                              </motion.button>
                              <motion.button
                                onClick={() => setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id)}
                                className="bg-slate-600 hover:bg-slate-500 rounded-full w-6 h-6 flex items-center justify-center text-xs"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                title="React"
                              >
                                😊
                              </motion.button>
                            </div>
                          )}

                          {/* Reaction picker */}
                          <AnimatePresence>
                            {showReactionPicker === msg.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                                className={`absolute -bottom-10 ${isOwnMessage ? 'left-0' : 'right-0'} bg-slate-700 rounded-full px-2 py-1 flex gap-1 shadow-lg border border-slate-600 z-10`}
                              >
                                {REACTION_EMOJIS.map((emoji) => (
                                  <motion.button
                                    key={emoji}
                                    onClick={() => toggleReaction(msg.id, emoji)}
                                    className="hover:bg-slate-600 rounded-full w-7 h-7 flex items-center justify-center"
                                    whileHover={{ scale: 1.2 }}
                                    whileTap={{ scale: 0.9 }}
                                  >
                                    {emoji}
                                  </motion.button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Display reactions */}
                        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                          <div className={`flex gap-1 mt-1 flex-wrap ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                            {Object.entries(msg.reactions).map(([emoji, users]) => {
                              const hasReacted = mounted && users.includes(currentAddress?.toLowerCase() || '')
                              return (
                                <motion.button
                                  key={emoji}
                                  onClick={() => currentAddress && toggleReaction(msg.id, emoji)}
                                  className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                                    hasReacted
                                      ? 'bg-lobster-600/50 border border-lobster-500'
                                      : 'bg-slate-700/50 border border-slate-600'
                                  }`}
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <span>{emoji}</span>
                                  <span className="text-gray-400">{users.length}</span>
                                </motion.button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-slate-700">
              {/* Reply preview bar */}
              <AnimatePresence>
                {replyingTo && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-4 pt-3 pb-0"
                  >
                    <div className="flex items-center justify-between bg-slate-700/50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-ocean-400">↩️</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-ocean-400 font-medium">
                            Replying to {senderProfiles[replyingTo.sender.toLowerCase()]?.name || replyingTo.senderName || shortenAddress(replyingTo.sender)}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {replyingTo.message}
                          </div>
                        </div>
                      </div>
                      <motion.button
                        onClick={cancelReply}
                        className="text-gray-400 hover:text-white p-1"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        ✕
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="p-4">
                {mounted && currentAddress ? (
                  <div className="flex gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={replyingTo ? "Write your reply..." : "Say something to fellow lobsters..."}
                      className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-lobster-500"
                      maxLength={200}
                    />
                    <motion.button
                      onClick={sendMessage}
                      disabled={!inputMessage.trim()}
                      className="bg-lobster-600 hover:bg-lobster-500 disabled:bg-slate-700 disabled:cursor-not-allowed px-4 py-2 rounded-xl transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      🦞
                    </motion.button>
                  </div>
                ) : (
                  <p className="text-center text-gray-500 text-sm">
                    Connect wallet to chat
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
