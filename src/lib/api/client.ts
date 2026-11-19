import { API } from './config'
import { ApiError, isApiError } from './errors'
import {
  request,
  type HttpMethod,
  type RequestOptions,
  type ResponseBody,
} from './http'
import { refreshAccessToken } from './refresh'
import { emitUnauthorized, readCsrfCookie, readSessionSnapshot } from './session'

/**
 * The session-aware layer every feature calls.
 *
 * `http.ts` moves bytes; this attaches the caller's identity, retries a
 * protected request once after a single shared refresh, and announces only a
 * confirmed terminal session failure. Features never build a header or read a
 * cookie themselves.
 */

export interface ApiRequestOptions extends RequestOptions {
  /** Inject `x-csrf-token` from the readable cookie; only for cookie endpoints. */
  csrf?: boolean
}

/** These endpoints must never trigger the refresh retry loop. */
const NO_REFRESH_RETRY = new Set<string>([
  API.login,
  API.googleLogin,
  API.refresh,
  API.logout,
])

export const apiRequest = async <T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ResponseBody<T>> => {
  const { csrf = false, ...transport } = options
  const canRefresh = !NO_REFRESH_RETRY.has(path)
  const initial = readSessionSnapshot()
  let token = initial.accessToken
  let generation = initial.generation
  let retried = false

  const send = (currentToken: string | null): Promise<ResponseBody<T>> => {
    const csrfValue = csrf ? readCsrfCookie() : null
    return request<T>(path, {
      ...transport,
      requestHeaders: {
        ...transport.requestHeaders,
        ...(currentToken === null ? {} : { Authorization: `Bearer ${currentToken}` }),
        ...(csrf && csrfValue !== null ? { 'x-csrf-token': csrfValue } : {}),
      },
    })
  }

  for (;;) {
    try {
      return await send(token)
    } catch (error) {
      const status = isApiError(error) ? error.status : undefined

      if (status === 401 && canRefresh && !retried) {
        // Compare the generation this request was sent with against the shared
        // session store. A tab that refreshed while this one waited already
        // produced the token worth retrying with — no second rotation needed.
        const latest = readSessionSnapshot()
        if (
          latest.accessToken !== null &&
          (latest.generation !== generation || latest.accessToken !== token)
        ) {
          token = latest.accessToken
          generation = latest.generation
          retried = true
          continue
        }

        const outcome = await refreshAccessToken()
        if (outcome.ok) {
          // Read the winner from the shared store, never from a broadcast.
          const refreshed = readSessionSnapshot()
          token = refreshed.accessToken ?? outcome.accessToken
          generation = refreshed.generation
          retried = true
          continue
        }

        // A terminal refresh already cleared state and emitted the event.
        // CSRF/stale/network outcomes preserve the session: rethrow the
        // original 401 without emitting a session-ended notification.
        throw error
      }

      if (status === 401) {
        const latest = readSessionSnapshot()
        // A late 401 minted for an older token cannot log out a newer session.
        if (latest.accessToken !== null && latest.generation !== generation) throw error
        emitUnauthorized({ hadToken: token !== null })
      }
      throw error
    }
  }
}

/* ----------------------------- verb shorthands ---------------------------- */

export const apiGet = <T>(
  path: string,
  options: Omit<ApiRequestOptions, 'method' | 'body'> = {},
): Promise<ResponseBody<T>> => apiRequest<T>(path, { ...options, method: 'GET' })

/**
 * A `GET` that must return a body.
 *
 * `204` on a read endpoint would mean the server and the client disagree about
 * the contract, so it is surfaced as a not-found rather than handed on as
 * `undefined` for every caller to re-check.
 */
export const apiGetOne = async <T>(
  path: string,
  options: Omit<ApiRequestOptions, 'method' | 'body'> = {},
): Promise<T> => {
  const body = await apiGet<T>(path, options)
  if (body === undefined) {
    throw new ApiError('That record could not be loaded.', {
      kind: 'notFound',
      status: 204,
    })
  }
  return body
}

/**
 * A `GET` that must return a list.
 *
 * Guards the same way `apiGetOne` does, for the same reason: a collection
 * endpoint answering an empty body is the server and the client disagreeing
 * about the contract, and handing that on as `[]` would render as "this
 * category is empty" rather than as a failure worth retrying.
 */
export const apiGetList = async <T>(
  path: string,
  options: Omit<ApiRequestOptions, 'method' | 'body'> = {},
): Promise<T[]> => {
  const body = await apiGet<T[]>(path, options)
  if (!Array.isArray(body)) {
    throw new ApiError('That collection could not be loaded.', { kind: 'server' })
  }
  return body
}

export const apiPost = <T>(
  path: string,
  body: unknown,
  options: Omit<ApiRequestOptions, 'method' | 'body'> = {},
): Promise<ResponseBody<T>> => apiRequest<T>(path, { ...options, method: 'POST', body })

export const apiPatch = <T>(
  path: string,
  body: unknown,
  options: Omit<ApiRequestOptions, 'method' | 'body'> = {},
): Promise<ResponseBody<T>> => apiRequest<T>(path, { ...options, method: 'PATCH', body })

export const apiDelete = <T>(
  path: string,
  options: Omit<ApiRequestOptions, 'method'> = {},
): Promise<ResponseBody<T>> => apiRequest<T>(path, { ...options, method: 'DELETE' })

/** Verb re-exported so a caller that builds a path dynamically stays typed. */
export type { HttpMethod, RequestOptions, ResponseBody }
