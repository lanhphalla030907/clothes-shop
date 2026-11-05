import type { CountryCode, ISODateTime, MoneyString, UUID } from './common'
import type { AdministrativeLocationSnapshotEntry } from './administrativeLocations'
import type { OrderLine, OrderStatus } from './orders'
import type { PaymentStatus } from './payments'

export interface AdminOrderCustomer {
  id: UUID
  firstName: string
  lastName: string
  email: string
}

/** The newest payment attempt summarised on an order-list row. */
export interface AdminOrderPaymentSummary {
  id: UUID
  status: PaymentStatus
  provider: string
  amount: MoneyString
  currency: string
  paidAt: ISODateTime | null
  createdAt: ISODateTime
}

/** One payment attempt in the order detail, with its safe provider references. */
export interface AdminOrderPayment extends AdminOrderPaymentSummary {
  transactionId: string
  paymentMethod: string | null
  providerReference: string | null
}

/** Whether a `cod_collections` row exists for the order. */
export type CodCollectionStatus = 'COLLECTED' | 'NOT_COLLECTED'

/** The staff member who recorded cash, limited to safe identity fields. */
export interface AdminOrderCodCollectionCollector {
  id: UUID
  firstName: string
  lastName: string
  email: string
}

/**
 * The actual COD collection record, independent of `payment`.
 *
 * `null` is returned by the API for a non-COD order with no collection, so a
 * credit-card order is never described as "not collected".
 */
export interface AdminOrderCodCollection {
  status: CodCollectionStatus
  amount: MoneyString | null
  currency: string | null
  collectedAt: ISODateTime | null
  collector: AdminOrderCodCollectionCollector | null
}

/** One row of `GET /admin/orders`. */
export interface AdminOrderSummary {
  id: UUID
  orderNumber: string
  status: OrderStatus
  customer: AdminOrderCustomer
  subtotal: MoneyString
  shippingFee: MoneyString
  discountAmount: MoneyString
  totalAmount: MoneyString
  currency: string
  /** Total units across every line. */
  itemCount: number
  /** Number of order lines. */
  lineCount: number
  shippingRecipientName: string
  shippingCity: string | null
  shippingLocationPath: AdministrativeLocationSnapshotEntry[] | null
  shippingCountryCode: CountryCode
  /** The most recent payment attempt, or `null` when none was ever started. */
  payment: AdminOrderPaymentSummary | null
  /** Whether any attempt on this order has reached `PAID`. */
  hasPaidPayment: boolean
  /** The payment channel selected at checkout, independent of any attempt. */
  paymentMethod: string | null
  /** The actual COD collection record, or `null` for a non-COD order. */
  codCollection: AdminOrderCodCollection | null
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

/** The complete administrative view returned by `GET /admin/orders/:id`. */
export interface AdminOrderDetail {
  id: UUID
  userId: UUID
  orderNumber: string
  status: OrderStatus
  subtotal: MoneyString
  shippingFee: MoneyString
  discountAmount: MoneyString
  totalAmount: MoneyString
  currency: string
  customer: AdminOrderCustomer
  shippingRecipientName: string
  shippingPhone: string
  shippingAddressLine1: string
  shippingAddressLine2: string | null
  shippingCity: string | null
  shippingStateProvince: string | null
  shippingLocationPath: AdministrativeLocationSnapshotEntry[] | null
  shippingPostalCode: string | null
  shippingCountryCode: CountryCode
  items: OrderLine[]
  payments: AdminOrderPayment[]
  itemCount: number
  lineCount: number
  createdAt: ISODateTime
  updatedAt: ISODateTime
  /** The payment channel selected at checkout, independent of any attempt. */
  paymentMethod: string | null
  /** The actual COD collection record, or `null` for a non-COD order. */
  codCollection: AdminOrderCodCollection | null
}

/** The address snapshot fields an admin receipt renders. */
export type AdminOrderAddressFields = Pick<
  AdminOrderDetail,
  | 'shippingAddressLine1'
  | 'shippingAddressLine2'
  | 'shippingCity'
  | 'shippingStateProvince'
  | 'shippingLocationPath'
  | 'shippingPostalCode'
  | 'shippingCountryCode'
>

/** Pagination metadata returned beside the listing page. */
export interface AdminOrderPagination {
  page: number
  limit: number
  total: number
  /** Zero when the filters match no orders. */
  totalPages: number
}

export interface AdminOrderListResponse {
  items: AdminOrderSummary[]
  pagination: AdminOrderPagination
}

export interface AdminOrderListQuery {
  page?: number
  limit?: number
  status?: OrderStatus
  /** Matches an order-number prefix or the customer's names/email. */
  search?: string
  createdFrom?: ISODateTime
  createdTo?: ISODateTime
}
