import type { ISODateTime, MoneyString, UUID, VariantOption } from './common'
import type { AdministrativeLocationPath } from './administrativeLocations'

export const CHECKOUT_PAYMENT_METHOD = {
  ABA_PAYWAY: 'ABA_PAYWAY',
  COD: 'COD',
} as const

export type CheckoutPaymentMethod =
  (typeof CHECKOUT_PAYMENT_METHOD)[keyof typeof CHECKOUT_PAYMENT_METHOD]

export interface CreateCheckoutQuoteRequest {
  addressId: UUID
  shippingProviderId: UUID
  paymentMethod: CheckoutPaymentMethod
  couponCode?: string
}

export interface AppliedPromotion {
  id: UUID
  code: string | null
  name: string
  kind: 'COUPON' | 'AUTOMATIC'
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING'
  discountAmount: MoneyString
}

export interface CheckoutQuoteItem {
  variantId: UUID
  productName: string
  sku: string
  variantOptions: VariantOption[]
  unitPrice: MoneyString
  quantity: number
  lineTotal: MoneyString
}

export interface CheckoutQuote {
  quoteId: UUID
  paymentMethod: CheckoutPaymentMethod
  addressId: UUID
  shippingProvider: {
    id: UUID
    code: string
    name: string
    fee: MoneyString
  }
  administrativeLocationPath: AdministrativeLocationPath | null
  items: CheckoutQuoteItem[]
  subtotal: MoneyString
  shippingFee: MoneyString
  discountAmount: MoneyString
  totalAmount: MoneyString
  couponCode: string | null
  appliedCoupon: AppliedPromotion | null
  appliedAutomaticPromotion: AppliedPromotion | null
  appliedPromotions: AppliedPromotion[]
  currency: string
  expiresAt: ISODateTime
}

export interface CheckoutRequest {
  quoteId: UUID
  idempotencyKey: UUID
}
