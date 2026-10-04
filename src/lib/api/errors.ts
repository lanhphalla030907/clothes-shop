/**
 * One error type for the whole API surface, and one place that decides what a
 * customer is told about it.
 *
 * Every transport failure — HTTP status, malformed body, timeout, DNS, offline —
 * leaves this module as an `ApiError`. Features therefore never branch on
 * `unknown`, never inspect a raw `Response`, and never surface a stack trace or
 * an internal message to a shopper.
 */

/** Broad buckets a caller can branch on. Deliberately coarser than HTTP codes. */
export type ApiErrorKind =
  /** The request never produced a response: offline, DNS, TLS, CORS. */
  | 'network'
  /** Client took too long, or was aborted on purpose. */
  | 'timeout'
  /** 400 — the request was rejected by validation. */
  | 'validation'
  /** 401 / 403 — the identity is missing, unknown or not permitted. */
  | 'unauthorized'
  /** 404 — absent, or not the caller's. The API deliberately conflates the two. */
  | 'notFound'
  /** 409 — well-formed, but conflicts with current state (stock, default slot). */
  | 'conflict'
  /** 429 — rate limited. */
  | 'rateLimited'
  /** 503 — a dependency is not configured or not reachable (e.g. PayWay). */
  | 'unavailable'
  /** 5xx — the server failed. */
  | 'server'
  /** Anything else, including a 2xx body that did not parse. */
  | 'unknown'

export interface ApiErrorInit {
  kind: ApiErrorKind
  status?: number
  /** Field-level messages from a `ValidationPipe` response, when present. */
  details?: string[]
  cause?: unknown
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | undefined
  readonly details: string[]

  constructor(message: string, { kind, status, details = [], cause }: ApiErrorInit) {
    super(message, cause === undefined ? undefined : { cause })
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
    this.details = details
  }

  /** True when retrying the same request could plausibly succeed. */
  get isRetryable(): boolean {
    return (
      this.kind === 'network' ||
      this.kind === 'timeout' ||
      this.kind === 'server' ||
      this.kind === 'rateLimited'
    )
  }
}

/** Narrows anything thrown inside a request to an `ApiError`. */
export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError

/** An abort is a caller decision, never a failure worth showing. */
export const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError'

export const kindForStatus = (status: number): ApiErrorKind => {
  if (status === 400 || status === 422) return 'validation'
  if (status === 401 || status === 403) return 'unauthorized'
  if (status === 404) return 'notFound'
  if (status === 409) return 'conflict'
  if (status === 429) return 'rateLimited'
  if (status === 503) return 'unavailable'
  if (status >= 500) return 'server'
  return 'unknown'
}

/**
 * A sentence a shopper can act on.
 *
 * The server's own message is preferred whenever it is a real sentence — it is
 * written for customers ("Cannot check out an empty cart") and carries the
 * domain truth this app cannot reconstruct. The fallbacks exist for the cases
 * where there is no usable message, and none of them leaks a status code, a
 * stack, or a URL.
 */
export const toUserMessage = (error: unknown): string => {
  if (isApiError(error)) {
    const serverMessage = error.message.trim()

    switch (error.kind) {
      case 'validation':
        return serverMessage || 'Some of the details are not valid. Check the form and try again.'
      case 'unauthorized':
        return 'This session is no longer recognised. Reload the page to start a new one.'
      case 'notFound':
        return serverMessage || 'We could not find that. It may have been removed.'
      case 'conflict':
        return serverMessage || 'That is no longer possible — something changed. Refresh and retry.'
      case 'rateLimited':
        return 'Too many requests just now. Give it a moment, then try again.'
      case 'unavailable':
        return serverMessage || 'Payments are unavailable right now. Please try again shortly.'
      case 'server':
        return 'Something went wrong on our side. Please try again.'
      case 'timeout':
        return 'That took too long. Check your connection and try again.'
      case 'network':
        return 'We could not reach the studio. Check your connection and try again.'
      default:
        return serverMessage || 'Something went wrong. Please try again.'
    }
  }

  if (isAbortError(error)) return 'The request was cancelled.'

  return 'Something went wrong. Please try again.'
}

/**
 * True when the failure means "this claimed identity is not a real user".
 *
 * The API answers 404 for an unknown `X-User-Id`, which is indistinguishable
 * from a genuinely absent resource — by design, so a caller cannot probe for
 * other users' data. Only the identity bootstrap may act on that, and only on
 * a read that is known to be user-scoped.
 */
export const isUnknownIdentity = (error: unknown): boolean =>
  isApiError(error) && error.kind === 'notFound'