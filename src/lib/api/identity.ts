import { request } from './http'
import { ApiError, isApiError } from './errors'

/**
 * The one place the app knows how it proves who it is.
 *
 * ## What this is today
 *
 * The API has no authentication. User-scoped endpoints read a claimed identity
 * from an `X-User-Id` header, and every one of them verifies that the claim is a
 * real user before reading or writing anything. So a usable client identity here
 * is two things: a UUID to claim, and a matching `users` row for the server to
 * find.
 *
 * ## What this is not
 *
 * It is not authentication. There is no proof of anything, and the value stored
 * below is an opaque identifier, not a credential — which is why it may live in
 * `localStorage`. No token, secret or password is ever written to storage: the
 * provisioning password below is generated per attempt, sent once, and
 * discarded. It exists only because `POST /users` requires one.
 *
 * ## How it is replaced
 *
 * Every caller reaches identity through {@link getIdentity} /
 * {@link ensureIdentity} and nothing else imports storage or `crypto` from
 * here. Swapping the mechanism for JWT means rewriting this file — read the
 * token, hand its subject to the same {@link Identity} shape — and no feature,
 * hook or component changes.
 */

/** Storage key. Versioned so a future format change cannot misread old data. */
const STORAGE_KEY = 'ctrl.identity.v1'

/**
 * The provisional profile. Not collected from the shopper — there is no sign-up
 * form in this phase — and shown as such wherever it is displayed.
 */
const PROVISIONAL_FIRST_NAME = 'Guest'
const PROVISIONAL_LAST_NAME = 'Shopper'

/** `example.com` is reserved for documentation, so this can never collide. */
const PROVISIONAL_EMAIL_DOMAIN = 'ctrl.example.com'

export interface Identity {
  /** The id claimed in `X-User-Id`. */
  userId: string
  email: string
  firstName: string
  lastName: string
  /** ISO timestamp of when this device first claimed an identity. */
  claimedAt: string
}

export interface IdentityAdapter {
  /** Last known identity, or `null` before the first successful bootstrap. */
  current(): Identity | null
  /**
   * Resolves the identity, provisioning one on first use. Concurrent callers
   * share a single in-flight attempt rather than racing to create two users.
   */
  ensure(): Promise<Identity>
  /** Forgets the identity. The next `ensure()` provisions a fresh one. */
  reset(): void
  /** Notified whenever the identity changes. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * A v4 UUID.
 *
 * `crypto.randomUUID` needs a secure context, which a LAN-hosted dev build may
 * not have, so `getRandomValues` is used as the fallback — it is available in
 * every browser this storefront supports and is just as unpredictable.
 */
const newUuid = (): string => {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()

  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'))
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-')
}

/**
 * A password for the provisioning request only.
 *
 * `crypto.getRandomValues` rather than `Math.random`, and it is never stored,
 * logged or reused: it exists to satisfy `CreateUserDto`, and the account it
 * creates is never signed into.
 */
const newProvisioningPassword = (): string => {
  const alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%'
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const password = Array.from(
    bytes,
    (byte) => alphabet[(byte % alphabet.length) as number] ?? 'a',
  ).join('')

  // `CreateUserDto` caps the password at 128 characters; 32 is comfortably under.
  return `${password}aA1`
}

const read = (): Identity | null => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null

    const candidate = parsed as Partial<Identity>
    if (typeof candidate.userId !== 'string' || !UUID_PATTERN.test(candidate.userId)) return null

    return {
      userId: candidate.userId,
      email: typeof candidate.email === 'string' ? candidate.email : '',
      firstName: typeof candidate.firstName === 'string' ? candidate.firstName : PROVISIONAL_FIRST_NAME,
      lastName: typeof candidate.lastName === 'string' ? candidate.lastName : PROVISIONAL_LAST_NAME,
      claimedAt: typeof candidate.claimedAt === 'string' ? candidate.claimedAt : new Date().toISOString(),
    }
  } catch {
    // Private mode, disabled storage or corrupt JSON — all mean "no identity".
    return null
  }
}

const write = (identity: Identity): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(identity))
  } catch {
    /* storage unavailable — the identity still works for this session */
  }
}

const provisionalEmail = (): string =>
  `ctrl-${newUuid().slice(0, 8)}@${PROVISIONAL_EMAIL_DOMAIN}`

/**
 * Shape of the only user endpoint the client calls.
 *
 * Declared here rather than imported from a shared types barrel because the
 * `users` feature is not part of the customer's API surface: nothing else in the
 * app may use it. That is enforced by this local type being the sole reference.
 */
interface ProvisionedUser {
  id: string
  email: string
  firstName: string
  lastName: string
}

const createTemporaryIdentity = async (): Promise<Identity> => {
  const response = await request<ProvisionedUser>('/users', {
    method: 'POST',
    body: {
      firstName: PROVISIONAL_FIRST_NAME,
      lastName: PROVISIONAL_LAST_NAME,
      email: provisionalEmail(),
      password: newProvisioningPassword(),
    },
  })

  if (!response) {
    throw new ApiError('The studio could not open a session for this device.', {
      kind: 'unknown',
    })
  }

  return {
    userId: response.id,
    email: response.email,
    firstName: response.firstName,
    lastName: response.lastName,
    claimedAt: new Date().toISOString(),
  }
}

/** How many identities to try before giving up on a provisioning collision. */
const PROVISION_ATTEMPTS = 3

class TemporaryUserIdAdapter implements IdentityAdapter {
  private identity: Identity | null = null
  private inFlight: Promise<Identity> | null = null
  private listeners = new Set<() => void>()

  constructor() {
    this.identity = read()
  }

  current(): Identity | null {
    return this.identity
  }

  ensure(): Promise<Identity> {
    if (this.identity) return Promise.resolve(this.identity)
    // One attempt shared by every caller: without this, four components mounting
    // at once would each provision a user and the last write would win.
    this.inFlight ??= this.provision().finally(() => {
      this.inFlight = null
    })

    return this.inFlight
  }

  reset(): void {
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* nothing to clear */
    }
    this.identity = null
    this.emit()
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private async provision(): Promise<Identity> {
    let lastError: unknown

    for (let attempt = 0; attempt < PROVISION_ATTEMPTS; attempt += 1) {
      try {
        const identity = await createTemporaryIdentity()
        write(identity)
        this.identity = identity
        this.emit()
        return identity
      } catch (error) {
        lastError = error
        // Only a collision on the generated email is worth another attempt;
        // anything else (offline, 500, validation) will fail identically next
        // time and should surface to the caller now.
        if (!isApiError(error) || error.kind !== 'conflict') throw error
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new ApiError('The studio could not open a session for this device.', {
          kind: 'unknown',
        })
  }

  private emit(): void {
    for (const listener of this.listeners) listener()
  }
}

const adapter = new TemporaryUserIdAdapter()

/** The adapter instance every feature goes through. */
export const identityAdapter: IdentityAdapter = adapter

export const currentIdentity = (): Identity | null => adapter.current()

export const ensureIdentity = (): Promise<Identity> => adapter.ensure()

export const resetIdentity = (): void => adapter.reset()