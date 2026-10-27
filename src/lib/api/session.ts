/**
 * The only file in the frontend that touches a credential.
 *
 * Nothing else reads or writes `localStorage`: features ask this module for a
 * token and `AuthProvider` alone decides when one is stored or cleared. That is
 * what makes "where is the JWT kept?" answerable by pointing at one file.
 *
 * ## Why storage at all
 *
 * The API issues an access token and no refresh token, so the token *is* the
 * session. Holding it only in memory would sign the shopper out on every reload,
 * which for a storefront is a bug rather than a security posture. The trade is
 * that any script running on this page can read it — an XSS would find it in
 * `localStorage` exactly as it would in a JS variable. The counterweight is that
 * it is never rendered, never logged, never placed in a URL, is bounded by the
 * server's own `expiresIn`, and is dropped the moment the server refuses it.
 *
 * There is deliberately no logout call to make: the API exposes none, and a
 * bearer token cannot be revoked by asking. Clearing it here ends the session on
 * this device, which is the whole of what logout can honestly do.
 */

/** Versioned so a future format change cannot misread an older payload. */
const STORAGE_KEY = 'ctrl.session.v1'

interface StoredSession {
  accessToken: string
  /** ISO instant after which the token is not worth sending. `null` if unknown. */
  expiresAt: string | null
}

/** Reported by {@link onUnauthorized} when the server answers `401`. */
export interface UnauthorizedEvent {
  /** A token was attached to the request, so this is the session ending. */
  hadToken: boolean
}

type UnauthorizedListener = (event: UnauthorizedEvent) => void

const unauthorizedListeners = new Set<UnauthorizedListener>()

const DURATION = /^(\d{1,9})(s|m|h|d)$/
const UNIT_MS: Record<string, number> = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 }

/**
 * Turns the server's `expiresIn` (`"15m"`) into an instant.
 *
 * An unrecognised format yields `null` rather than a guess: a token we cannot
 * date is simply allowed to reach the server and be rejected there.
 */
const expiryFrom = (expiresIn: string): string | null => {
  const match = DURATION.exec(expiresIn.trim())
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
    }
  } catch {
    // Private mode, disabled storage or corrupt JSON — all mean "no session".
    return null
  }
}

const writeStored = (session: StoredSession): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    // Storage unavailable: the session still works for this page view.
  }
}

/**
 * The token to attach to the next request, or `null`.
 *
 * Reads have a side effect worth naming: a token already past its local expiry
 * is deleted rather than sent, so an obviously dead credential never reaches the
 * network and never produces a `401` the customer would see as a flash.
 */
export const readAccessToken = (): string | null => {
  const session = readStored()
  if (!session) return null

  if (session.expiresAt !== null && Date.parse(session.expiresAt) <= Date.now()) {
    clearAccessToken()
    return null
  }

  return session.accessToken
}

export const writeAccessToken = (accessToken: string, expiresIn: string): void => {
  writeStored({ accessToken, expiresAt: expiryFrom(expiresIn) })
}

export const clearAccessToken = (): void => {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* nothing to clear */
  }
}

/** Subscribes to `401` answers. Returns an unsubscribe function. */
export const onUnauthorized = (listener: UnauthorizedListener): (() => void) => {
  unauthorizedListeners.add(listener)
  return () => {
    unauthorizedListeners.delete(listener)
  }
}

/**
 * Announces a `401` from the server.
 *
 * Called by the API client and nowhere else, so that "the session is over" is
 * decided in one place: `AuthProvider` reacts by forgetting the user, and by
 * offering sign-in when there was no session to end in the first place.
 */
export const emitUnauthorized = (event: UnauthorizedEvent): void => {
  for (const listener of unauthorizedListeners) listener(event)
}
