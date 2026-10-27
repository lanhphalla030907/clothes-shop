import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { isApiError } from '@/lib/api/errors'
import {
  clearAccessToken,
  onUnauthorized,
  readAccessToken,
  writeAccessToken,
} from '@/lib/api/session'
import { AuthContext, type AuthContextValue } from './authContext'
import { fetchCurrentUser, loginErrorMessage, loginUser } from './api'
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
 * ## No logout request
 *
 * The API exposes no logout endpoint and a bearer token cannot be revoked by
 * asking for it. Forgetting it here ends the session on this device, which is
 * the full extent of what logout can honestly do — so nothing is faked.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  // A stored token means there is something to check, so the guards wait rather
  // than treating "not yet loaded" as "signed out".
  const [isInitializing, setIsInitializing] = useState(() => readAccessToken() !== null)
  const [isLoginPending, setIsLoginPending] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  /** A second submit in the same tick must not exchange credentials twice. */
  const loginInFlight = useRef(false)

  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    let active = true
    if (readAccessToken() === null) {
      const id = window.setTimeout(() => {
        if (active) setIsInitializing(false)
      }, 0)
      return () => {
        active = false
        window.clearTimeout(id)
      }
    }

    fetchCurrentUser().then(
      (me) => {
        if (!active) return
        setUser(me)
        setIsInitializing(false)
      },
      (error: unknown) => {
        if (!active) return
        // A cancellation is not an answer: the token may well still be good and
        // another mount of this provider will ask again.
        if (error instanceof DOMException && error.name === 'AbortError') return
        clearAccessToken()
        setUser(null)
        setIsInitializing(false)
      },
    )

    return () => {
      active = false
    }
  }, [])

  useEffect(
    () =>
      onUnauthorized(({ hadToken }) => {
        if (hadToken) {
          // The session ended on the server's say-so. Any protected screen is
          // redirected by its own guard, so no navigation is forced from here.
          clearAccessToken()
          setUser(null)
          return
        }

        // No token: this was a shopper doing something that needs an account,
        // such as saving a piece. Send them to sign in, and back afterwards.
        if (location.pathname === '/login') return
        const from = `${location.pathname}${location.search}`
        navigate(`/login?from=${encodeURIComponent(from)}`, { replace: true })
      }),
    [navigate, location.pathname, location.search],
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
  }, [])

  const logout = useCallback(() => {
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
      logout,
    }),
    [user, isInitializing, isLoginPending, loginError, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
