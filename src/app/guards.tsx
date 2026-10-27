import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { Location } from 'react-router-dom'
import { RouteFallback } from '@/app/RouteFallback'
import { useAuth } from '@/features/auth/useAuth'

/** Where to sign in, and how to get back to what was being looked at. */
const signInPath = (location: Location): string =>
  `/login?from=${encodeURIComponent(`${location.pathname}${location.search}`)}`

/**
 * Everything under `/dashboard` requires a session.
 *
 * `isInitializing` renders the shared fallback rather than redirecting: the
 * token may be perfectly good and still being checked, and bouncing a signed-in
 * shopper to the sign-in form on every reload would be a visible defect.
 */
export function RequireAuth() {
  const { isInitializing, isAuthenticated } = useAuth()
  const location = useLocation()

  if (isInitializing) return <RouteFallback />
  if (!isAuthenticated) return <Navigate to={signInPath(location)} replace />

  return <Outlet />
}

/**
 * The same contract as {@link RequireAuth}, plus the role.
 *
 * An unauthenticated caller is offered sign-in — they may simply not be signed
 * in yet. A signed-in customer is sent to the storefront instead, because for
 * them the answer is "no" rather than "not yet", and offering to sign them in
 * again would suggest a different account might work.
 */
export function RequireAdmin() {
  const { isInitializing, isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (isInitializing) return <RouteFallback />
  if (!isAuthenticated) return <Navigate to={signInPath(location)} replace />
  if (user?.role !== 'ADMIN') return <Navigate to="/" replace />

  return <Outlet />
}
