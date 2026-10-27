import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation } from '@/hooks/useMutation'
import { createPayment } from './api'
import { PAYMENT_STATUS, type Payment, type UUID } from '@/types/api'

/**
 * One PayWay QR and the clock on it.
 *
 * Expiry comes from the response's `expiresAt` rather than a locally counted
 * `lifetimeMinutes`, so a backgrounded tab shows a dead code as dead.
 *
 * The payment is held against its order id and derived back out during render, so
 * navigating between orders cannot show one order's code on another.
 */

interface Held {
  orderId: UUID
  payment: Payment
  /** The provider handed back the same attempt we already held, still expired. */
  replayedExpired: boolean
}

export interface PaymentFlow {
  payment: Payment | undefined
  start: () => Promise<Payment | undefined>
  isStarting: boolean
  error: unknown
  /** Seconds until the QR stops working; `undefined` when it has no expiry. */
  secondsRemaining: number | undefined
  isExpired: boolean
  /** `PENDING` with a QR is the only state that means "scan this". */
  isScannable: boolean
  replayedExpired: boolean
  reset: () => void
}

const isExpiredByClock = (payment: Payment, now: number): boolean => {
  if (!payment.expiresAt) return false
  const expiry = Date.parse(payment.expiresAt)
  return Number.isFinite(expiry) && expiry <= now
}

export const usePayment = (orderId: UUID | undefined, autoStart = false): PaymentFlow => {
  const [held, setHeld] = useState<Held | undefined>(undefined)
  const [now, setNow] = useState(() => Date.now())

  const mutation = useMutation<[], Payment>(
    () => {
      if (!orderId) throw new Error('No order to pay for.')
      return createPayment(orderId)
    },
    {
      onSuccess: (created) => {
        const at = Date.now()
        setHeld((previous) => ({
          orderId: created.orderId,
          payment: created,
          replayedExpired:
            previous?.payment.paymentId === created.paymentId && isExpiredByClock(created, at),
        }))
        setNow(at)
      },
    },
  )

  // Derived, not reset: a different order id shows nothing rather than another
  // order's code.
  const mine = held?.orderId === orderId ? held : undefined
  const payment = mine?.payment
  const replayedExpired = mine?.replayedExpired ?? false

  const expiresAt = payment?.expiresAt ? Date.parse(payment.expiresAt) : Number.NaN

  const secondsRemaining = useMemo(() => {
    if (!Number.isFinite(expiresAt)) return undefined
    return Math.max(0, Math.round((expiresAt - now) / 1000))
  }, [expiresAt, now])

  // Only tick while there is a live countdown, so an open payment screen does not
  // re-render once a second forever.
  useEffect(() => {
    if (!Number.isFinite(expiresAt)) return undefined

    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [expiresAt])

  // One attempt per order id. The endpoint is idempotent, but asking once per
  // mount keeps the screen from spending a provider call it does not need.
  const autoStartedFor = useRef<UUID | undefined>(undefined)
  useEffect(() => {
    if (!autoStart || !orderId || payment || mutation.isPending) return
    if (autoStartedFor.current === orderId) return

    autoStartedFor.current = orderId
    void mutation.run()
  }, [autoStart, orderId, payment, mutation])

  const isExpired =
    payment?.status === PAYMENT_STATUS.EXPIRED ||
    (payment !== undefined && secondsRemaining === 0)
  const isScannable =
    payment?.status === PAYMENT_STATUS.PENDING && Boolean(payment.qrString) && !isExpired

  const reset = useCallback(() => {
    setHeld((previous) => (previous?.orderId === orderId ? undefined : previous))
    mutation.reset()
  }, [orderId, mutation])

  return {
    payment,
    start: mutation.run,
    isStarting: mutation.isPending,
    error: mutation.error,
    secondsRemaining,
    isExpired,
    isScannable,
    replayedExpired,
    reset,
  }
}

/** `m:ss`, for the countdown label. */
export const formatCountdown = (totalSeconds: number | undefined): string => {
  if (totalSeconds === undefined) return ''
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}