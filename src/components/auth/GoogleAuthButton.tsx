import { useContext, useEffect, useRef, useState } from 'react'
import { AuthContext } from '@/features/auth/authContext'
import { linkGoogleIdentity, loginErrorMessage } from '@/features/auth/api'
import { useFeedback } from '@/context/feedbackContext'

interface GoogleAuthButtonProps {
  mode: 'signin' | 'signup' | 'link'
  onSuccess?: () => void
  onError?: (message: string) => void
  disabled?: boolean
  className?: string
}

const GIS_MIN_WIDTH = 200
const GIS_MAX_WIDTH = 400
const clampWidth = (w: number) =>
  Math.min(Math.max(Math.floor(w), GIS_MIN_WIDTH), GIS_MAX_WIDTH)

export function GoogleAuthButton({
  mode,
  onSuccess,
  onError,
  disabled = false,
  className = '',
}: GoogleAuthButtonProps) {
  const auth = useContext(AuthContext)
  const loginWithGoogle = auth?.loginWithGoogle
  const isLoginPending = auth?.isLoginPending ?? false

  const { showFeedback } = useFeedback()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const buttonContainerRef = useRef<HTMLDivElement>(null)

  // Keep latest callbacks in refs so the GIS effect doesn't re-run on every parent render
  const onSuccessRef = useRef(onSuccess)
  const onErrorRef = useRef(onError)
  const showFeedbackRef = useRef(showFeedback)
  useEffect(() => {
    onSuccessRef.current = onSuccess
    onErrorRef.current = onError
    showFeedbackRef.current = showFeedback
  }, [onSuccess, onError, showFeedback])

  const [isGsiLoaded, setIsGsiLoaded] = useState(
    () => typeof window !== 'undefined' && Boolean(window.google?.accounts?.id),
  )
  const [isGsiRendered, setIsGsiRendered] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isLinking, setIsLinking] = useState(false)
  const [containerWidth, setContainerWidth] = useState(0)

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()

  // Declared BEFORE any handler that reads it (fixes TDZ / "used before declaration")
  const isPending = isLoginPending || isLinking

  const label =
    mode === 'signup'
      ? 'Sign up with Google'
      : mode === 'link'
        ? 'Connect Google account'
        : 'Continue with Google'

  // 1. Load Google Identity Services script
  useEffect(() => {
    if (typeof window === 'undefined' || isGsiLoaded) return

    if (!document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = () => setIsGsiLoaded(true)
      document.head.appendChild(script)
    }

    const interval = setInterval(() => {
      if (window.google?.accounts?.id) {
        setIsGsiLoaded(true)
        clearInterval(interval)
      }
    }, 100)

    const timeout = setTimeout(() => {
      clearInterval(interval)
    }, 5000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [isGsiLoaded])

  // 2. Track container width so the GIS button re-renders when the layout changes
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return

    const update = () => setContainerWidth(el.clientWidth)
    // Kick once on mount (in case ResizeObserver fires async)
    const raf = requestAnimationFrame(update)

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update)
      return () => {
        cancelAnimationFrame(raf)
        window.removeEventListener('resize', update)
      }
    }

    const ro = new ResizeObserver(update)
    ro.observe(el)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  // 3. Initialize GIS + render button (re-runs when width changes)
  useEffect(() => {
    if (!isGsiLoaded || !clientId || !buttonContainerRef.current) return
    if (containerWidth === 0) return // wait for layout

    let cancelled = false

    try {
      window.google?.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          if (!response.credential) {
            const err = 'No credentials received from Google.'
            setActionError(err)
            onErrorRef.current?.(err)
            return
          }

          setActionError(null)

          if (mode === 'link') {
            setIsLinking(true)
            try {
              await linkGoogleIdentity(response.credential)
              showFeedbackRef.current({
                type: 'success',
                title: 'Google account linked',
                message: 'Your Google identity has been successfully connected.',
              })
              onSuccessRef.current?.()
            } catch (error) {
              const msg = loginErrorMessage(error)
              setActionError(msg)
              onErrorRef.current?.(msg)
              showFeedbackRef.current({
                type: 'error',
                title: 'Linking failed',
                message: msg,
              })
            } finally {
              setIsLinking(false)
            }
          } else {
            try {
              if (!loginWithGoogle) {
                onErrorRef.current?.('Authentication provider not available.')
                return
              }
              const ok = await loginWithGoogle(response.credential)
              if (ok) {
                onSuccessRef.current?.()
              } else {
                onErrorRef.current?.('Authentication was not completed.')
              }
            } catch (error) {
              const msg = loginErrorMessage(error)
              setActionError(msg)
              onErrorRef.current?.(msg)
            }
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      })

      // Reset previous render
      buttonContainerRef.current.innerHTML = ''
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset render state before reinitializing external GSI button
      setIsGsiRendered(false)

      const buttonWidth = clampWidth(containerWidth)

      window.google?.accounts.id.renderButton(buttonContainerRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: mode === 'signup' ? 'signup_with' : 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: buttonWidth,
      })

      // GIS renderButton is synchronous — check immediately, plus a short retry
      const checkIframe = () => {
        if (cancelled) return
        const el = buttonContainerRef.current
        if (el && (el.childElementCount > 0 || el.querySelector('iframe'))) {
          setIsGsiRendered(true)
        }
      }
      checkIframe()
      const renderTimer = setTimeout(checkIframe, 300)

      return () => {
        cancelled = true
        clearTimeout(renderTimer)
      }
    } catch {
      // Graceful fallback if GIS render fails
      setIsGsiRendered(false)
    }
  }, [isGsiLoaded, clientId, mode, containerWidth, loginWithGoogle])

  const handleClickFallback = () => {
    if (disabled || isPending) return
    setActionError(null)
    if (window.google?.accounts?.id && clientId) {
      window.google.accounts.id.prompt()
    }
  }

  // Handle missing Client ID
  if (!clientId) {
    return (
      <div className={`space-y-2 ${className}`}>
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Google Client ID is not configured (missing VITE_GOOGLE_CLIENT_ID)"
          className="flex h-11 w-full items-center justify-center gap-3 border border-line bg-paper/60 px-4 text-[13px] font-medium text-graphite/60 cursor-not-allowed opacity-80"
        >
          <GoogleIcon className="grayscale opacity-50" />
          <span>{label} (Unavailable)</span>
        </button>
        <p className="text-[11px] text-graphite/70 text-center">
          Google authentication requires <code className="font-mono">VITE_GOOGLE_CLIENT_ID</code>.
        </p>
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/*
        wrapperRef measures the available width (up to 400px).
        The GIS iframe is rendered at that exact width and centered by flex.
        No `!w-full` override on the iframe — that's what was causing clipping.
      */}
      <div
        ref={wrapperRef}
        className="relative flex h-11 w-full max-w-[400px] mx-auto items-center justify-center"
      >
        <div
          ref={buttonContainerRef}
          className={`flex items-center justify-center ${
            disabled || isPending ? 'pointer-events-none opacity-50' : ''
          }`}
        />

        {/* Fallback shown only while GIS hasn't rendered its iframe yet */}
        {!isGsiRendered && (
          <button
            type="button"
            onClick={handleClickFallback}
            disabled={disabled || isPending}
            className="absolute inset-0 flex h-11 w-full items-center justify-center gap-3 border border-line bg-paper px-4 text-[13px] font-medium text-ink transition hover:bg-neutral-50 active:bg-neutral-100 disabled:opacity-60 cursor-pointer"
          >
            <GoogleIcon />
            <span>{isPending ? 'Connecting with Google…' : label}</span>
          </button>
        )}
      </div>

      {actionError && (
        <p className="text-[12px] text-rose-500 text-center font-medium" role="alert">
          {actionError}
        </p>
      )}
    </div>
  )
}

function GoogleIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`size-4.5 shrink-0 ${className}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  )
}