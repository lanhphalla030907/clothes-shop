import type { ISODateTime, MoneyString, UUID } from './common'

/**
 * `POST /orders/:orderId/payments`.
 *
 * The request body is **empty by contract**, and that is the security property:
 * the amount charged is the order's own total in the order's own currency, both
 * already computed by checkout. There is deliberately no request type here — a
 * client cannot send an amount because there is nothing to send one in.
 *
 * What comes back is safe by construction: no hash, no API key, no raw provider
 * response. The PayWay API key lives only on the server and is never exposed to
 * a browser.
 */

/** A payment *attempt*, not a payment method. An order may have several. */
export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  EXPIRED: 'EXPIRED',
} as const

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS]

export interface Payment {
  paymentId: UUID
  orderId: UUID
  /** PayWay's `tran_id`. Shown to support, echoed for reconciliation. */
  transactionId: string
  /** `PENDING` with a QR is the only combination that means "scan this". */
  status: PaymentStatus
  /** Amount being collected, rendered with the currency's own precision. */
  amount: MoneyString
  /** ISO 4217 code. Never something the client chose. */
  currency: string
  /** PayWay's KHQR payload — the string a banking app reads. */
  qrString: string
  /** PayWay's PNG rendering of {@link qrString}, when it supplied one. */
  qrImage?: string
  /** Deep link that opens ABA Mobile directly, when supplied. */
  abapayDeeplink?: string
  /** QR lifetime in minutes, so the UI can count down instead of guessing. */
  lifetimeMinutes?: number
  /** When the QR stops working, ISO-8601. */
  expiresAt?: ISODateTime
}

/** Orders whose status permits starting a payment. Mirrors `PAYABLE_ORDER_STATUS`. */
export const isOrderPayable = (orderStatus: string): boolean =>
  orderStatus === 'PENDING'