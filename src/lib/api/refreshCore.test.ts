import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from './client'
import { refreshAccessToken } from './refresh'

const KEY = 'ctrl.session.v1'
const CSRF = 'csrf-1'
const res = (body: unknown, status = 200): Response => ({ ok: status < 300, status, text: async () => (status === 204 ? '' : JSON.stringify(body)) }) as Response
const seed = (token: string) => localStorage.setItem(KEY, JSON.stringify({ accessToken: token, expiresAt: null }))

const idb = () => {
  const data = new Map<string, unknown>()
  const req = (value: unknown): any => {
    const request: any = { result: value, onsuccess: null, onerror: null }
    queueMicrotask(() => request.onsuccess?.())
    return request
  }
  const store = { get: (k: IDBValidKey) => req(data.get(String(k)) ?? null), put: (v: unknown, k?: IDBValidKey) => { data.set(String(k ?? 'current'), v); return req(undefined) }, delete: (k: IDBValidKey) => { data.delete(String(k)); return req(undefined) } }
  const db = { objectStoreNames: { contains: () => true }, createObjectStore: () => store, transaction: () => ({ objectStore: () => store }), close: () => {} }
  vi.stubGlobal('indexedDB', {
    open: () => {
      const request: any = { result: db, onsuccess: null, onerror: null, onupgradeneeded: null, onblocked: null }
      queueMicrotask(() => request.onsuccess?.())
      return request
    },
  })
  return data
}

describe('refresh core', () => {
  let data: Map<string, unknown>
  beforeEach(() => {
    localStorage.clear(); sessionStorage.clear()
    document.cookie = 'lomor_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    document.cookie = `lomor_csrf=${CSRF}`
    data = idb()
  })
  afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); sessionStorage.clear() })

  it('refresh success uses cookies, CSRF, 43-char key, clears pending', async () => {
    const f = vi.fn(async (_url: string, _init?: RequestInit) => res({ accessToken: 'a2', expiresIn: '15m' }))
    vi.stubGlobal('fetch', f)
    expect((await refreshAccessToken()).ok).toBe(true)
    const init = f.mock.calls[0][1] as RequestInit
    const body = JSON.parse(String(init.body)) as { operationKey: string }
    expect(init.credentials).toBe('include')
    expect((init.headers as Record<string, string>)['x-csrf-token']).toBe(CSRF)
    expect(body.operationKey).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(localStorage.getItem(KEY)).toContain('a2')
    expect(data.size).toBe(0)
  })

  it('reuses pending key after uncertain failure', async () => {
    const keys: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (_u: string, i: RequestInit) => {
      keys.push((JSON.parse(String(i.body)) as { operationKey: string }).operationKey)
      if (keys.length === 1) throw new Error('offline')
      return res({ accessToken: 'a3', expiresIn: 900 })
    }))
    await refreshAccessToken(); await refreshAccessToken()
    expect(keys[1]).toBe(keys[0])
  })

  it('shares one refresh for simultaneous 401s', async () => {
    seed('old'); let n = 0
    vi.stubGlobal('fetch', vi.fn(async (u: RequestInfo | URL, i?: RequestInit) => {
      if (String(u).endsWith('/auth/refresh')) { n++; return res({ accessToken: 'shared', expiresIn: '15m' }) }
      return (i?.headers as Record<string, string> | undefined)?.Authorization === 'Bearer shared' ? res({ ok: true }) : res({ message: 'Unauthorized' }, 401)
    }))
    await Promise.all([apiRequest('/p'), apiRequest('/p')])
    expect(n).toBe(1)
  })

  it('retries original request once and stops on terminal failure', async () => {
    seed('old'); let refresh = 0, calls = 0
    vi.stubGlobal('fetch', vi.fn(async (u: RequestInfo | URL) => {
      if (String(u).endsWith('/auth/refresh')) { refresh++; return res({ statusCode: 401, message: 'Invalid refresh session', code: 'INVALID_REFRESH_SESSION' }, 401) }
      calls++; return res({ message: 'Unauthorized' }, 401)
    }))
    await expect(apiRequest('/p')).rejects.toMatchObject({ status: 401 })
    expect(refresh).toBe(1); expect(calls).toBe(1); expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('preserves session on CSRF failure and stale replay', async () => {
    for (const body of [{ statusCode: 403, message: 'Invalid CSRF token' }, { statusCode: 401, message: 'Invalid refresh session', code: 'REFRESH_REPLAY_STALE' }]) {
      seed('keep')
      vi.stubGlobal('fetch', vi.fn(async (u: RequestInfo | URL) => String(u).endsWith('/auth/refresh') ? res(body, body.statusCode) : res({ message: 'Unauthorized' }, 401)))
      await expect(apiRequest('/p')).rejects.toMatchObject({ status: 401 })
      expect(localStorage.getItem(KEY)).toContain('keep')
    }
  })

  it('never persists refresh or CSRF values', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    await refreshAccessToken()
    const all = JSON.stringify({ local: localStorage.getItem(KEY), session: sessionStorage.length, indexed: [...data.values()] })
    expect(all).not.toContain('lomor_refresh'); expect(all).not.toContain(CSRF)
  })
})
