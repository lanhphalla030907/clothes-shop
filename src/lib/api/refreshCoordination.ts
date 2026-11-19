/**
 * Cross-tab primitives for the auth refresh flow.
 *
 * The refresh work itself stays in `refresh.ts`; this module only supplies the
 * single exclusive lock and the credential-free status channel. Web Locks is
 * required: without it there is no honest way to stop two tabs from starting
 * independent refreshes against one rotating refresh cookie, so callers fail
 * closed instead of assuming coordination that the browser cannot provide.
 */

import { ApiError } from './errors'

/** The one lock name shared by every tab of this origin. */
export const REFRESH_LOCK_NAME = 'lomor-auth-refresh'
const CHANNEL_NAME = 'lomor-auth-refresh-status'

export type RefreshStatus = 'pending' | 'success' | 'failure' | 'terminal'

/** Deliberately credential-free: no access, refresh or CSRF value is included. */
export interface RefreshStatusMessage {
  operationId: string
  status: RefreshStatus
  generation: number
  timestamp: number
}

interface LockOwner {
  request<T>(name: string, callback: () => Promise<T>): Promise<T>
}

const lockOwner = (): LockOwner | null => {
  if (typeof navigator === 'undefined') return null
  const candidate = (navigator as Navigator & { locks?: LockOwner }).locks
  return candidate !== undefined && typeof candidate.request === 'function'
    ? candidate
    : null
}

/** Runs `work` as the sole refresh owner for the whole origin. */
export const withRefreshLock = <T>(work: () => Promise<T>): Promise<T> => {
  const locks = lockOwner()
  if (locks === null) {
    return Promise.reject(
      new ApiError('Cross-tab session refresh is unavailable in this browser.', {
        kind: 'unknown',
        code: 'REFRESH_COORDINATION_UNAVAILABLE',
      }),
    )
  }
  return locks.request(REFRESH_LOCK_NAME, work)
}

let channel: BroadcastChannel | null | undefined

const getChannel = (): BroadcastChannel | null => {
  if (channel !== undefined) return channel
  if (typeof BroadcastChannel === 'undefined') {
    channel = null
    return channel
  }
  try {
    channel = new BroadcastChannel(CHANNEL_NAME)
  } catch {
    channel = null
  }
  return channel
}

/** Announces a status change; the message shape is the credential boundary. */
export const broadcastRefreshStatus = (message: RefreshStatusMessage): void => {
  getChannel()?.postMessage(message)
}

export const onRefreshStatus = (listener: (message: RefreshStatusMessage) => void): (() => void) => {
  const bus = getChannel()
  if (bus === null) return () => {}
  const handler = (event: MessageEvent): void => {
    const value: unknown = event.data
    if (
      typeof value !== 'object' ||
      value === null ||
      typeof (value as Partial<RefreshStatusMessage>).operationId !== 'string' ||
      typeof (value as Partial<RefreshStatusMessage>).generation !== 'number'
    ) {
      return
    }
    listener(value as RefreshStatusMessage)
  }
  bus.addEventListener('message', handler)
  return () => bus.removeEventListener('message', handler)
}
