import type {
  Promotion,
  PromotionDiscountType,
  PromotionInput,
  PromotionKind,
} from '@/types/api'

export type PromotionFormValues = {
  name: string
  description: string
  kind: PromotionKind
  code: string
  discountType: PromotionDiscountType
  percentOff: string
  amountOff: string
  minSubtotal: string
  maxDiscount: string
  startsAt: string
  endsAt: string
  usageLimitTotal: string
  usageLimitPerUser: string
  priority: string
  isActive: boolean
}

const MONEY_PATTERN = /^\d{1,10}(?:\.\d{1,2})?$/
const PERCENT_PATTERN = /^\d{1,3}(?:\.\d{1,2})?$/
const USAGE_LIMIT_PATTERN = /^\d+$/

const pad = (value: number): string => String(value).padStart(2, '0')

/**
 * Formats an ISO timestamp for a `datetime-local` control in the browser's local
 * timezone.
 *
 * A `datetime-local` value carries no offset, so it must be the local wall-clock
 * time. Using `toISOString()` here would write UTC into the control and shift the
 * displayed instant by the browser's offset.
 */
export const toLocalDateTimeInput = (
  value: string | null | undefined,
): string => {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * Converts a `datetime-local` value back to the ISO instant the API stores.
 *
 * `new Date('YYYY-MM-DDTHH:mm')` is interpreted as local time, which makes this
 * the exact inverse of {@link toLocalDateTimeInput} and preserves the intended
 * instant across an edit. Empty or impossible values become `null`.
 */
export const fromLocalDateTimeInput = (
  value: string | null | undefined,
): string | null => {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return date.toISOString()
}

export const emptyPromotionForm = (): PromotionFormValues => ({
  name: '',
  description: '',
  kind: 'COUPON',
  code: '',
  discountType: 'PERCENTAGE',
  percentOff: '',
  amountOff: '',
  minSubtotal: '',
  maxDiscount: '',
  startsAt: '',
  endsAt: '',
  usageLimitTotal: '',
  usageLimitPerUser: '',
  priority: '0',
  isActive: true,
})

export const promotionFormValues = (
  promotion: Promotion,
): PromotionFormValues => ({
  name: promotion.name,
  description: promotion.description ?? '',
  kind: promotion.kind,
  code: promotion.code ?? '',
  discountType: promotion.discountType,
  percentOff: promotion.percentOff ?? '',
  amountOff: promotion.amountOff ?? '',
  minSubtotal: promotion.minSubtotal,
  maxDiscount: promotion.maxDiscount ?? '',
  startsAt: toLocalDateTimeInput(promotion.startsAt),
  endsAt: toLocalDateTimeInput(promotion.endsAt),
  usageLimitTotal: promotion.usageLimitTotal?.toString() ?? '',
  usageLimitPerUser: promotion.usageLimitPerUser?.toString() ?? '',
  priority: promotion.priority.toString(),
  isActive: promotion.isActive,
})

const optionalText = (value: string): string | null =>
  value.trim() === '' ? null : value.trim()

const optionalNumber = (value: string): number | null =>
  value.trim() === '' ? null : Number(value)

/**
 * Builds the request body while keeping each discount type's fields disjoint.
 *
 * The backend rejects a discount field that does not belong to the selected
 * type, so switching type clears the other field instead of leaving a stale
 * value in the payload. Free shipping therefore sends no percentage or fixed
 * amount at all; the API represents "absent" as `null`.
 */
export const buildPromotionInput = (
  values: PromotionFormValues,
): PromotionInput => ({
  name: values.name.trim(),
  description: optionalText(values.description),
  kind: values.kind,
  code: values.kind === 'COUPON' ? values.code.trim() : null,
  discountType: values.discountType,
  percentOff:
    values.discountType === 'PERCENTAGE' ? values.percentOff.trim() : null,
  amountOff:
    values.discountType === 'FIXED_AMOUNT' ? values.amountOff.trim() : null,
  minSubtotal: optionalText(values.minSubtotal),
  maxDiscount: optionalText(values.maxDiscount),
  startsAt: fromLocalDateTimeInput(values.startsAt),
  endsAt: fromLocalDateTimeInput(values.endsAt),
  usageLimitTotal: optionalNumber(values.usageLimitTotal),
  usageLimitPerUser: optionalNumber(values.usageLimitPerUser),
  priority: Number(values.priority || 0),
  isActive: values.isActive,
})

const usageLimitError = (value: string, label: string): string | undefined => {
  const trimmed = value.trim()
  if (trimmed === '') return undefined
  if (!USAGE_LIMIT_PATTERN.test(trimmed)) {
    return `${label} must be a whole number of zero or more.`
  }
  return undefined
}

/**
 * The form-level validation mirror of the backend rules.
 *
 * The backend DTO and service remain authoritative; this exists so an obviously
 * invalid form is not submitted and surfaced as a server error. It does not
 * duplicate business rules such as coupon-code uniqueness.
 */
export const validatePromotionForm = (
  values: PromotionFormValues,
): string | undefined => {
  if (!values.name.trim()) return 'Complete the required promotion fields.'

  if (values.kind === 'COUPON' && !values.code.trim()) {
    return 'Complete the required promotion fields.'
  }

  if (values.discountType === 'PERCENTAGE') {
    const percent = values.percentOff.trim()
    if (!percent) return 'Complete the required promotion fields.'
    if (!PERCENT_PATTERN.test(percent) || Number(percent) <= 0 || Number(percent) > 100) {
      return 'Enter a percentage greater than 0 and at most 100.'
    }
  }

  if (values.discountType === 'FIXED_AMOUNT') {
    const amount = values.amountOff.trim()
    if (!amount) return 'Complete the required promotion fields.'
    if (!MONEY_PATTERN.test(amount) || Number(amount) <= 0) {
      return 'Enter a fixed amount greater than zero.'
    }
  }

  if (values.minSubtotal.trim() && !MONEY_PATTERN.test(values.minSubtotal.trim())) {
    return 'Minimum subtotal must be a non-negative amount with at most 2 decimals.'
  }

  if (values.maxDiscount.trim()) {
    const max = values.maxDiscount.trim()
    if (!MONEY_PATTERN.test(max) || Number(max) <= 0) {
      return 'Maximum discount must be an amount greater than zero.'
    }
  }

  const usageTotalError = usageLimitError(values.usageLimitTotal, 'Global usage limit')
  if (usageTotalError) return usageTotalError

  const usageUserError = usageLimitError(values.usageLimitPerUser, 'Per-user usage limit')
  if (usageUserError) return usageUserError

  if (values.priority.trim() && !Number.isInteger(Number(values.priority))) {
    return 'Priority must be a whole number.'
  }

  const startsAt = fromLocalDateTimeInput(values.startsAt)
  if (values.startsAt.trim() && startsAt === null) {
    return 'Enter a valid start date.'
  }

  const endsAt = fromLocalDateTimeInput(values.endsAt)
  if (values.endsAt.trim() && endsAt === null) {
    return 'Enter a valid end date.'
  }

  if (startsAt !== null && endsAt !== null && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    return 'The end date must be after the start date.'
  }

  return undefined
}
