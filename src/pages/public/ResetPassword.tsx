import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, Eye, EyeOff } from 'lucide-react'
import type { ReactNode } from 'react'
import { Action } from '@/components/ui/Action'
import { AuthLink, AuthShell } from '@/components/auth/AuthShell'
import { FormError, TextField } from '@/components/account/Field'
import { passwordResetErrorMessage, submitPasswordReset } from '@/features/auth/api'
import { isApiError } from '@/lib/api/errors'

const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 128

const INVALID_TOKEN_MESSAGE =
  'This password reset link is invalid or has expired. Request a new one.'

type Values = { newPassword: string; confirmPassword: string }
type Errors = Partial<Record<keyof Values, string>>
type Visible = { password: boolean; confirm: boolean }

const validate = ({ newPassword, confirmPassword }: Values): Errors => {
  const errors: Errors = {}

  if (newPassword.length === 0) errors.newPassword = 'Enter a new password.'
  else if (newPassword.length < MIN_PASSWORD_LENGTH)
    errors.newPassword = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  else if (newPassword.length > MAX_PASSWORD_LENGTH)
    errors.newPassword = `Password must be ${MAX_PASSWORD_LENGTH} characters or less.`

  if (confirmPassword.length === 0) errors.confirmPassword = 'Confirm your new password.'
  else if (confirmPassword !== newPassword)
    errors.confirmPassword = 'Passwords do not match.'

  return errors
}

const VisibilityToggle = ({
  visible,
  onToggle,
  label,
}: {
  visible: boolean
  onToggle: () => void
  label: string
}) => (
  <button
    type="button"
    onClick={onToggle}
    aria-label={visible ? `Hide ${label}` : `Show ${label}`}
    aria-pressed={visible}
    className="flex h-9 w-9 items-center justify-center text-graphite transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink"
  >
    {visible ? (
      <EyeOff size={16} strokeWidth={1.5} aria-hidden />
    ) : (
      <Eye size={16} strokeWidth={1.5} aria-hidden />
    )}
  </button>
)

const Requirement = ({ met, children }: { met: boolean; children: ReactNode }) => (
  <li
    className={`flex items-center gap-2 text-[12.5px] leading-relaxed ${
      met ? 'text-ink' : 'text-graphite'
    }`}
  >
    <Check
      size={13}
      strokeWidth={2}
      aria-hidden
      className={met ? 'text-ink' : 'opacity-30'}
    />
    {children}
  </li>
)

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = (searchParams.get('token') ?? '').trim()

  const [values, setValues] = useState<Values>({ newPassword: '', confirmPassword: '' })
  const [errors, setErrors] = useState<Errors>({})
  const [visible, setVisible] = useState<Visible>({ password: false, confirm: false })
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [isTokenRejected, setIsTokenRejected] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const update = (field: keyof Values) => (value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setServerError(null)
  }

  const toggleVisibility = (field: keyof Visible) => () => {
    setVisible((current) => ({ ...current, [field]: !current[field] }))
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isPending) return

    const next = validate(values)
    setErrors(next)
    if (next.newPassword !== undefined || next.confirmPassword !== undefined) return

    setServerError(null)
    setIsPending(true)

    try {
      const message = await submitPasswordReset({
        token,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      })
      setSuccessMessage(message)
      setValues({ newPassword: '', confirmPassword: '' })
    } catch (error) {
      const message = passwordResetErrorMessage(error)
      setServerError(message)

      // A `400` here means the token itself was refused — the password checks
      // above already ran locally, so retyping the password cannot help.
      if (isApiError(error) && (error.kind === 'validation' || error.kind === 'unauthorized')) {
        setIsTokenRejected(true)
      }
    } finally {
      setIsPending(false)
    }
  }

  if (token.length === 0 || isTokenRejected) {
    return (
      <AuthShell
        eyebrow="Password reset"
        title="This link cannot be used"
        description="Reset links are single-use and expire after 15 minutes. Request a fresh one to continue."
        footer={
          <>
            Remembered it? <AuthLink to="/login">Back to sign in</AuthLink>
          </>
        }
      >
        <div className="space-y-5">
          <FormError message={serverError ?? INVALID_TOKEN_MESSAGE} />
          <Action to="/forgot-password" size="lg" className="w-full">
            Request a new link
          </Action>
        </div>
      </AuthShell>
    )
  }

  if (successMessage !== null) {
    return (
      <AuthShell
        eyebrow="Password reset"
        title="Password updated"
        description="Your new password is ready. Sign in with it to return to your account."
        footer={
          <>
            Need a hand? <AuthLink to="/forgot-password">Request another link</AuthLink>
          </>
        }
      >
        <div className="space-y-5">
          <div role="status" className="border border-line bg-bone px-5 py-5">
            <p className="text-[14.5px] leading-relaxed text-ink">{successMessage}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-graphite">
              Every other reset link for this account has been cancelled.
            </p>
          </div>
          <Action to="/login" size="lg" className="w-full">
            Sign in
          </Action>
        </div>
      </AuthShell>
    )
  }

  const lengthMet =
    values.newPassword.length >= MIN_PASSWORD_LENGTH &&
    values.newPassword.length <= MAX_PASSWORD_LENGTH
  const matchMet =
    values.confirmPassword.length > 0 && values.confirmPassword === values.newPassword

  return (
    <AuthShell
      eyebrow="Password reset"
      title="Choose a new password"
      description="Set a password for this account. The reset link works once and expires 15 minutes after it was sent."
      footer={
        <>
          Remembered it? <AuthLink to="/login">Back to sign in</AuthLink>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <TextField
          label="New password"
          name="newPassword"
          type={visible.password ? 'text' : 'password'}
          autoComplete="new-password"
          required
          value={values.newPassword}
          error={errors.newPassword}
          onChange={(event) => update('newPassword')(event.target.value)}
          trailing={
            <VisibilityToggle
              visible={visible.password}
              onToggle={toggleVisibility('password')}
              label="new password"
            />
          }
        />

        <TextField
          label="Confirm new password"
          name="confirmPassword"
          type={visible.confirm ? 'text' : 'password'}
          autoComplete="new-password"
          required
          value={values.confirmPassword}
          error={errors.confirmPassword}
          onChange={(event) => update('confirmPassword')(event.target.value)}
          trailing={
            <VisibilityToggle
              visible={visible.confirm}
              onToggle={toggleVisibility('confirm')}
              label="confirm password"
            />
          }
        />

        <ul aria-label="Password requirements" className="space-y-1.5">
          <Requirement met={lengthMet}>
            At least {MIN_PASSWORD_LENGTH} characters
          </Requirement>
          <Requirement met={matchMet}>Both passwords match</Requirement>
        </ul>

        {serverError !== null && <FormError message={serverError} />}

        <Action type="submit" size="lg" className="w-full" disabled={isPending}>
          {isPending ? 'Updating password…' : 'Update password'}
        </Action>
      </form>
    </AuthShell>
  )
}
