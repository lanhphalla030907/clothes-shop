import { useEffect, useState, type FormEvent } from 'react'
import { Action } from '@/components/ui/Action'
import { AuthLink, AuthShell } from '@/components/auth/AuthShell'
import { FormError, TextField } from '@/components/account/Field'
import {
  passwordResetRequestErrorMessage,
  requestPasswordReset,
} from '@/features/auth/api'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Matches the server's rate limit window, so a customer cannot retry too soon. */
const RESEND_COOLDOWN_SECONDS = 60

const FALLBACK_SUCCESS_MESSAGE =
  'If an account exists for that email, a password reset link has been sent.'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | undefined>(undefined)
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [hasRequested, setHasRequested] = useState(false)
  const [successMessage, setSuccessMessage] = useState(FALLBACK_SUCCESS_MESSAGE)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return undefined

    const timer = window.setTimeout(() => {
      setCooldown((remaining) => remaining - 1)
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [cooldown])

  const send = async (address: string) => {
    if (isPending) return

    setServerError(null)
    setIsPending(true)

    try {
      const message = await requestPasswordReset(address)
      setSuccessMessage(message)
      setHasRequested(true)
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (error) {
      setServerError(passwordResetRequestErrorMessage(error))
    } finally {
      setIsPending(false)
    }
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isPending) return

    const address = email.trim()

    if (address.length === 0) {
      setEmailError('Enter your email address.')
      return
    }
    if (!EMAIL_PATTERN.test(address)) {
      setEmailError('Enter a valid email address.')
      return
    }

    setEmailError(undefined)
    await send(address)
  }

  const onResend = () => {
    if (cooldown > 0 || isPending) return
    void send(email.trim())
  }

  const startOver = () => {
    setHasRequested(false)
    setCooldown(0)
    setServerError(null)
  }

  const resendLabel = isPending
    ? 'Sending…'
    : cooldown > 0
      ? `Resend in ${cooldown}s`
      : 'Resend link'

  return (
    <AuthShell
      eyebrow="Password reset"
      title={hasRequested ? 'Check your inbox' : 'Forgot your password?'}
      description={
        hasRequested
          ? 'If the address belongs to an account, a reset link is on its way. It can be used once and expires shortly.'
          : 'Enter the email address on your account and we will send a link to choose a new password.'
      }
      footer={
        <>
          Remembered it? <AuthLink to="/login">Back to sign in</AuthLink>
        </>
      }
    >
      {hasRequested ? (
        <div className="space-y-5">
          <div role="status" className="border border-line bg-bone px-5 py-5">
            <p className="text-[14.5px] leading-relaxed text-ink">{successMessage}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-graphite">
              The link expires in 15 minutes. If it does not arrive, check your spam folder or
              resend it below.
            </p>
          </div>

          {serverError !== null && <FormError message={serverError} />}

          <Action
            type="button"
            size="lg"
            className="w-full"
            onClick={onResend}
            disabled={isPending || cooldown > 0}
          >
            {resendLabel}
          </Action>

          <button
            type="button"
            onClick={startOver}
            className="w-full text-center text-[13px] font-medium text-graphite underline decoration-line underline-offset-4 transition-colors hover:text-ink hover:decoration-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Use a different email
          </button>
        </div>
      ) : (
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
            value={email}
            error={emailError}
            hint="We will send the link to this address."
            onChange={(event) => {
              setEmail(event.target.value)
              setEmailError(undefined)
              setServerError(null)
            }}
          />

          {serverError !== null && <FormError message={serverError} />}

          <Action type="submit" size="lg" className="w-full" disabled={isPending}>
            {isPending ? 'Sending link…' : 'Send reset link'}
          </Action>
        </form>
      )}
    </AuthShell>
  )
}
