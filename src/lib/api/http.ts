import { API_BASE_URL, REQUEST_TIMEOUT_MS } from './config'
import { ApiError, isAbortError, kindForStatus, type ApiErrorKind } from './errors'

/**
 * The transport. One function owns `fetch`: URL composition, headers, the
 * timeout, JSON parsing and the translation of every possible failure into an
 * {@link ApiError}.
 *
 * It deliberately knows nothing about who the caller is — no bearer token, no
 * retry policy. `client.ts` layers the session on top and features layer intent
 * on top of that, so this file stays small enough to reason about and impossible
 * to bypass by accident.
 */

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

export interface RequestOptions {
  method?: HttpMethod
  /** Serialised as JSON. Omit for GET/DELETE with no payload. */
  body?: unknown
  signal?: AbortSignal
  /** Overrides {@link REQUEST_TIMEOUT_MS} for a call known to be slow. */
  timeoutMs?: number
  /**
   * Extra headers merged last, so a caller-supplied header wins over a default.
   * This is how the session layer attaches `Authorization` without the transport
   * knowing what a session is.
   */
  requestHeaders?: Record<string, string>
  /** Query parameters; `undefined` and `''` values are omitted. */
  query?: Record<string, string | number | undefined>
}

/** The parsed body of a response, or `undefined` for `204 No Content`. */
export type ResponseBody<T> = T | undefined

/**
 * Aborts when either the caller cancels or the deadline passes.
 *
 * Written by hand rather than with `AbortSignal.any`, which is still missing
 * from some of the browsers this storefront supports — and a polyfill would be a
 * larger dependency than the six lines it replaces.
 */
const withDeadline = (
  caller: AbortSignal | undefined,
  timeoutMs: number,
): { signal: AbortSignal; dispose: () => void; timedOut: () => boolean } => {
  const controller = new AbortController()
  let expired = false

  const timer = setTimeout(() => {
    expired = true
    controller.abort()
  }, timeoutMs)

  const forwardAbort = () => controller.abort()
  if (caller) {
    if (caller.aborted) controller.abort()
    else caller.addEventListener('abort', forwardAbort)
  }

  return {
    signal: controller.signal,
    timedOut: () => expired,
    dispose: () => {
      clearTimeout(timer)
      caller?.removeEventListener('abort', forwardAbort)
    },
  }
}

/**
 * Nest's error body: `{ statusCode, error, message }` where `message` is a
 * string for an `HttpException` and an array of strings for a
 * `ValidationPipe` failure.
 */
interface ErrorBody {
  message?: unknown
  error?: unknown
}

const messagesFrom = (payload: unknown): string[] => {
  if (typeof payload === 'string') return [payload]
  if (!Array.isArray(payload)) return []

  return payload.filter((entry): entry is string => typeof entry === 'string')
}

const composeUrl = (path: string, query?: Record<string, string | number | undefined>): string => {
  const suffix = path.startsWith('/') ? path : `/${path}`
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }

  const queryString = search.toString()
  return `${API_BASE_URL}${suffix}${queryString ? `?${queryString}` : ''}`
}

const parseBody = async (response: Response): Promise<unknown> => {
  if (response.status === 204 || response.status === 205) return undefined

  const text = await response.text()
  if (text.length === 0) return undefined

  try {
    return JSON.parse(text) as unknown
  } catch (cause) {
    throw new ApiError('The server returned a response we could not read.', {
      kind: 'unknown',
      status: response.status,
      cause,
    })
  }
}

/**
 * Performs one request and returns its parsed body.
 *
 * @throws {ApiError} for every failure, including a network failure and a
 * caller-initiated abort (which is re-thrown as the original `AbortError` so
 * callers can tell "I cancelled this" from "this failed").
 */
export const request = async <T>(
  path: string,
  { method = 'GET', body, signal, timeoutMs = REQUEST_TIMEOUT_MS, query, requestHeaders }: RequestOptions = {},
): Promise<ResponseBody<T>> => {
  const deadline = withDeadline(signal, timeoutMs)

  const headers: Record<string, string> = { Accept: 'application/json', ...requestHeaders }
  // The API runs `forbidNonWhitelisted`, so a request with a body must say so
  // and must not send `Content-Type` for the bodiless verbs.
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let response: Response
  try {
    response = await fetch(composeUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: deadline.signal,
      credentials: 'omit',
      mode: 'cors',
    })
  } catch (cause) {
    if (isAbortError(cause)) {
      if (deadline.timedOut()) {
        throw new ApiError('The request timed out.', { kind: 'timeout', cause })
      }
      // A deliberate cancellation: hand the original reason back untouched.
      throw cause
    }
    throw new ApiError('The studio could not be reached.', { kind: 'network', cause })
  } finally {
    deadline.dispose()
  }

  const payload = await parseBody(response)

  if (!response.ok) {
    const errorBody = (payload ?? {}) as ErrorBody
    const details = messagesFrom(errorBody.message)
    const single = details.length === 1 ? details[0] : undefined
    const kind: ApiErrorKind = kindForStatus(response.status)

    throw new ApiError(single ?? `Request failed with status ${response.status}`, {
      kind,
      status: response.status,
      details,
    })
  }

  return payload as ResponseBody<T>
}