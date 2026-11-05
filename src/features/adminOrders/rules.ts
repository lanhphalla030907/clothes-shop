import type {
  AdminOrderAddressFields,
  AdminOrderCodCollection,
  AdminOrderDetail,
  AdminOrderPayment,
  AdminOrderPagination,
  AdminOrderSummary,
  CodCollectionStatus,
  ISODateTime,
  OrderStatus,
  PaymentStatus,
} from '@/types/api'
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  administrativeLocationName,
} from '@/types/api'

/**
 * Rules and formatting shared by the admin order screens.
 *
 * The backend owns the transitions. These helpers only decide what the UI should
 * offer, using the same rules the service enforces: a `PENDING` order with no
 * verified payment may be cancelled, and a `CONFIRMED` order with a verified
 * payment may be shipped.
 */

export const ADMIN_ORDER_PAGE_SIZES = [10, 20, 50, 100] as const
export const DEFAULT_ADMIN_ORDER_PAGE_SIZE = 20

export const ORDER_STATUS_OPTIONS: readonly OrderStatus[] = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PROCESSING,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.CANCELLED,
]

const orderStatusLabels: Record<OrderStatus, string> = {
  [ORDER_STATUS.PENDING]: 'Awaiting payment',
  [ORDER_STATUS.CONFIRMED]: 'Confirmed',
  [ORDER_STATUS.PROCESSING]: 'Preparing',
  [ORDER_STATUS.SHIPPED]: 'Shipped',
  [ORDER_STATUS.DELIVERED]: 'Delivered',
  [ORDER_STATUS.CANCELLED]: 'Cancelled',
}

const paymentStatusLabels: Record<PaymentStatus, string> = {
  [PAYMENT_STATUS.UNPAID]: 'Unpaid',
  [PAYMENT_STATUS.PENDING]: 'Pending payment',
  [PAYMENT_STATUS.PAID]: 'Paid',
  [PAYMENT_STATUS.FAILED]: 'Failed',
  [PAYMENT_STATUS.EXPIRED]: 'Expired',
}

export const orderStatusLabel = (status: OrderStatus): string =>
  orderStatusLabels[status] ?? status

export const paymentStatusLabel = (status: PaymentStatus): string =>
  paymentStatusLabels[status] ?? status

/** A value that is safe to pass to the API as a one-based page number. */
export const parsePositivePage = (value: string | null): number => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1
}

/** Page size is capped by the backend; an unsupported value falls back. */
export const parsePageSize = (value: string | null): number => {
  const parsed = Number(value)
  return (ADMIN_ORDER_PAGE_SIZES as readonly number[]).includes(parsed)
    ? parsed
    : DEFAULT_ADMIN_ORDER_PAGE_SIZE
}

export const isOrderStatus = (value: string | null | undefined): value is OrderStatus =>
  (ORDER_STATUS_OPTIONS as readonly string[]).includes(value ?? '')

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/**
 * Accepts the `YYYY-MM-DD` a date input produces and rejects impossible dates.
 *
 * The DTO requires a full ISO-8601 timestamp with a separator, so the page sends
 * the boundaries of the operator's local day rather than a bare date. That makes
 * the filter agree with the local dates shown in the table.
 */
const parseDateOnly = (value: string): Date | undefined => {
  if (!DATE_ONLY.test(value)) return undefined

  const [year, month, day] = value.split('-').map(Number) as [
    number,
    number,
    number,
  ]
  const date = new Date(year, month - 1, day)

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined
  }

  return date
}

/** Inclusive start of the selected local day, as an ISO-8601 timestamp. */
export const toCreatedFromTimestamp = (value: string | null): ISODateTime | undefined => {
  const date = value !== null ? parseDateOnly(value) : undefined
  return date?.toISOString()
}

/** Inclusive end of the selected local day, as an ISO-8601 timestamp. */
export const toCreatedToTimestamp = (value: string | null): ISODateTime | undefined => {
  const date = value !== null ? parseDateOnly(value) : undefined
  if (date === undefined) return undefined

  date.setHours(23, 59, 59, 999)
  return date.toISOString()
}

/** A date input value that is safe to render, or `''`. */
export const safeDateParameter = (value: string | null): string =>
  value !== null && parseDateOnly(value) !== undefined ? value : ''

/** The most recent attempt is first in the detail response's payment array. */
export const latestPayment = (
  payments: readonly AdminOrderPayment[],
): AdminOrderPayment | null => payments[0] ?? null

export const hasVerifiedPayment = (
  payments: readonly Pick<AdminOrderPayment, 'status'>[],
): boolean => payments.some((payment) => payment.status === PAYMENT_STATUS.PAID)

/**
 * The order's payment status as an operator should read it.
 *
 * `hasPaidPayment` wins over the newest attempt: a later failed retry does not
 * undo an earlier verified payment. When no attempt has been paid, the newest
 * attempt's status is the useful answer, and `null` means nothing was started.
 *
 * For COD orders with no attempt, the UI shows `UNPAID` rather than `null`,
 * because "no attempt" and "cash on delivery" together mean the money has not
 * been collected yet. ABA_PAYWAY with no attempt still shows `null`, so the
 * existing "no payment started" presentation is preserved.
 */
export const effectivePaymentStatus = (
  hasPaidPayment: boolean,
  latestStatus: PaymentStatus | null,
  paymentMethod: string | null,
): PaymentStatus => {
  if (hasPaidPayment) return PAYMENT_STATUS.PAID
  if (latestStatus !== null) return latestStatus
  if (paymentMethod === 'COD') return PAYMENT_STATUS.UNPAID
  return PAYMENT_STATUS.PENDING
}

const codCollectionStatusLabels: Record<CodCollectionStatus, string> = {
  COLLECTED: 'Collected',
  NOT_COLLECTED: 'Not collected',
}

export const codCollectionStatusLabel = (status: CodCollectionStatus): string =>
  codCollectionStatusLabels[status] ?? status

/**
 * The COD collection status an operator should read, or `null` when the order is
 * unrelated to COD.
 *
 * A recorded collection always wins, because the row is financial evidence. For
 * a COD order with no row the answer is `NOT_COLLECTED`; a non-COD order with no
 * row gets `null` so no misleading "not collected" badge is rendered.
 */
export const effectiveCodCollectionStatus = (
  paymentMethod: string | null,
  collection: AdminOrderCodCollection | null | undefined,
): CodCollectionStatus | null => {
  if (collection?.status === 'COLLECTED') return 'COLLECTED'
  if (paymentMethod === 'COD') return 'NOT_COLLECTED'
  return null
}

/** Mirrors the server's cancellable rule, including the paid-payment guard. */
export const canCancelOrder = (
  order: Pick<AdminOrderSummary, 'status' | 'hasPaidPayment'>,
): boolean => order.status === ORDER_STATUS.PENDING && !order.hasPaidPayment

export const canConfirmCodOrder = (
  order: Pick<AdminOrderSummary, 'status' | 'paymentMethod'>,
): boolean =>
  order.status === ORDER_STATUS.PENDING && order.paymentMethod === 'COD'

/** Mirrors the server's method-aware shipping policy. */
export const canShipOrder = (
  order: Pick<AdminOrderSummary, 'status' | 'paymentMethod' | 'hasPaidPayment'>,
): boolean =>
  order.status === ORDER_STATUS.CONFIRMED &&
  (order.paymentMethod === 'COD' || order.hasPaidPayment)

/** Why an action is unavailable, using the same facts the API checks. */
export const cancelBlockedReason = (
  order: Pick<AdminOrderSummary, 'status' | 'hasPaidPayment'>,
): string | null => {
  if (canCancelOrder(order)) return null
  if (order.hasPaidPayment) {
    return 'This order has a verified payment. Cancellation would require a refund, which is not available here.'
  }
  if (order.status === ORDER_STATUS.PENDING) return null
  return `Only orders awaiting payment can be cancelled. This order is ${orderStatusLabel(order.status).toLowerCase()}.`
}

export const shipBlockedReason = (
  order: Pick<AdminOrderSummary, 'status' | 'paymentMethod' | 'hasPaidPayment'>,
): string | null => {
  if (canShipOrder(order)) return null
  if (
    order.status === ORDER_STATUS.CONFIRMED &&
    order.paymentMethod !== 'COD' &&
    !order.hasPaidPayment
  ) {
    return 'This order has no verified payment. Shipment is only available for paid orders.'
  }
  if (order.status === ORDER_STATUS.PENDING) {
    if (order.paymentMethod === 'COD') {
      return 'This COD order must be confirmed before it can be shipped.'
    }
    return 'This order is awaiting payment. It must be confirmed by a verified payment before it can be shipped.'
  }
  if (order.status === ORDER_STATUS.SHIPPED) return 'This order has already been shipped.'
  if (order.status === ORDER_STATUS.DELIVERED) return 'This order has already been delivered.'
  if (order.status === ORDER_STATUS.CANCELLED) return 'This order was cancelled.'
  return `Only confirmed orders can be shipped. This order is ${orderStatusLabel(order.status).toLowerCase()}.`
}

/** A human label for a provider or payment-method code, without inventing data. */
export const paymentCodeLabel = (code: string | null | undefined): string => {
  if (code === null || code === undefined || code.trim() === '') return '—'

  if (code === 'ABA_PAYWAY') return 'ABA PayWay'
  if (code === 'COD') return 'Cash on Delivery'
  if (code === 'ABA_PAY') return 'ABA Pay'

  return code
}

/** The method to show for an attempt; the provider is the stored fallback. */
export const paymentMethodLabel = (payment: AdminOrderPayment): string =>
  payment.paymentMethod !== null && payment.paymentMethod.trim() !== ''
    ? paymentCodeLabel(payment.paymentMethod)
    : paymentCodeLabel(payment.provider)

const formatDate = (value: ISODateTime): Date | null => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export const formatAdminOrderDate = (value: ISODateTime): string => {
  const date = formatDate(value)
  if (date === null) return '—'
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export const formatAdminOrderDateTime = (value: ISODateTime | null): string => {
  if (value === null) return '—'
  const date = formatDate(value)
  if (date === null) return '—'
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const customerName = (customer: AdminOrderDetail['customer']): string =>
  `${customer.firstName} ${customer.lastName}`.trim() || customer.email

/**
 * The stored shipping address as display lines.
 *
 * This is the same snapshot shape the customer receipt renders, including the
 * Cambodian location-path fallback. Nothing is read from the live address book.
 */
export const formatAdminOrderAddressLines = (
  order: AdminOrderAddressFields,
): string[] =>
  [
    order.shippingAddressLine1,
    order.shippingAddressLine2,
    ...(order.shippingLocationPath
      ? [
          ...order.shippingLocationPath.map((location) => {
            const label =
              location.adminLevel === 1
                ? 'Province/Municipality'
                : location.adminLevel === 2
                  ? 'District'
                  : 'Commune'
            return `${label}: ${administrativeLocationName(location)}`
          }),
          ...(order.shippingCountryCode === 'KH' &&
          order.shippingLocationPath.length === 1
            ? [
                ...(order.shippingStateProvince
                  ? [`District: ${order.shippingStateProvince}`]
                  : []),
                ...(order.shippingCity ? [`Commune: ${order.shippingCity}`] : []),
              ]
            : []),
        ]
      : [order.shippingCity]),
    [
      ...(order.shippingCountryCode === 'KH' &&
      order.shippingLocationPath?.length === 1
        ? []
        : [order.shippingStateProvince]),
      order.shippingPostalCode,
    ]
      .filter(Boolean)
      .join(' '),
    order.shippingCountryCode,
  ].filter((line): line is string => Boolean(line && line.trim() !== ''))

/** 0-based bounds shown in a "showing X–Y of Z" label. */
export const pageBounds = (
  pagination: AdminOrderPagination,
): { first: number; last: number } =>
  pagination.total === 0
    ? { first: 0, last: 0 }
    : {
        first: (pagination.page - 1) * pagination.limit + 1,
        last: Math.min(pagination.page * pagination.limit, pagination.total),
      }
