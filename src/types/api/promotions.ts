import type { ISODateTime, MoneyString, UUID } from './common'

export type PromotionKind = 'COUPON' | 'AUTOMATIC'
export type PromotionDiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING'

export interface Promotion {
  id: UUID
  code: string | null
  name: string
  description: string | null
  kind: PromotionKind
  discountType: PromotionDiscountType
  percentOff: string | null
  amountOff: MoneyString | null
  minSubtotal: MoneyString
  maxDiscount: MoneyString | null
  startsAt: ISODateTime | null
  endsAt: ISODateTime | null
  isActive: boolean
  usageLimitTotal: number | null
  usageLimitPerUser: number | null
  priority: number
  archivedAt: ISODateTime | null
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface PromotionPage {
  items: Promotion[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export interface PromotionUsage {
  id: UUID
  promotionId: UUID
  orderId: UUID
  orderNumber: string
  userId: UUID
  user: { id: UUID; firstName: string; lastName: string; email: string }
  discountAmount: MoneyString
  subtotalAtUse: MoneyString
  createdAt: ISODateTime
}

export interface PromotionUsagePage { items: PromotionUsage[]; pagination: PromotionPage['pagination'] }

export interface PromotionInput {
  code?: string | null
  name: string
  description?: string | null
  kind: PromotionKind
  discountType: PromotionDiscountType
  percentOff?: string | null
  amountOff?: string | null
  minSubtotal?: string | null
  maxDiscount?: string | null
  startsAt?: string | null
  endsAt?: string | null
  isActive?: boolean
  usageLimitTotal?: number | null
  usageLimitPerUser?: number | null
  priority?: number
}
