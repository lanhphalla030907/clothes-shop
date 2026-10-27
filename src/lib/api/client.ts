import { ApiError } from './errors'
import { request, type HttpMethod, type RequestOptions, type ResponseBody } from './http'
import { emitUnauthorized, readAccessToken } from './session'

/**
 * The session-aware layer every feature calls.
 *
 * `http.ts` moves bytes; this attaches *who* is asking — the bearer token, if
 * there is one — and announces the one outcome that is global to the app: the
 * server refusing the credential. Features never build a header, never read
 * storage, and never see a `401` they would each have to interpret differently.
 */

export type ApiRequestOptions = RequestOptions

export const apiRequest = async <T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ResponseBody<T>> => {
  const token = readAccessToken()

  try {
    return await request<T>(path, {
      ...options,
      requestHeaders: token === null ? {} : { Authorization: `Bearer ${token}` },
    })
  } catch (error) {
    // `403` is deliberately not here: it means the credential was accepted and
    // the request was not permitted, which must never end a valid session.
    if (error instanceof ApiError && error.status === 401) {
      emitUnauthorized({ hadToken: token !== null })
    }
    throw error
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
 * about the contract, and handing that on as `[]` would render as "this category
 * is empty" rather than as a failure worth retrying.
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
