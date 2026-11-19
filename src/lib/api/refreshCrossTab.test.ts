import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const SESSION_KEY = 'ctrl.session.v1'
const IDB_KEY = 'current'

const res = (body: unknown, status = 200): Response =>
  ({
    ok: status < 300,
    status,
    text: async () => JSON.stringify(body),
  }) as Response

const seed = (accessToken: string): void => {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ accessToken, expiresAt: null }))
}

/** Shared IndexedDB stand-in: every simulated tab sees the same pending record. */
interface FakeIdbRequest {
  result: unknown
  onsuccess: (() => void) | null
  onerror: (() => void) | null
}
interface FakeOpenRequest extends FakeIdbRequest {
  onupgradeneeded: (() => void) | null
  onblocked: (() => void) | null
}

const installIdb = (): Map<string, unknown> => {
  const data = new Map<string, unknown>()
  const req = (value: unknown): FakeIdbRequest => {
    const request: FakeIdbRequest = { result: value, onsuccess: null, onerror: null }
    queueMicrotask(() => request.onsuccess?.())
    return request
  }
  const store = {
    get: (key: IDBValidKey) => req(data.get(String(key)) ?? null),
    put: (value: unknown, key?: IDBValidKey) => {
      data.set(String(key ?? IDB_KEY), value)
      return req(undefined)
    },
    delete: (key: IDBValidKey) => {
      data.delete(String(key))
      return req(undefined)
    },
  }
  const db = {
    objectStoreNames: { contains: () => true },
    createObjectStore: () => store,
    transaction: () => ({ objectStore: () => store }),
    close: () => {},
  }
  vi.stubGlobal('indexedDB', {
    open: () => {
      const request: FakeOpenRequest = {
        result: db,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
        onblocked: null,
      }
      queueMicrotask(() => request.onsuccess?.())
      return request
    },
  })
  return data
}

/** Each call is a fresh JS realm (fresh module state) over shared browser storage. */
const loadTab = async () => {
  vi.resetModules()
  const client = await import('./client')
  const refresh = await import('./refresh')
  const session = await import('./session')
  const operation = await import('./refresh-operation')
  return {
    apiRequest: client.apiRequest,
    refreshAccessToken: refresh.refreshAccessToken,
    readAccessToken: session.readAccessToken,
    readTokenGeneration: session.readTokenGeneration,
    onUnauthorized: session.onUnauthorized,
    readPendingOperation: operation.readPendingOperation,
  }
}

const installFetch = (handler: (url: string, init?: RequestInit) => Promise<Response>) => {
  const fetchMock = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) =>
    handler(String(url), init),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const keyFrom = (init: RequestInit | undefined): string =>
  (JSON.parse(String(init?.body)) as { operationKey: string }).operationKey

const waitFor = async (predicate: () => boolean): Promise<void> => {
  const deadline = Date.now() + 1000
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error('condition never became true')
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

describe('cross-tab refresh coordination', () => {
  let data: Map<string, unknown>

  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    document.cookie = 'lomor_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    document.cookie = 'lomor_csrf=csrf-1'
    data = installIdb()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    localStorage.clear()
    sessionStorage.clear()
  })

  it('two tabs refreshing at once perform one refresh with one operation key', async () => {
    const keys: string[] = []
    installFetch(async (url, init) => {
      if (url.endsWith('/auth/refresh')) {
        keys.push(keyFrom(init))
        return res({ accessToken: 'winner', expiresIn: '15m' })
      }
      return res({ ok: true })
    })
    const a = await loadTab()
    const b = await loadTab()

    const [first, second] = await Promise.all([a.refreshAccessToken(), b.refreshAccessToken()])

    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)
    expect(keys).toHaveLength(1)
    expect(keys[0]).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(data.size).toBe(0)
  })

  it('three tabs receiving 401 concurrently share the winner token', async () => {
    seed('old')
    let refreshCalls = 0
    installFetch(async (url, init) => {
      if (url.endsWith('/auth/refresh')) {
        refreshCalls++
        return res({ accessToken: 'new-token', expiresIn: '15m' })
      }
      return (init?.headers as Record<string, string> | undefined)?.Authorization ===
        'Bearer new-token'
        ? res({ ok: true })
        : res({ message: 'Unauthorized' }, 401)
    })
    const tabs = [await loadTab(), await loadTab(), await loadTab()]

    const results = await Promise.all(tabs.map((tab) => tab.apiRequest('/p')))

    expect(results).toHaveLength(3)
    expect(refreshCalls).toBe(1)
    for (const tab of tabs) {
      expect(tab.readAccessToken()).toBe('new-token')
      expect(tab.readTokenGeneration()).toBe(1)
    }
  })

  it('a second tab reads the updated access token from the session store', async () => {
    installFetch(async (url) =>
      url.endsWith('/auth/refresh')
        ? res({ accessToken: 'shared-token', expiresIn: 900 })
        : res({}),
    )
    const a = await loadTab()
    const b = await loadTab()
    expect(a.readTokenGeneration()).toBe(0)

    expect((await a.refreshAccessToken()).ok).toBe(true)

    expect(b.readAccessToken()).toBe('shared-token')
    expect(b.readTokenGeneration()).toBe(1)
  })

  it('reuses the pending key after a reload while the first request was pending', async () => {
    const keys: string[] = []
    let failPending!: (reason: unknown) => void
    const pending = new Promise<Response>((_resolve, reject) => {
      failPending = reject
    })
    installFetch(async (url, init) => {
      if (!url.endsWith('/auth/refresh')) return res({})
      keys.push(keyFrom(init))
      if (keys.length === 1) return await pending
      return res({ accessToken: 'after-reload', expiresIn: '15m' })
    })
    const first = await loadTab()
    const inFlight = first.refreshAccessToken()
    await waitFor(() => keys.length === 1)
    const pendingRecord = await first.readPendingOperation()
    expect(pendingRecord?.operationKey).toBe(keys[0])

    // A reload creates a fresh module realm over the same still-pending IDB key.
    const reloaded = await loadTab()
    failPending(new Error('connection lost while the tab was reloading'))
    expect((await inFlight).ok).toBe(false)
    expect((await reloaded.refreshAccessToken()).ok).toBe(true)

    expect(keys).toHaveLength(2)
    expect(keys[1]).toBe(keys[0])
  })

  it('retries after a timeout with the same operation key', async () => {
    const keys: string[] = []
    installFetch(async (url, init) => {
      if (!url.endsWith('/auth/refresh')) return res({})
      keys.push(keyFrom(init))
      if (keys.length === 1) throw new DOMException('timed out', 'AbortError')
      return res({ accessToken: 'retry-token', expiresIn: '15m' })
    })
    const tab = await loadTab()

    expect((await tab.refreshAccessToken()).ok).toBe(false)
    expect((await tab.refreshAccessToken()).ok).toBe(true)

    expect(keys).toHaveLength(2)
    expect(keys[1]).toBe(keys[0])
  })

  it('a late 401 cannot overwrite a newer token or log out the session', async () => {
    seed('old')
    const authHeaders: (string | undefined)[] = []
    let releaseLate!: () => void
    const late = new Promise<void>((resolve) => {
      releaseLate = resolve
    })
    let refreshCalls = 0
    let unauthorized = 0
    installFetch(async (url, init) => {
      if (url.endsWith('/auth/refresh')) {
        refreshCalls++
        return res({ accessToken: 'fresh', expiresIn: '15m' })
      }
      const auth = (init?.headers as Record<string, string> | undefined)?.Authorization
      authHeaders.push(auth)
      if (auth === 'Bearer old') {
        await late
        return res({ message: 'Unauthorized' }, 401)
      }
      return res({ ok: true })
    })
    const winner = await loadTab()
    const stale = await loadTab()
    stale.onUnauthorized(() => {
      unauthorized++
    })

    const staleRequest = stale.apiRequest('/p')
    await waitFor(() => authHeaders[0] === 'Bearer old')
    expect((await winner.refreshAccessToken()).ok).toBe(true)
    releaseLate()

    expect((await staleRequest as { ok: true } | undefined)).toBeDefined()
    expect(refreshCalls).toBe(1)
    expect(authHeaders).toEqual(['Bearer old', 'Bearer fresh'])
    expect(stale.readAccessToken()).toBe('fresh')
    expect(unauthorized).toBe(0)
  })

  it('broadcasts only operation metadata and never credentials', async () => {
    seed('secret-access-token')
    document.cookie = 'lomor_csrf=secret-csrf-token'
    const posts = vi.spyOn(BroadcastChannel.prototype, 'postMessage')
    installFetch(async (url) =>
      url.endsWith('/auth/refresh')
        ? res({ accessToken: 'secret-new-access-token', expiresIn: '15m' })
        : res({}),
    )
    const tab = await loadTab()

    expect((await tab.refreshAccessToken()).ok).toBe(true)

    const messages = posts.mock.calls.map((call) => call[0] as Record<string, unknown>)
    expect(messages.map((message) => message.status)).toEqual(['pending', 'success'])
    for (const message of messages) {
      expect(Object.keys(message).sort()).toEqual(
        ['generation', 'operationId', 'status', 'timestamp'].sort(),
      )
    }
    const wire = JSON.stringify(messages)
    for (const secret of ['secret-access-token', 'secret-new-access-token', 'secret-csrf-token', 'lomor_refresh']) {
      expect(wire).not.toContain(secret)
    }
  })

  it('fails closed when Web Locks is unavailable', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(navigator, 'locks')
    const fetchMock = installFetch(async () => res({ accessToken: 'should-not-happen', expiresIn: '15m' }))
    seed('keep-me')
    Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined })

    try {
      const tab = await loadTab()
      const outcome = await tab.refreshAccessToken()

      expect(outcome.ok).toBe(false)
      if (!outcome.ok) expect(outcome.error).toMatchObject({ code: 'REFRESH_COORDINATION_UNAVAILABLE' })
      expect(fetchMock).not.toHaveBeenCalled()
      expect(tab.readAccessToken()).toBe('keep-me')
    } finally {
      if (descriptor) Object.defineProperty(navigator, 'locks', descriptor)
    }
  })

  it('stops after one refresh when stale replays keep returning 401', async () => {
    seed('old')
    let refreshCalls = 0
    installFetch(async (url) => {
      if (url.endsWith('/auth/refresh')) {
        refreshCalls++
        return res(
          {
            statusCode: 401,
            message: 'Invalid refresh session',
            code: 'REFRESH_REPLAY_STALE',
          },
          401,
        )
      }
      return res({ message: 'Unauthorized' }, 401)
    })
    const tab = await loadTab()

    await expect(tab.apiRequest('/p')).rejects.toMatchObject({ status: 401 })

    expect(refreshCalls).toBe(1)
    expect(tab.readAccessToken()).toBe('old')
    expect(tab.readTokenGeneration()).toBe(0)
  })
})
