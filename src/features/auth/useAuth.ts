import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from './authContext'
import type { AuthUser } from './authTypes'

export const useAuth = (): AuthContextValue => {
  const value = useContext(AuthContext)
  if (value === null) throw new Error('useAuth must be used inside an AuthProvider')

  return value
}

/** `"Alex Morgan"` — the name to greet someone with, if there is one. */
export const displayName = (user: AuthUser | null): string => {
  if (!user) return ''
  return `${user.firstName} ${user.lastName}`.trim()
}
