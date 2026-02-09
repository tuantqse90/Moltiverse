'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Sound types
export type SoundType =
  | 'win'
  | 'join'
  | 'chat'
  | 'countdown'
  | 'spin'
  | 'spinWin'
  | 'click'
  | 'notification'
  | 'error'

// Audio context singleton
let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return audioContext
}

// Sound configurations
const SOUNDS: Record<SoundType, { frequencies: number[]; durations: number[]; type: OscillatorType; gain: number }> = {
  win: {
    frequencies: [523, 659, 784, 1047], // C5, E5, G5, C6 - triumphant chord
    durations: [0.15, 0.15, 0.15, 0.4],
    type: 'sine',
    gain: 0.3,
  },
  join: {
    frequencies: [440, 554], // A4, C#5 - quick positive
    durations: [0.1, 0.15],
    type: 'sine',
    gain: 0.2,
  },
  chat: {
    frequencies: [800, 1000], // Quick blip
    durations: [0.05, 0.05],
    type: 'sine',
    gain: 0.15,
  },
  countdown: {
    frequencies: [440], // A4 - tick
    durations: [0.1],
    type: 'square',
    gain: 0.15,
  },
  spin: {
    frequencies: [300, 350, 400, 450, 500], // Rising tension
    durations: [0.08, 0.08, 0.08, 0.08, 0.08],
    type: 'sawtooth',
    gain: 0.2,
  },
  spinWin: {
    frequencies: [523, 659, 784, 880, 1047, 1319], // Big win fanfare
    durations: [0.1, 0.1, 0.1, 0.1, 0.2, 0.4],
    type: 'sine',
    gain: 0.35,
  },
  click: {
    frequencies: [600],
    durations: [0.05],
    type: 'sine',
    gain: 0.1,
  },
  notification: {
    frequencies: [880, 1100], // High pitched notification
    durations: [0.1, 0.15],
    type: 'sine',
    gain: 0.2,
  },
  error: {
    frequencies: [200, 150], // Low buzz
    durations: [0.15, 0.2],
    type: 'sawtooth',
    gain: 0.2,
  },
}

// Play a sequence of tones
function playToneSequence(
  ctx: AudioContext,
  frequencies: number[],
  durations: number[],
  type: OscillatorType,
  gain: number
) {
  let startTime = ctx.currentTime

  frequencies.forEach((freq, i) => {
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.type = type
    oscillator.frequency.setValueAtTime(freq, startTime)

    // Envelope
    gainNode.gain.setValueAtTime(0, startTime)
    gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.01)
    gainNode.gain.linearRampToValueAtTime(0, startTime + durations[i])

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.start(startTime)
    oscillator.stop(startTime + durations[i] + 0.01)

    startTime += durations[i]
  })
}

// Hook for sound management
export function useSound() {
  const [isMuted, setIsMuted] = useState(false)
  const [isReady, setIsReady] = useState(false)

  // Initialize on first user interaction
  useEffect(() => {
    const initAudio = () => {
      try {
        const ctx = getAudioContext()
        if (ctx.state === 'suspended') {
          ctx.resume()
        }
        setIsReady(true)
      } catch (e) {
        console.warn('Audio not supported')
      }
    }

    // Try to init on any user interaction
    const events = ['click', 'touchstart', 'keydown']
    events.forEach(event => document.addEventListener(event, initAudio, { once: true }))

    // Load mute preference
    const savedMute = localStorage.getItem('lobsterpot-sound-muted')
    if (savedMute === 'true') {
      setIsMuted(true)
    }

    return () => {
      events.forEach(event => document.removeEventListener(event, initAudio))
    }
  }, [])

  const play = useCallback((soundType: SoundType) => {
    if (isMuted || !isReady) return

    try {
      const ctx = getAudioContext()
      if (ctx.state === 'suspended') {
        ctx.resume()
      }

      const sound = SOUNDS[soundType]
      if (sound) {
        playToneSequence(ctx, sound.frequencies, sound.durations, sound.type, sound.gain)
      }
    } catch (e) {
      console.warn('Failed to play sound:', e)
    }
  }, [isMuted, isReady])

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newValue = !prev
      localStorage.setItem('lobsterpot-sound-muted', String(newValue))
      return newValue
    })
  }, [])

  return {
    play,
    isMuted,
    toggleMute,
    isReady,
  }
}

// Global sound player (for use outside React)
export function playSound(soundType: SoundType) {
  const muted = localStorage.getItem('lobsterpot-sound-muted') === 'true'
  if (muted) return

  try {
    const ctx = getAudioContext()
    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    const sound = SOUNDS[soundType]
    if (sound) {
      playToneSequence(ctx, sound.frequencies, sound.durations, sound.type, sound.gain)
    }
  } catch (e) {
    console.warn('Failed to play sound:', e)
  }
}
