/**
 * Pending refresh-operation metadata.
 *
 * IndexedDB is used only to remember the opaque operation key across an
 * uncertain request or a reload. No access token, refresh token or CSRF value
 * is ever written here — the HttpOnly refresh cookie stays with the browser.
 */

const DB_NAME = 'lomor-refresh-operations'
const STORE_NAME = 'pending'
const DB_VERSION = 1
const RECORD_KEY = 'current'

export interface PendingRefreshOperation {
  operationKey: string
  createdAt: number
  attempts: number
}

/** 32 random bytes as canonical Base64URL: exactly 43 URL-safe characters. */
export const createOperationKey = (): string => {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const isPendingOperation = (value: unknown): value is PendingRefreshOperation => {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<PendingRefreshOperation>
  return (
    typeof candidate.operationKey === 'string' &&
    /^[A-Za-z0-9_-]{43}$/.test(candidate.operationKey) &&
    typeof candidate.createdAt === 'number' &&
    typeof candidate.attempts === 'number'
  )
}

const openDatabase = (): Promise<IDBDatabase | null> =>
  new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null)
      return
    }

    let request: IDBOpenDBRequest
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION)
    } catch {
      resolve(null)
      return
    }

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
    request.onblocked = () => resolve(null)
  })

export const readPendingOperation = async (): Promise<PendingRefreshOperation | null> => {
  const db = await openDatabase()
  if (db === null) return null

  return new Promise((resolve) => {
    try {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(RECORD_KEY)
      request.onsuccess = () => {
        const value: unknown = request.result
        resolve(isPendingOperation(value) ? value : null)
        db.close()
      }
      request.onerror = () => {
        resolve(null)
        db.close()
      }
    } catch {
      resolve(null)
      db.close()
    }
  })
}

export const writePendingOperation = async (operation: PendingRefreshOperation): Promise<void> => {
  const db = await openDatabase()
  if (db === null) return

  await new Promise<void>((resolve) => {
    try {
      const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(operation, RECORD_KEY)
      request.onsuccess = () => resolve()
      request.onerror = () => resolve()
    } catch {
      resolve()
    } finally {
      db.close()
    }
  })
}

export const clearPendingOperation = async (): Promise<void> => {
  const db = await openDatabase()
  if (db === null) return

  await new Promise<void>((resolve) => {
    try {
      const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(RECORD_KEY)
      request.onsuccess = () => resolve()
      request.onerror = () => resolve()
    } catch {
      resolve()
    } finally {
      db.close()
    }
  })
}

/**
 * Reuses an existing pending key while the outcome is still uncertain.
 * A fresh key is generated only when no valid pending record exists.
 */
export const getOrCreateOperationKey = async (): Promise<string> => {
  const existing = await readPendingOperation()
  if (existing !== null) return existing.operationKey

  const operation: PendingRefreshOperation = {
    operationKey: createOperationKey(),
    createdAt: Date.now(),
    attempts: 0,
  }
  await writePendingOperation(operation)
  return operation.operationKey
}
