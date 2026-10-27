/**
 * The shapes the auth endpoints actually return.
 *
 * Declared here rather than imported from the API's own types because these
 * describe *this caller's* identity: nothing else in the app may build or
 * narrow them, and `AuthProvider` is their only consumer.
 *
 * Dates are strings because that is what arrives over JSON — `Date` objects in
 * a response type would be a claim about the transport the transport does not
 * make.
 */

export type Role = 'CUSTOMER' | 'ADMIN'

/** `UserResponseDto`. Carries no password hash by construction. */
export interface AuthUser {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  status: string
  role: Role
  emailVerifiedAt: string | null
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Credentials {
  email: string
  password: string
}

/** `LoginResponseDto`: the credential, its lifetime, and who it identifies. */
export interface AuthSession {
  accessToken: string
  expiresIn: string
  user: AuthUser
}
