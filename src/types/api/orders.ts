import type { CountryCode, ISODateTime, MoneyString, UUID, VariantOption } from './common'

/**
 * `GET /orders` and `GET /orders/:id`.
 *
 * Both read-only: the API exposes no way to change an order's status, prices,
 * totals, items or address, so nothing here advertises a mutation.
 *
 * ## The two shapes are deliberately different types
 *
 * A listing carries what a row needs — reference, status, money, counts, and
 * enough of the address to recognise the order — while the detail view carries
 * the full shipping address and its lines. The two are independent types rather
 * than one and an extension of the other, so a field added for one view cannot
 * appear in the other by accident.
 *
 * ## Amounts are strings, and the total is authoritative
 *
 * Every figure is a fixed two-decimal string. `totalAmount` is read from the
 * order, not recomputed: the database enforces
 * `total = subtotal + shippingFee - discountAmount` and
 * `lineTotal = unitPrice × quantity`, so the stored number is the truth.
 *
 * ## The shipping fields are a snapshot
 *
 * They were copied onto the order at checkout and are never read from the address
 * book, so correcting a typo or deleting an address cannot rewrite history.
 */

/** The order lifecycle as stored in `orders.status`. */
export const ORDER_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS]

/** The statuses that are terminal — nothing moves an order out of these. */
export const TERMINAL_ORDER_STATUSES: readonly OrderStatus[] = [
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.CANCELLED,
]

/**
 * The only status checkout writes, and the only one that can be paid for.
 * Mirrors `PAYABLE_ORDER_STATUS` on the server.
 */
export const PAYABLE_ORDER_STATUS: OrderStatus = ORDER_STATUS.PENDING

/** One line of an order, rendered entirely from its own stored snapshot. */
export interface OrderLine {
  id: UUID
  orderId: UUID
  /** Present so a client can link to the product page. Never used to derive anything else. */
  variantId: UUID
  /** Product name as it was when the order was placed. */
  productName: string
  /** SKU as it was when the order was placed. */
  sku: string
  /** Variant axes as they were when the order was placed. */
  variantOptionsSnapshot: VariantOption[]
  unitPrice: MoneyString
  quantity: number
  /** `unitPrice × quantity`, as stored. */
  lineTotal: MoneyString
  createdAt: ISODateTime
}

/** One row of "my orders". */
export interface OrderSummary {
  id: UUID
  userId: UUID
  /** The customer-facing reference. `id` is internal and appears in URLs only. */
  orderNumber: string
  status: OrderStatus
  subtotal: MoneyString
  shippingFee: MoneyString
  discountAmount: MoneyString
  totalAmount: MoneyString
  currency: string
  /** Units across every line — a bag count, not a line count. */
  itemCount: number
  lineCount: number
  /** From the order's immutable snapshot, never from a live address row. */
  shippingRecipientName: string
  shippingCity: string
  shippingCountryCode: CountryCode
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

/**
 * `GET /orders/:id` — the full order.
 *
 * Deliberately **not** `OrderSummary & { items: OrderLine[] }`. The server keeps
 * these as two independent DTOs and they are not the same set: the listing counts
 * `lineCount`, the detail does not, and the detail carries four more shipping
 * fields. Expressing the detail as an extension of the summary would quietly add
 * `lineCount` to every detail response and let the two contracts drift together
 * from here on, which is the coupling the backend avoided on purpose.
 */
export interface Order {
  id: UUID
  userId: UUID
  orderNumber: string
  status: OrderStatus
  subtotal: MoneyString
  shippingFee: MoneyString
  discountAmount: MoneyString
  totalAmount: MoneyString
  currency: string
  /** Units across every line — a bag count, not a line count. */
  itemCount: number
  shippingRecipientName: string
  shippingPhone: string
  shippingAddressLine1: string
  shippingAddressLine2: string | null
  shippingCity: string
  shippingStateProvince: string | null
  shippingPostalCode: string | null
  shippingCountryCode: CountryCode
  items: OrderLine[]
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

/**
 * One line of the order's shipping address, skipping the parts that are absent.
 *
 * Takes an `Order`, not an `Address`: the two hold the same five facts under
 * different names, and an order's copy is a snapshot that must not be read back
 * out of the address book.
 */
export const formatOrderAddressLines = (order: Order): string[] =>
  [
    order.shippingAddressLine1,
    order.shippingAddressLine2,
    order.shippingCity,
    [order.shippingStateProvince, order.shippingPostalCode].filter(Boolean).join(' '),
    order.shippingCountryCode,
  ].filter((line): line is string => Boolean(line && line.trim() !== ''))

/**
 * `POST /checkout` — the entire body is one field, by design.
 *
 * What to buy comes from the cart, what it costs comes from the catalogue at
 * commit time, and where it goes is an address this user owns. A body carrying a
 * price, a total or a status is rejected by the server, so this type cannot
 * express one.
 */
export interface CheckoutRequest {
  addressId: UUID
}