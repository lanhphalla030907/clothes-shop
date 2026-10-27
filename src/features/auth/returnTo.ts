/**
 * A path this app is willing to send the shopper back to after signing in.
 *
 * The value arrives in `?from=`, so it is attacker-controlled by construction:
 * `//evil.example` or `https://…` would turn the login form into an open
 * redirect. Only a same-site path — one beginning with a single `/` — is
 * accepted, and anything else falls back to the dashboard.
 */
export const safeReturnTo = (value: string | null | undefined): string => {
  if (!value) return '/dashboard'
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/dashboard'

  return value
}
