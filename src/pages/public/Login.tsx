import { useState, type FormEvent } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Action } from '@/components/ui/Action'
import { FormError, TextField } from '@/components/account/Field'
import { useAuth } from '@/features/auth/useAuth'
import { safeReturnTo } from '@/features/auth/returnTo'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Values = { email: string; password: string }
type Errors = { email?: string; password?: string }

/**
 * Client-side validation only decides whether it is worth sending the request.
 *
 * The server is still the authority — it revalidates and it is the only thing
 * that knows the password is wrong — so nothing here claims to have checked a
 * credential, and nothing here suppresses a server refusal.
 */
const validate = ({ email, password }: Values): Errors => {
  const errors: Errors = {}
  const address = email.trim()

  if (address.length === 0) errors.email = 'Enter your email address.'
  else if (!EMAIL_PATTERN.test(address)) errors.email = 'Enter a valid email address.'

  if (password.length === 0) errors.password = 'Enter your password.'

  return errors
}

/**
 * Sign in.
 *
 * A single centred column rather than a marketing split: there is one thing to
 * do here, and the form is it. On success the provider has already fetched
 * `/auth/me`, so this page hands over to `?from=` with a session that is
 * actually established rather than a token waiting to be proven.
 */
export default function Login() {
  const { login, isLoginPending, loginError, isAuthenticated } = useAuth()
  const [searchParams] = useSearchParams()
  const returnTo = safeReturnTo(searchParams.get('from'))

  const [values, setValues] = useState<Values>({ email: '', password: '' })
  const [errors, setErrors] = useState<Errors>({})

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
    <section className="container-editorial pt-28 pb-24 sm:pt-40 sm:pb-32">
      <div className="mx-auto w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-4"
        >
          <span className="h-px w-8 bg-line" aria-hidden />
          <span className="label-micro text-graphite">Account</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
          className="type-display mt-6 text-5xl leading-[0.88] sm:text-6xl"
        >
          Sign in
        </motion.h1>

        <p className="mt-5 max-w-sm text-sm leading-relaxed text-graphite">
          Your orders, your saved pieces and your bag are kept against your account on
          the studio server.
        </p>

        <form onSubmit={onSubmit} noValidate className="mt-10 space-y-5">
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

          {loginError !== null && <FormError message={loginError} />}

          <Action type="submit" size="lg" className="w-full" disabled={isLoginPending}>
            {isLoginPending ? 'Signing in…' : 'Sign in'}
          </Action>
        </form>
      </div>
    </section>
  )
}
