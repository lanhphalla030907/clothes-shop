import { useEffect, useMemo, useState } from 'react'
import { useMutation } from '@/hooks/useMutation'
import { createPayment } from './api'
import type { Payment, UUID } from '@/types/api'

/**
 * One PayWay QR, and the clock on it.
 *
 * PayWay's QR expires. The response carries both `lifetimeMinutes` and an
 * `expiresAt`, and the countdown is computed from `expiresAt` against the local
 * clock rather than trusted as a fixed number of minutes — if the tab was
 * backgrounded for twenty minutes, the QR should already read as expired instead
 * of inviting a scan that is guaranteed to fail.
 *
 * When it lapses, the only correct action is a **new** payment: `createPayment`
 * makes a new attempt with a new `tran_id`. Re-showing the old QR would send the
 * shopper to a dead code.
 */

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
  reset: () => void
}

export const usePayment = (orderId: UUID | undefined): PaymentFlow => {
  const [payment, setPayment] = useState<Payment | undefined>(undefined)
  const [now, setNow] = useState(() => Date.now())

  const mutation = useMutation<[], Payment>(() => {
    if (!orderId) throw new Error('No order to pay for.')
    return createPayment(orderId)
  }, {
    onSuccess: (created) => {
      setPayment(created)
      setNow(Date.now())
    },
  })

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

  const isExpired = secondsRemaining === 0
  const isScannable = payment?.status === 'PENDING' && Boolean(payment.qrString) && !isExpired

  return {
    payment,
    start: mutation.run,
    isStarting: mutation.isPending,
    error: mutation.error,
    secondsRemaining,
    isExpired,
    isScannable,
    reset: () => {
      setPayment(undefined)
      mutation.reset()
    },
  }
}

/** `m:ss`, for the countdown label. */
export const formatCountdown = (totalSeconds: number | undefined): string => {
  if (totalSeconds === undefined) return ''
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
