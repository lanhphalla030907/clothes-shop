import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { isApiError } from '@/lib/api/errors'
import { useFeedback } from '@/context/feedbackContext'
import { loginPathFor } from './returnTo'
import { LOGIN_REQUIRED } from './loginRequired'
import { refreshAccessToken } from '@/lib/api/refresh'
import {
  clearAccessToken,
  hasUsableAccessToken,
  onUnauthorized,
  readAccessToken,
  writeAccessToken,
} from '@/lib/api/session'
import { AuthContext, type AuthContextValue } from './authContext'
import {
  fetchCurrentUser,
  loginErrorMessage,
  loginUser,
  loginWithGoogle as loginWithGoogleApi,
  logoutSession,
} from './api'
import type { AuthUser } from './authTypes'

/**
 * Holds the session: the signed-in user, the attempt to sign in, and the single
 * place a token is written or cleared.
 *
 * ## Bootstrapping
 *
 * A token left in storage is *not* a session until the server agrees it is. The
 * provider therefore starts by asking `GET /auth/me`, and stays in
 * `isInitializing` until that answers — which is what stops a reload from
 * flashing the signed-out navigation before quietly signing the shopper back in.
 * A `401` there ends the attempt rather than raising an error: the credential is
 * simply over, and the app carries on signed out.
 *
 * ## One user at a time
 *
 * `AuthProvider` sits above the cart, wishlist and address providers and they
 * are remounted against its user id (see `App.tsx`), so the data of the account
 * that was signed in a moment ago cannot outlive it. This provider never holds
 * user-scoped state itself beyond `user`, which is replaced wholesale on sign-in
 * and dropped wholesale on sign-out.
 *
 * ## Logout
 *
 * `POST /auth/logout` revokes the refresh family and clears the HttpOnly
 * cookies. Local state is cleared whether or not that request succeeds, so an
 * offline shopper is never left staring at a signed-in interface.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { showFeedback, confirmFeedback } = useFeedback()
  const [user, setUser] = useState<AuthUser | null>(null)
  // A stored token means there is something to check, so the guards wait rather
  // than treating "not yet loaded" as "signed out".
  const [isInitializing, setIsInitializing] = useState(() => readAccessToken() !== null)
  const [isLoginPending, setIsLoginPending] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  /** A second submit in the same tick must not exchange credentials twice. */
  const loginInFlight = useRef(false)
  /** Guards the one sign-in dialog/notice created by a burst of 401s. */
  const loginRequiredInFlight = useRef(false)
  const sessionNoticeShown = useRef(false)
  const loginRedirectTarget = useRef<string | null>(null)
  /** A bootstrapping guest must not be told they were signed out. */
  const hadStoredSessionAtMount = useRef(readAccessToken() !== null)

  const navigate = useNavigate()
  const location = useLocation()
  const currentPath = `${location.pathname}${location.search}`
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register'

  const showSessionNotice = useCallback(() => {
    if (sessionNoticeShown.current) return
    sessionNoticeShown.current = true
    showFeedback({
      type: 'info',
      title: LOGIN_REQUIRED.title,
      message: LOGIN_REQUIRED.message,
    })
  }, [showFeedback])

  /**
   * One dialog, one redirect target. A burst of 401s from one page load must not
   * queue the same message repeatedly or navigate more than once.
   */
  const requireLogin = useCallback(
    (returnTo?: string) => {
      if (isInitializing || user !== null || isAuthPage || loginRequiredInFlight.current) return

      const target = loginPathFor(returnTo ?? currentPath)
      if (loginRedirectTarget.current === target) return
      loginRedirectTarget.current = target
      loginRequiredInFlight.current = true

      void Promise.resolve(
        confirmFeedback({
          type: 'info',
          title: LOGIN_REQUIRED.title,
          message: LOGIN_REQUIRED.message,
          confirmLabel: LOGIN_REQUIRED.action,
          cancelLabel: null,
        }),
      ).then((confirmed) => {
        loginRequiredInFlight.current = false
        if (confirmed === true) {
          navigate(target, { replace: true })
          return
        }
        loginRedirectTarget.current = null
      })
    },
    [confirmFeedback, currentPath, isAuthPage, isInitializing, navigate, user],
  )

  useEffect(() => {
    if (location.pathname === '/login') {
      loginRedirectTarget.current = null
      sessionNoticeShown.current = false
      loginRequiredInFlight.current = false
    }
  }, [location.pathname])

  useEffect(() => {
    let active = true

    const bootstrap = async (): Promise<void> => {
      // An absent or locally expired token is not proof of logout: the HttpOnly
      // refresh cookie may still be valid. Give it one chance first.
      if (!hasUsableAccessToken()) {
        const refreshed = await refreshAccessToken()
        if (!active) return
        if (!refreshed.ok) {
          setIsInitializing(false)
          return
        }
      }

      try {
        const me = await fetchCurrentUser()
        if (active) setUser(me)
      } catch (error: unknown) {
        if (!active) return
        if (error instanceof DOMException && error.name === 'AbortError') return
        // A 401 is terminal only after refresh has been given its chance.
        // Network failures leave the stored credential for a later reload.
        if (isApiError(error) && error.status === 401) {
          clearAccessToken()
          setUser(null)
        }
      } finally {
        if (active) setIsInitializing(false)
      }
    }

    void bootstrap()
    return () => {
      active = false
    }
  }, [])

  useEffect(
    () =>
      onUnauthorized(({ hadToken }) => {
        if (hadToken) {
          // The session ended on the server's say-so. Any protected screen is
          // redirected by its own guard; this notice is the only customer-facing
          // message. A first-visit refresh with no stored credential is not an
          // expired session, so stay quiet for that case.
          const wasKnownSession = user !== null || hadStoredSessionAtMount.current
          clearAccessToken()
          setUser(null)
          if (wasKnownSession) showSessionNotice()
          return
        }

        // No token: a guest tried a customer-only action. The shared dialog
        // explains why and offers the validated way back.
        requireLogin()
      }),
    [requireLogin, showSessionNotice, user],
  )

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    if (loginInFlight.current) return false
    loginInFlight.current = true
    setIsLoginPending(true)
    setLoginError(null)

    try {
      const session = await loginUser({ email, password })
      writeAccessToken(session.accessToken, session.expiresIn)

      // A token alone is not a session. The provider only reports success once
      // `/auth/me` has agreed, so a redirect never lands on a half-built one.
      try {
        setUser(await fetchCurrentUser())
        showFeedback({
          type: 'success',
          title: 'Signed in',
          message: 'You are signed in and your account is ready.',
        })
        return true
      } catch (identityError: unknown) {
        // Only an authentication failure invalidates what was just issued. A
        // dropped connection does not, and clearing it would throw away a good
        // token the next reload could have used.
        if (isApiError(identityError) && identityError.status === 401) {
          clearAccessToken()
          setUser(null)
        }
        setLoginError(loginErrorMessage(identityError))
        return false
      }
    } catch (error: unknown) {
      clearAccessToken()
      setUser(null)
      setLoginError(loginErrorMessage(error))
      return false
    } finally {
      loginInFlight.current = false
      setIsLoginPending(false)
    }
  }, [showFeedback])

  const loginWithGoogle = useCallback(
    async (idToken: string, nonce?: string): Promise<boolean> => {
      if (loginInFlight.current) return false
      loginInFlight.current = true
      setIsLoginPending(true)
      setLoginError(null)

      try {
        const session = await loginWithGoogleApi(idToken, nonce)
        writeAccessToken(session.accessToken, session.expiresIn)

        try {
          setUser(await fetchCurrentUser())
          showFeedback({
            type: 'success',
            title: 'Signed in with Google',
            message: 'You are signed in and your account is ready.',
          })
          return true
        } catch (identityError: unknown) {
          if (isApiError(identityError) && identityError.status === 401) {
            clearAccessToken()
            setUser(null)
          }
          setLoginError(loginErrorMessage(identityError))
          return false
        }
      } catch (error: unknown) {
        clearAccessToken()
        setUser(null)
        setLoginError(loginErrorMessage(error))
        return false
      } finally {
        loginInFlight.current = false
        setIsLoginPending(false)
      }
    },
    [showFeedback],
  )

  const logout = useCallback(async () => {
    try {
      await logoutSession()
    } catch {
      // Offline or refused logout must not strand the shopper in a signed-in UI.
    }
    clearAccessToken()
    setUser(null)
    setLoginError(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isInitializing,
      isAuthenticated: user !== null,
      isLoginPending,
      loginError,
      login,
      loginWithGoogle,
      logout,
      requireLogin,
    }),
    [user, isInitializing, isLoginPending, loginError, login, loginWithGoogle, logout, requireLogin],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
