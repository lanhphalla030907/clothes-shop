import { API } from './config'
import { ApiError, isApiError } from './errors'
import { request } from './http'
import { getOrCreateOperationKey, clearPendingOperation } from './refresh-operation'
import { broadcastRefreshStatus, withRefreshLock, type RefreshStatus } from './refreshCoordination'
import {
  clearAccessToken,
  emitUnauthorized,
  readCsrfCookie,
  readSessionSnapshot,
  writeAccessToken,
} from './session'

export interface RefreshSuccess {
  ok: true
  accessToken: string
}

export interface RefreshFailure {
  ok: false
  error: ApiError
  terminal: boolean
}

export type RefreshOutcome = RefreshSuccess | RefreshFailure

interface RefreshBody {
  accessToken?: unknown
  expiresIn?: unknown
}

const NON_TERMINAL_CODES = new Set(['REFRESH_REPLAY_STALE', 'REFRESH_OPERATION_EXPIRED'])

const asApiError = (error: unknown): ApiError =>
  isApiError(error)
    ? error
    : new ApiError('The session could not be refreshed.', { kind: 'unknown', cause: error })

const classify = (error: ApiError): boolean =>
  error.status === 401 && !NON_TERMINAL_CODES.has(error.code ?? '')

const performRefresh = async (baselineGeneration: number): Promise<RefreshOutcome> => {
  // The generation is captured when the refresh is *requested*, before any lock
  // wait or HTTP latency, so a login that wins that race cannot be undone.
  const startedGeneration = baselineGeneration
  const operationKey = await getOrCreateOperationKey()

  try {
    const body = await request<RefreshBody>(API.refresh, {
      method: 'POST',
      body: { operationKey },
      credentials: 'include',
      requestHeaders: { 'x-csrf-token': readCsrfCookie() ?? '' },
    })

    if (
      body === undefined ||
      typeof body.accessToken !== 'string' ||
      body.accessToken.length === 0 ||
      (typeof body.expiresIn !== 'string' && typeof body.expiresIn !== 'number')
    ) {
      throw new ApiError('The session could not be refreshed.', { kind: 'unknown', status: 200 })
    }

    const current = readSessionSnapshot()
    if (current.generation !== startedGeneration) {
      // A newer token (e.g. a login that finished while this request waited)
      // must survive; this response is stale even though it was a 200.
      await clearPendingOperation()
      return { ok: true, accessToken: current.accessToken ?? body.accessToken }
    }

    writeAccessToken(body.accessToken, body.expiresIn)
    await clearPendingOperation()
    return { ok: true, accessToken: body.accessToken }
  } catch (cause) {
    const error = asApiError(cause)

    if (
      error.code === 'REFRESH_OPERATION_EXPIRED' ||
      error.code === 'REFRESH_OPERATION_BINDING_MISMATCH' ||
      error.kind === 'validation'
    ) {
      await clearPendingOperation()
    }

    const terminal = classify(error)
    if (terminal && readSessionSnapshot().generation === startedGeneration) {
      // A failed refresh for an old token must never log out a newer session.
      clearAccessToken()
      emitUnauthorized({ hadToken: true })
    }

    return { ok: false, error, terminal }
  }
}

/**
 * Wraps the unchanged refresh core in the origin-wide lock. The generation seen
 * when the refresh was requested is compared again after winning the lock: a tab
 * that waited behind another refresh must reuse the winning token instead of
 * starting a second rotation with a new operation key.
 */
const coordinateRefresh = async (): Promise<RefreshOutcome> => {
  const requestedGeneration = readSessionSnapshot().generation

  try {
    return await withRefreshLock(async () => {
      const current = readSessionSnapshot()

      if (current.accessToken !== null && current.generation !== requestedGeneration) {
        return { ok: true, accessToken: current.accessToken }
      }

      const operationId = await getOrCreateOperationKey()
      broadcastRefreshStatus({
        operationId,
        status: 'pending',
        generation: current.generation,
        timestamp: Date.now(),
      })

      const outcome = await performRefresh(requestedGeneration)
      const status: RefreshStatus = outcome.ok
        ? 'success'
        : outcome.terminal
          ? 'terminal'
          : 'failure'

      broadcastRefreshStatus({
        operationId,
        status,
        generation: readSessionSnapshot().generation,
        timestamp: Date.now(),
      })
      return outcome
    })
  } catch (cause) {
    // Missing Web Locks (or a broken lock) must fail closed without clearing a
    // still-valid session; refresh.ts itself never throws outside the lock.
    return { ok: false, error: asApiError(cause), terminal: false }
  }
}

let sharedRefresh: Promise<RefreshOutcome> | null = null

export const refreshAccessToken = (): Promise<RefreshOutcome> => {
  if (sharedRefresh === null) {
    sharedRefresh = coordinateRefresh().finally(() => {
      sharedRefresh = null
    })
  }
  return sharedRefresh
}
