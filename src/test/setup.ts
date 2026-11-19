class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

;(globalThis as unknown as { ResizeObserver: typeof ResizeObserverMock }).ResizeObserver =
  ResizeObserverMock
if (typeof window !== 'undefined') {
  ;(window as unknown as { ResizeObserver: typeof ResizeObserverMock }).ResizeObserver =
    ResizeObserverMock
}

/**
 * jsdom ships neither Web Locks nor a usable cross-realm BroadcastChannel.
 * These in-memory stand-ins model the two primitives the refresh coordinator
 * requires and are shared by every module instance in a test file, so a test
 * can simulate several tabs by loading the auth modules more than once.
 */
const lockTails = new Map<string, Promise<void>>()

const acquireLock = (name: string): Promise<() => void> => {
  const previous = lockTails.get(name) ?? Promise.resolve()
  let release!: () => void
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  lockTails.set(name, previous.then(() => held))
  return previous.then(() => release)
}

if (typeof navigator !== 'undefined') {
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: {
      request: async <T>(name: string, callback: () => Promise<T>): Promise<T> => {
        const release = await acquireLock(name)
        try {
          return await callback()
        } finally {
          release()
        }
      },
    },
  })
}

const channels = new Map<string, Set<BroadcastChannelMock>>()

class BroadcastChannelMock {
  readonly name: string
  onmessage: ((event: MessageEvent) => void) | null = null
  private readonly listeners = new Set<(event: MessageEvent) => void>()
  private closed = false

  constructor(name: string) {
    this.name = name
    const peers = channels.get(name) ?? new Set<BroadcastChannelMock>()
    peers.add(this)
    channels.set(name, peers)
  }

  postMessage(message: unknown): void {
    if (this.closed) return
    for (const peer of channels.get(this.name) ?? []) {
      if (peer === this || peer.closed) continue
      const event = { data: message } as MessageEvent
      peer.onmessage?.(event)
      for (const listener of peer.listeners) listener(event)
    }
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void): void {
    if (type === 'message' && !this.closed) this.listeners.add(listener)
  }

  removeEventListener(type: string, listener: (event: MessageEvent) => void): void {
    if (type === 'message') this.listeners.delete(listener)
  }

  close(): void {
    this.closed = true
    channels.get(this.name)?.delete(this)
    this.listeners.clear()
    this.onmessage = null
  }
}

Object.defineProperty(globalThis, 'BroadcastChannel', {
  configurable: true,
  writable: true,
  value: BroadcastChannelMock,
})
