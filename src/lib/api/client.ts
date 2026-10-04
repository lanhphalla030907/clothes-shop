import { IDENTITY_HEADER } from './config'
import { ApiError, isApiError } from './errors'
import { request, type HttpMethod, type RequestOptions, type ResponseBody } from './http'
import { ensureIdentity, resetIdentity } from './identity'

/**
 * The identity-aware layer every feature calls.
 *
 * `http.ts` moves bytes; this attaches *who* is asking and applies the one
 * piece of policy that is identity-specific: recovering from a claimed user the
 * server no longer knows. Features never build a header or call `fetch`.
 */

export interface ApiRequestOptions extends RequestOptions {
  /**
   * Retry once after re-provisioning, if the server answers 404.
   *
   * Only safe on a **collection read scoped to the caller** (`GET /cart`,
   * `/wishlist`, `/addresses`, `/orders`), where a 404 cannot mean anything
   * except "the claimed user does not exist". Those endpoints answer an empty
   * success for a real user with no data, so 404 is unambiguous.
   *
   * Never enable it on a detail read: the API answers 404 both for "absent" and
   * "not yours", so recovering there would silently throw away the customer's
   * session every time they open a mistyped or deleted order.
   */
  recoverIdentity?: boolean
}

export const apiRequest = async <T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ResponseBody<T>> => {
  const { recoverIdentity, ...transport } = options
  const identity = await ensureIdentity()

  const send = (userId: string) =>
    request<T>(path, { ...transport, requestHeaders: { [IDENTITY_HEADER]: userId } })

  try {
    return await send(identity.userId)
  } catch (error) {
    if (!recoverIdentity || !isApiError(error) || error.kind !== 'notFound') throw error

    // The claimed user is gone — most often a development database was reset.
    // Provision a fresh one and let the caller's retry land on a real identity.
    resetIdentity()
    const renewed = await ensureIdentity()

    return send(renewed.userId)
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