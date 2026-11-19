/**
 * The only file in the frontend that touches the access token.
 *
 * The HttpOnly refresh cookie is never readable here. An expired token is kept
 * until a refresh has been attempted: a stale local clock must not end a live
 * server session.
 */

/** Versioned so a future format change cannot misread an older payload. */
const STORAGE_KEY = 'ctrl.session.v1'
const CSRF_COOKIE = 'lomor_csrf'

interface StoredSession {
  accessToken: string
  expiresAt: string | null
  /** Incremented whenever this store receives a new access token. */
  generation: number
}

/** Read from one storage snapshot so token and generation cannot be torn. */
export interface SessionSnapshot {
  accessToken: string | null
  generation: number
}

export interface UnauthorizedEvent {
  hadToken: boolean
}

type UnauthorizedListener = (event: UnauthorizedEvent) => void

const unauthorizedListeners = new Set<UnauthorizedListener>()
const DURATION = /^(\d{1,9})(s|m|h|d)$/
const UNIT_MS: Record<string, number> = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 }

const normalizeExpiresIn = (expiresIn: string | number): string =>
  typeof expiresIn === 'string' ? expiresIn : `${expiresIn}s`

const expiryFrom = (expiresIn: string | number): string | null => {
  const match = DURATION.exec(normalizeExpiresIn(expiresIn).trim())
  if (!match) return null
  const amount = Number(match[1])
  const unit = match[2]
  if (!Number.isFinite(amount) || unit === undefined) return null
  return new Date(Date.now() + amount * (UNIT_MS[unit] ?? 0)).toISOString()
}

const readStored = (): StoredSession | null => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const candidate = parsed as Partial<StoredSession>
    if (typeof candidate.accessToken !== 'string' || candidate.accessToken.length === 0) return null
    return {
      accessToken: candidate.accessToken,
      expiresAt: typeof candidate.expiresAt === 'string' ? candidate.expiresAt : null,
      generation:
        typeof candidate.generation === 'number' &&
        Number.isSafeInteger(candidate.generation) &&
        candidate.generation >= 0
          ? candidate.generation
          : 0,
    }
  } catch {
    return null
  }
}

const writeStored = (session: StoredSession): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    /* storage unavailable */
  }
}

/** Stored token and its generation from a single read of the session store. */
export const readSessionSnapshot = (): SessionSnapshot => {
  const stored = readStored()
  return {
    accessToken: stored?.accessToken ?? null,
    generation: stored?.generation ?? 0,
  }
}

/** Monotonic marker for the current token; used to reject stale 401s. */
export const readTokenGeneration = (): number => readStored()?.generation ?? 0

/** Stored token, even if locally expired; never deleted as a side effect. */
export const readAccessToken = (): string | null => readStored()?.accessToken ?? null

/** Whether a stored token has not obviously expired locally. */
export const hasUsableAccessToken = (): boolean => {
  const session = readStored()
  if (session === null) return false
  return session.expiresAt === null || Date.parse(session.expiresAt) > Date.now()
}

export const writeAccessToken = (accessToken: string, expiresIn: string | number): void => {
  const generation = (readStored()?.generation ?? 0) + 1
  writeStored({ accessToken, expiresAt: expiryFrom(expiresIn), generation })
}

export const clearAccessToken = (): void => {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* nothing to clear */
  }
}

/** Reads the double-submit CSRF cookie only at the moment it is needed. */
export const readCsrfCookie = (): string | null => {
  if (typeof document === 'undefined') return null
  for (const part of document.cookie.split(';')) {
    const index = part.indexOf('=')
    if (index <= 0 || part.slice(0, index).trim() !== CSRF_COOKIE) continue
    try {
      return decodeURIComponent(part.slice(index + 1).trim())
    } catch {
      return null
    }
  }
  return null
}

export const onUnauthorized = (listener: UnauthorizedListener): (() => void) => {
  unauthorizedListeners.add(listener)
  return () => {
    unauthorizedListeners.delete(listener)
  }
}

/** Announces only a confirmed terminal session failure. */
export const emitUnauthorized = (event: UnauthorizedEvent): void => {
  for (const listener of unauthorizedListeners) listener(event)
}
