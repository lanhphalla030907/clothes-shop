import { apiGetOne, apiPost } from '@/lib/api/client'
import { API } from '@/lib/api/config'
import { ApiError, isApiError, toUserMessage } from '@/lib/api/errors'
import type { AuthSession, AuthUser, Credentials, RegisterInput } from './authTypes'
export type { AuthSession, AuthUser, Credentials, RegisterInput }

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

export const loginWithGoogle = async (idToken: string, nonce?: string): Promise<AuthSession> => {
  const session = await apiPost<AuthSession>(API.googleLogin, { idToken, nonce })

  if (!isAuthSession(session)) {
    throw new ApiError('The studio could not start a session.', { kind: 'unknown' })
  }

  return session
}

export interface UserIdentity {
  id: string
  provider: string
  createdAt: string
}

export const linkGoogleIdentity = async (
  idToken: string,
  nonce?: string,
): Promise<{ success: boolean; provider: string }> => {
  const result = await apiPost<{ success: boolean; provider: string }>(API.linkGoogle, { idToken, nonce })
  if (result === undefined) {
    throw new ApiError('Google account linking could not be completed.', { kind: 'unknown' })
  }
  return result
}

export const fetchLinkedIdentities = async (): Promise<UserIdentity[]> => {
  const identities = await apiGetOne<UserIdentity[]>(API.identities)
  return Array.isArray(identities) ? identities : []
}

export const registerUser = async (input: RegisterInput): Promise<AuthUser> => {
  const user = await apiPost<AuthUser>(API.register, input)
  if (user === undefined) {
    throw new ApiError('Registration could not be completed.', { kind: 'unknown' })
  }
  return user
}

/** The message the API answers both password-reset calls with. */
interface PasswordResetMessage {
  message?: string
}

/**
 * Asks for a reset link.
 *
 * The server answers identically whether or not the address belongs to an
 * account, so this function returns nothing about existence. `undefined` means
 * the server broke its contract, not that the address was unknown.
 */
export const requestPasswordReset = async (email: string): Promise<string> => {
  const result = await apiPost<PasswordResetMessage>(API.forgotPassword, { email })

  if (result === undefined || typeof result.message !== 'string' || result.message.length === 0) {
    throw new ApiError('The reset request could not be completed.', { kind: 'unknown' })
  }

  return result.message
}

/** Completes a reset with the token from the emailed link. */
export const submitPasswordReset = async (input: {
  token: string
  newPassword: string
  confirmPassword: string
}): Promise<string> => {
  const result = await apiPost<PasswordResetMessage>(API.resetPassword, input)

  if (result === undefined || typeof result.message !== 'string' || result.message.length === 0) {
    throw new ApiError('The password could not be reset.', { kind: 'unknown' })
  }

  return result.message
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
    if (error.kind === 'unauthorized') return error.details[0] ?? 'Email or password is incorrect.'
    if (error.kind === 'conflict')
      return error.details[0] ?? 'Sign-in failed due to an account conflict.'
    if (error.kind === 'rateLimited')
      return 'Too many attempts just now. Give it a moment, then try again.'
    if (error.kind === 'validation')
      return error.details[0] ?? 'Check your email address and password and try again.'
  }

  return toUserMessage(error)
}

export const registerErrorMessage = (error: unknown): string => {
  if (isApiError(error)) {
    if (error.kind === 'conflict') {
      return error.details[0] ?? 'An account with this email already exists.'
    }
    if (error.kind === 'rateLimited')
      return 'Too many attempts just now. Give it a moment, then try again.'
    if (error.kind === 'validation')
      return error.details[0] ?? 'Check the details you entered and try again.'
  }

  return toUserMessage(error)
}

const PASSWORD_RESET_UNAVAILABLE_MESSAGE =
  'Password reset is temporarily unavailable. Please try again later.'

/** A sentence for a reset request that was refused. */
export const passwordResetRequestErrorMessage = (error: unknown): string => {
  if (isApiError(error)) {
    if (error.kind === 'unavailable')
      return error.details[0] ?? PASSWORD_RESET_UNAVAILABLE_MESSAGE
    if (error.kind === 'rateLimited')
      return 'Too many reset requests just now. Give it a minute, then try again.'
    if (error.kind === 'validation')
      return error.details[0] ?? 'Check your email address and try again.'
  }

  return toUserMessage(error)
}

/**
 * A sentence for a reset that was refused.
 *
 * The server deliberately uses one message for invalid, expired, already-used
 * and concurrently-consumed tokens, so every `400` reads the same here too.
 */
export const passwordResetErrorMessage = (error: unknown): string => {
  if (isApiError(error)) {
    if (error.kind === 'validation' || error.kind === 'unauthorized')
      return error.details[0] ?? 'This password reset link is invalid or has expired.'
    if (error.kind === 'unavailable')
      return error.details[0] ?? PASSWORD_RESET_UNAVAILABLE_MESSAGE
    if (error.kind === 'rateLimited')
      return 'Too many attempts just now. Give it a moment, then try again.'
  }

  return toUserMessage(error)
}
