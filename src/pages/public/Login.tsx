import { useState, type FormEvent } from 'react'
import { Navigate, Link, useSearchParams } from 'react-router-dom'
import { RouteFallback } from '@/app/RouteFallback'
import { Action } from '@/components/ui/Action'
import { AuthLink, AuthShell } from '@/components/auth/AuthShell'
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton'
import { FormError, TextField } from '@/components/account/Field'
import { useAuth } from '@/features/auth/useAuth'
import { safeReturnTo } from '@/features/auth/returnTo'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Values = { email: string; password: string }
type Errors = { email?: string; password?: string }

const validate = ({ email, password }: Values): Errors => {
  const errors: Errors = {}
  const address = email.trim()

  if (address.length === 0) errors.email = 'Enter your email address.'
  else if (!EMAIL_PATTERN.test(address)) errors.email = 'Enter a valid email address.'

  if (password.length === 0) errors.password = 'Enter your password.'

  return errors
}

export default function Login() {
  const { login, isLoginPending, loginError, isAuthenticated, isInitializing, user } = useAuth()
  const [searchParams] = useSearchParams()
  const returnTo = safeReturnTo(searchParams.get('from'), user?.role)

  const [values, setValues] = useState<Values>({ email: '', password: '' })
  const [errors, setErrors] = useState<Errors>({})

  if (isInitializing) return <RouteFallback />
  if (isAuthenticated) return <Navigate to={returnTo} replace />

  const update = (field: keyof Values) => (value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const next = validate(values)
    setErrors(next)
    if (next.email !== undefined || next.password !== undefined) return

    await login(values.email.trim(), values.password)
  }

  return (
    <AuthShell
      eyebrow="Sign in"
      title="Welcome back"
      description="Your orders, saved pieces and bag are kept against your account on the studio server."
      footer={
        <>
          New to the studio? <AuthLink to="/register">Create an account</AuthLink>
        </>
      }
    >
      <div className="space-y-5">
        {/* 3. FORM GOES LAST (BOTTOM) */}
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <TextField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            value={values.email}
            error={errors.email}
            onChange={(event) => update('email')(event.target.value)}
          />

          <TextField
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={values.password}
            error={errors.password}
            onChange={(event) => update('password')(event.target.value)}
          />

          <div className="-mt-2 flex justify-end">
            <Link
              to="/forgot-password"
              className="text-[13px] font-medium text-graphite underline decoration-line underline-offset-4 transition-colors hover:text-ink hover:decoration-ink"
            >
              Forgot password?
            </Link>
          </div>

          {loginError !== null && <FormError message={loginError} />}

          <Action type="submit" size="lg" className="w-full" disabled={isLoginPending}>
            {isLoginPending ? 'Signing in…' : 'Sign in'}
          </Action>
        </form>
        <div className="relative my-4 flex items-center justify-center">
          <div className="flex-1 border-t border-line" />
          <span className="shrink-0 whitespace-nowrap bg-canvas px-3 text-[10px] font-mono tracking-widest uppercase text-graphite/70">
            Or continue with email
          </span>
          <div className="flex-1 border-t border-line" />
        </div>
         <GoogleAuthButton mode="signin" />
      </div>
    </AuthShell>
  )
}