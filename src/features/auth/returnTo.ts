import type { Role } from './authTypes'

/** The landing screen for a signed-in customer. */
const CUSTOMER_HOME = '/dashboard'

/** The landing screen for a signed-in administrator. */
const ADMIN_HOME = '/admin'

/** The landing screen for a signed-in delivery staff member. */
const DELIVERY_STAFF_HOME = '/delivery'

/**
 * The screen a signed-in account should land on.
 *
 * The role comes from `/auth/me`, never from the token claims, so this is the
 * same authority the backend uses to authorise a request. An unknown role is
 * treated as a customer rather than as an administrator.
 */
export const landingPathFor = (role: Role | null | undefined): string =>
  role === 'ADMIN'
    ? ADMIN_HOME
    : role === 'DELIVERY_STAFF'
      ? DELIVERY_STAFF_HOME
      : CUSTOMER_HOME

/** A same-site absolute path, and not the protocol-relative `//host` form. */
const isSafePath = (value: string): boolean =>
  value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\')

/** The pathname of a `?from=` value, ignoring query, fragment and trailing slashes. */
const normalisedPathname = (value: string): string => {
  const pathname = value.split(/[?#]/, 1)[0] ?? value
  const withoutTrailingSlash = pathname.replace(/\/+$/, '')

  return (withoutTrailingSlash === '' ? '/' : withoutTrailingSlash).toLowerCase()
}

const isAuthPath = (pathname: string): boolean =>
  pathname === '/login' || pathname === '/register'

const isAdminPath = (pathname: string): boolean =>
  pathname === '/admin' || pathname.startsWith('/admin/')

const isDeliveryPath = (pathname: string): boolean =>
  pathname === '/delivery' || pathname.startsWith('/delivery/')

/** The signed-in customer account area. */
const isCustomerAccountPath = (pathname: string): boolean =>
  pathname === '/dashboard' || pathname.startsWith('/dashboard/')

/**
 * A path this app is willing to send the shopper back to after signing in.
 *
 * The value arrives in `?from=`, so it is attacker-controlled by construction:
 * `//evil.example` or `https://…` would turn the login form into an open
 * redirect. Only a same-site path is accepted.
 *
 * The destination is also checked against the role `/auth/me` reported:
 *
 * - a customer is never sent into `/admin`, because that would only bounce off
 *   the admin guard;
 * - only delivery staff are returned to `/delivery`;
 * - delivery staff are never sent into `/admin`;
 * - an administrator is not returned to `/dashboard` after signing in, because
 *   that is the customer landing screen. This is the common `?from=/dashboard`
 *   path created when someone opens the customer account while signed out;
 * - the sign-in pages themselves are refused, because returning to `/login`
 *   after a successful sign-in is a redirect loop;
 * - everything else falls back to the account's own landing screen.
 */
export const safeReturnTo = (
  value: string | null | undefined,
  role: Role | null | undefined,
): string => {
  const fallback = landingPathFor(role)
  if (!value || !isSafePath(value)) return fallback

  const pathname = normalisedPathname(value)
  if (isAuthPath(pathname)) return fallback
  if (role === 'ADMIN' && isCustomerAccountPath(pathname)) return fallback
  if (isAdminPath(pathname) && role !== 'ADMIN') return fallback
  if (isDeliveryPath(pathname) && role !== 'DELIVERY_STAFF') return fallback

  return value
}
