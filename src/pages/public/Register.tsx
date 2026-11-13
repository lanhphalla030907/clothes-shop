import { useState, type FormEvent } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { Action } from '@/components/ui/Action'
import { AuthLink, AuthShell } from '@/components/auth/AuthShell'
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton'
import { FormError, TextField } from '@/components/account/Field'
import { registerUser, registerErrorMessage } from '@/features/auth/api'
import { useAuth } from '@/features/auth/useAuth'
import { useFeedback } from '@/context/feedbackContext'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Values = {
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
}

type Errors = Partial<Record<keyof Values, string>>

const validate = ({ firstName, lastName, email, password, confirmPassword }: Values): Errors => {
  const errors: Errors = {}
  const first = firstName.trim()
  const last = lastName.trim()
  const address = email.trim()

  if (first.length === 0) errors.firstName = 'Enter your first name.'
  else if (first.length < 2) errors.firstName = 'First name must be at least 2 characters.'

  if (last.length === 0) errors.lastName = 'Enter your last name.'
  else if (last.length < 2) errors.lastName = 'Last name must be at least 2 characters.'

  if (address.length === 0) errors.email = 'Enter your email address.'
  else if (!EMAIL_PATTERN.test(address)) errors.email = 'Enter a valid email address.'

  if (password.length === 0) errors.password = 'Enter a password.'
  else if (password.length < 8) errors.password = 'Password must be at least 8 characters.'
  else if (password.length > 128) errors.password = 'Password must be 128 characters or less.'

  if (confirmPassword.length === 0) errors.confirmPassword = 'Confirm your password.'
  else if (confirmPassword !== password) errors.confirmPassword = 'Passwords do not match.'

  return errors
}

export default function Register() {
  const navigate = useNavigate()
  const { showFeedback } = useFeedback()
  const { isAuthenticated } = useAuth()

  const [values, setValues] = useState<Values>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<Errors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const update = (field: keyof Values) => (value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setServerError(null)
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isPending) return

    const next = validate(values)
    setErrors(next)
    if (
      next.firstName !== undefined ||
      next.lastName !== undefined ||
      next.email !== undefined ||
      next.password !== undefined ||
      next.confirmPassword !== undefined
    ) {
      return
    }

    setIsPending(true)
    setServerError(null)

    try {
      await registerUser({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        password: values.password,
      })
      showFeedback({
        type: 'success',
        title: 'Account created',
        message: 'Your account is ready. Sign in to continue.',
      })
      navigate('/login', { replace: true })
    } catch (error) {
      setServerError(registerErrorMessage(error))
    } finally {
      setIsPending(false)
    }
  }

  if (isAuthenticated) return <Navigate to="/account" replace />

  return (
    <AuthShell
      eyebrow="Create account"
      title="Open an account"
      description="Track orders, keep a wishlist and store delivery addresses. Registration takes a minute."
      footer={
        <>
          Already have an account? <AuthLink to="/login">Sign in</AuthLink>
        </>
      }
    >
      <div className="space-y-5">
        {/* 3. FORM GOES LAST (BOTTOM) */}
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <TextField
              label="First name"
              name="firstName"
              autoComplete="given-name"
              required
              value={values.firstName}
              error={errors.firstName}
              onChange={(event) => update('firstName')(event.target.value)}
            />
            <TextField
              label="Last name"
              name="lastName"
              autoComplete="family-name"
              required
              value={values.lastName}
              error={errors.lastName}
              onChange={(event) => update('lastName')(event.target.value)}
            />
          </div>

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
            autoComplete="new-password"
            required
            hint="At least 8 characters."
            value={values.password}
            error={errors.password}
            onChange={(event) => update('password')(event.target.value)}
          />

          <TextField
            label="Confirm password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={values.confirmPassword}
            error={errors.confirmPassword}
            onChange={(event) => update('confirmPassword')(event.target.value)}
          />

          {serverError !== null && <FormError message={serverError} />}
          
          <Action type="submit" size="lg" className="w-full" disabled={isPending}>
            {isPending ? 'Creating account…' : 'Create account'}
          </Action>
        </form>
        <div className="relative my-4 flex items-center justify-center">
          <div className="flex-1 border-t border-line" />
          <span className="shrink-0 whitespace-nowrap bg-canvas px-3 text-[10px] font-mono tracking-widest uppercase text-graphite/70">
            Or register with email
          </span>
          <div className="flex-1 border-t border-line" />
        </div>
        <GoogleAuthButton mode="signup" />
      </div>
    </AuthShell>
  )
}