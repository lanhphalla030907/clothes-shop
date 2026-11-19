/**
 * The one customer-facing wording for a protected action attempted without a
 * session. Centralising it keeps the dialog, the session-expired notice and the
 * focused tests from drifting apart.
 */
export const LOGIN_REQUIRED = {
  title: 'Sign in required',
  message: 'Please sign in to your account to continue.',
  action: 'Sign In',
} as const
