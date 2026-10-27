import { apiGetOne, apiPost } from '@/lib/api/client'
import { API } from '@/lib/api/config'
import { ApiError, isApiError, toUserMessage } from '@/lib/api/errors'
import type { AuthSession, AuthUser, Credentials } from './authTypes'

/**
 * The two calls sign-in is made of.
 *
 * Neither builds a header: `client.ts` attaches the bearer token, so the token
 * obtained by {@link loginUser} is picked up automatically by the
 * {@link fetchCurrentUser} that follows it.
 */

const isAuthSession = (value: AuthSession | undefined): value is AuthSession =>
  typeof value?.accessToken === 'string' && value.accessToken.length > 0

export const loginUser = async (credentials: Credentials): Promise<AuthSession> => {
  const session = await apiPost<AuthSession>(API.login, credentials)

  if (!isAuthSession(session)) {
    throw new ApiError('The studio could not start a session.', { kind: 'unknown' })
  }

  return session
}

/**
 * The caller's own record.
 *
 * A contract check rather than trust: this response decides whether the app
 * treats the token as a session, so a body that is not a user must fail loudly
 * instead of rendering an account with every field blank.
 */
export const fetchCurrentUser = async (signal?: AbortSignal): Promise<AuthUser> => {
  const user = await apiGetOne<AuthUser>(API.me, { signal })

  if (typeof user?.id !== 'string' || user.id.length === 0) {
    throw new ApiError('Your account could not be loaded.', { kind: 'unknown' })
  }

  return user
}

/**
 * A sentence for a sign-in that was refused.
 *
 * The server answers `401` identically for an unknown email, a wrong password
 * and a suspended account — by design, so the form cannot be used to test which
 * addresses exist. Every branch below preserves that: nothing here names a
 * field the server did not name, and no status code or stack reaches the page.
 */
export const loginErrorMessage = (error: unknown): string => {
  if (isApiError(error)) {
    if (error.kind === 'unauthorized') return 'Email or password is incorrect.'
    if (error.kind === 'rateLimited')
      return 'Too many attempts just now. Give it a moment, then try again.'
    if (error.kind === 'validation')
      return error.details[0] ?? 'Check your email address and password and try again.'
  }

  return toUserMessage(error)
}
