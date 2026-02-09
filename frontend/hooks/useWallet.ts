'use client'

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react'

// ─── Monad chain configuration ───────────────────────────────────
const MONAD_CHAIN_ID = '0x8f' // 143 in hex

const MONAD_CHAIN_PARAMS = {
  chainId: MONAD_CHAIN_ID,
  chainName: 'Monad',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: ['https://monad-mainnet.drpc.org', 'https://rpc.monad.xyz'],
  blockExplorerUrls: ['https://explorer.monad.xyz'],
}

// ─── Suppress MetaMask internal errors globally ──────────────────
// MetaMask's inpage.js throws unhandled promise rejections when the
// extension's service worker is dead/disabled. These errors happen
// OUTSIDE our code and cannot be caught with try/catch. We must
// intercept them at the window level to prevent them from crashing
// error boundaries or flooding the console.
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const msg = String(event.reason?.message || event.reason || '')
    if (
      msg.includes('MetaMask') ||
      msg.includes('extension not found') ||
      msg.includes('inpage.js') ||
      msg.includes('Failed to connect') ||
      msg.includes('Provider not available')
    ) {
      // Swallow the error — our health check will handle it gracefully
      event.preventDefault()
      console.warn('[LobsterPot] Suppressed broken wallet error:', msg)
    }
  })
}

// ─── EIP-6963 types ──────────────────────────────────────────────
interface EIP6963ProviderDetail {
  info: { uuid: string; name: string; icon: string; rdns: string }
  provider: any
}

// ─── Provider discovery ──────────────────────────────────────────
const _discoveredProviders: EIP6963ProviderDetail[] = []
let _selectedProvider: any = null
const _deadProviders = new WeakSet()

// Listen for EIP-6963 announcements (passive — doesn't trigger errors)
if (typeof window !== 'undefined') {
  window.addEventListener('eip6963:announceProvider', ((event: CustomEvent<EIP6963ProviderDetail>) => {
    try {
      const { info, provider } = event.detail
      if (info && provider && !_discoveredProviders.some((p) => p.info.uuid === info.uuid)) {
        _discoveredProviders.push({ info, provider })
      }
    } catch {
      // Ignore malformed announcements
    }
  }) as EventListener)

  // DON'T dispatch eip6963:requestProvider at module load time.
  // It can trigger broken MetaMask to respond and throw.
  // We'll request it lazily when the user actually clicks Connect.
}

/**
 * Call a provider method with a timeout.
 * Broken wallets can hang forever — this prevents that.
 */
function callWithTimeout<T>(promise: Promise<T>, ms = 3000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Wallet request timed out')), ms)
    ),
  ])
}

/**
 * Test if a provider is actually alive by making a simple call.
 * MetaMask can inject window.ethereum even when the extension is
 * broken/disabled — this catches that case.
 */
async function isProviderAlive(provider: any): Promise<boolean> {
  if (!provider) return false
  if (_deadProviders.has(provider)) return false
  try {
    await callWithTimeout(provider.request({ method: 'eth_chainId' }), 2000)
    return true
  } catch {
    _deadProviders.add(provider)
    return false
  }
}

/**
 * Request EIP-6963 providers (only call when user interacts)
 */
function requestEIP6963Providers() {
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new Event('eip6963:requestProvider'))
    } catch {
      // Ignore
    }
  }
}

/**
 * Collect all candidate providers from all sources
 */
function getAllCandidates(): any[] {
  const candidates: any[] = []
  const seen = new WeakSet()

  // EIP-6963 providers first
  for (const p of _discoveredProviders) {
    if (!seen.has(p.provider) && !_deadProviders.has(p.provider)) {
      candidates.push(p.provider)
      seen.add(p.provider)
    }
  }

  // window.ethereum fallback
  const ethereum = (window as any).ethereum
  if (ethereum) {
    if (ethereum.providers?.length) {
      for (const p of ethereum.providers) {
        if (!seen.has(p) && !_deadProviders.has(p)) {
          candidates.push(p)
          seen.add(p)
        }
      }
    } else if (!seen.has(ethereum) && !_deadProviders.has(ethereum)) {
      candidates.push(ethereum)
    }
  }

  return candidates
}

/**
 * Async provider getter — verifies the provider is alive before returning.
 * Tries ALL available providers, skipping broken ones.
 * Returns null if no working provider found.
 */
async function getVerifiedProvider(): Promise<any | null> {
  if (typeof window === 'undefined') return null

  // Fast path: reuse selected provider
  if (_selectedProvider && !_deadProviders.has(_selectedProvider)) {
    if (await isProviderAlive(_selectedProvider)) return _selectedProvider
    _selectedProvider = null
  }

  // Request any EIP-6963 providers that haven't announced yet
  requestEIP6963Providers()
  // Give them a moment to respond
  await new Promise((r) => setTimeout(r, 100))

  // Try every candidate
  const candidates = getAllCandidates()
  for (const provider of candidates) {
    if (await isProviderAlive(provider)) return provider
  }

  return null
}

// ─── Chain switching ─────────────────────────────────────────────
async function ensureMonadChain(provider: any): Promise<boolean> {
  try {
    const currentChainId: string = await callWithTimeout(
      provider.request({ method: 'eth_chainId' })
    )
    if (currentChainId.toLowerCase() === MONAD_CHAIN_ID.toLowerCase()) return true

    await callWithTimeout(
      provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: MONAD_CHAIN_ID }],
      }),
      15000 // user may need time to approve
    )
    return true
  } catch (err: any) {
    if (err.code === 4902 || err?.data?.originalError?.code === 4902) {
      try {
        await callWithTimeout(
          provider.request({
            method: 'wallet_addEthereumChain',
            params: [MONAD_CHAIN_PARAMS],
          }),
          15000
        )
        return true
      } catch {
        return false
      }
    }
    if (err.code === 4001) return false
    return true
  }
}

// ─── Global wallet state ─────────────────────────────────────────
let _address: string | undefined = undefined
const _listeners = new Set<() => void>()

function setGlobalAddress(addr: string | undefined) {
  _address = addr
  _listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  _listeners.add(listener)
  return () => { _listeners.delete(listener) }
}
function getSnapshot() { return _address }
function getServerSnapshot() { return undefined }

// ─── Auto-detect existing connection ─────────────────────────────
let _initialized = false

async function initProvider() {
  if (_initialized) return
  _initialized = true

  const provider = await getVerifiedProvider()
  if (!provider) {
    _initialized = false
    return
  }

  try {
    const accounts: string[] = await callWithTimeout(
      provider.request({ method: 'eth_accounts' })
    )
    if (accounts?.[0]) setGlobalAddress(accounts[0])
  } catch {
    _deadProviders.add(provider)
    _initialized = false
    return
  }

  if (typeof provider.on === 'function') {
    try {
      provider.on('accountsChanged', (accs: string[]) =>
        setGlobalAddress(accs[0] || undefined)
      )
      provider.on('chainChanged', () => {
        provider
          .request({ method: 'eth_accounts' })
          .then((accounts: string[]) => setGlobalAddress(accounts?.[0] || undefined))
          .catch(() => {})
      })
      provider.on('disconnect', () => setGlobalAddress(undefined))
    } catch {
      // Some broken providers throw on .on() — ignore
    }
  }
}

// Don't init at module load — wait for React to mount
// This avoids triggering MetaMask errors during SSR/hydration

// ─── React hook ──────────────────────────────────────────────────
export function useWallet() {
  const address = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [isConnecting, setIsConnecting] = useState(false)
  const isConnected = !!address

  // Init after React mount — safe from SSR issues
  useEffect(() => {
    const timer = setTimeout(initProvider, 500)
    return () => clearTimeout(timer)
  }, [])

  const connect = useCallback(async () => {
    setIsConnecting(true)
    try {
      const provider = await getVerifiedProvider()

      if (!provider) {
        const install = window.confirm(
          '⚠️ No active crypto wallet found.\n\n' +
            '🔧 If you have MetaMask installed:\n' +
            '• MetaMask only works in one browser profile. Close other profiles if you have multiple open.\n' +
            '• Go to chrome://extensions → Disable MetaMask → Enable again\n' +
            '• Or restart the browser completely\n\n' +
            '💡 Recommended: Use Rabby Wallet - more stable than MetaMask!\n\n' +
            'Click OK to install Rabby Wallet.'
        )
        if (install) window.open('https://rabby.io/', '_blank')
        return
      }

      _selectedProvider = provider

      const accounts: string[] = await callWithTimeout(
        provider.request({ method: 'eth_requestAccounts' }),
        30000 // user needs time to unlock wallet
      )

      if (!accounts?.[0]) {
        throw new Error('No account returned from wallet')
      }

      await ensureMonadChain(provider)
      setGlobalAddress(accounts[0])

      // Set up listeners
      if (typeof provider.on === 'function') {
        try {
          provider.on('accountsChanged', (accs: string[]) =>
            setGlobalAddress(accs[0] || undefined)
          )
          provider.on('chainChanged', () => {
            provider
              .request({ method: 'eth_accounts' })
              .then((a: string[]) => setGlobalAddress(a?.[0] || undefined))
              .catch(() => {})
          })
          provider.on('disconnect', () => setGlobalAddress(undefined))
        } catch {
          // ignore
        }
      }
    } catch (err: any) {
      console.error('Wallet connect error:', err)

      const msg = String(err?.message || err || '')
      if (
        msg.includes('extension not found') ||
        msg.includes('not connected') ||
        msg.includes('timed out')
      ) {
        alert(
          '⚠️ Wallet connection error.\n\n' +
            'MetaMask often fails when multiple browser profiles are open.\n\n' +
            '🔧 How to fix:\n' +
            '1. Close other browser profiles\n' +
            '2. Go to chrome://extensions → Toggle MetaMask off/on\n' +
            '3. Reload the page\n\n' +
            '💡 Or install Rabby Wallet (rabby.io) - more stable!'
        )
      } else if (err.code !== 4001) {
        alert(err?.message || 'Failed to connect wallet')
      }
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    setGlobalAddress(undefined)
    _selectedProvider = null
  }, [])

  return { address, isConnected, isConnecting, connect, disconnect }
}

/**
 * Export for other hooks (useLobsterPot, etc.)
 */
export { getVerifiedProvider as getWalletProvider }
