import { createContext } from 'react'
import type { AuthUser } from './authTypes'

export interface AuthContextValue {
  /** The signed-in account, or `null` when there is no session. */
  user: AuthUser | null
  /** A stored token is being checked against `GET /auth/me`. */
  isInitializing: boolean
  isAuthenticated: boolean
  /** A sign-in attempt is in flight; used to refuse a second submit. */
  isLoginPending: boolean
  /** A customer-facing sentence for the last failed sign-in, or `null`. */
  loginError: string | null
  /** Resolves `true` only once the user is established, not merely accepted. */
  login: (email: string, password: string) => Promise<boolean>
  /** Forgets the token and the user. The API has no logout endpoint to call. */
  logout: () => void
}

/** `null` until `AuthProvider` is mounted, which `useAuth` turns into a clear error. */
export const AuthContext = createContext<AuthContextValue | null>(null)
