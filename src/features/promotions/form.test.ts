import { describe, expect, it } from 'vitest'
import type { Promotion } from '@/types/api'
import {
  buildPromotionInput,
  emptyPromotionForm,
  fromLocalDateTimeInput,
  promotionFormValues,
  toLocalDateTimeInput,
  validatePromotionForm,
} from './form'

const promotion = (overrides: Partial<Promotion> = {}): Promotion => ({
  id: 'promotion-1',
  code: 'SAVE10',
  name: 'Save 10%',
  description: null,
  kind: 'COUPON',
  discountType: 'PERCENTAGE',
  percentOff: '10.00',
  amountOff: null,
  minSubtotal: '0.00',
  maxDiscount: null,
  startsAt: '2026-11-06T12:00:00.000Z',
  endsAt: null,
  isActive: true,
  usageLimitTotal: null,
  usageLimitPerUser: null,
  priority: 0,
  archivedAt: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  ...overrides,
})

describe('promotion datetime input', () => {
  it('formats an ISO timestamp as local wall-clock time', () => {
    // Built from local components so the expectation is independent of the
    // machine's timezone: the control must show the same wall clock the user
    // would see on a calendar, not UTC.
    const local = new Date(2026, 10, 6, 12, 30)

    expect(toLocalDateTimeInput(local.toISOString())).toBe('2026-11-06T12:30')
  })

  it('round-trips a local datetime back to the same instant', () => {
    const local = new Date(2026, 10, 6, 12, 30)
    const iso = local.toISOString()

    const controlValue = toLocalDateTimeInput(iso)

    expect(fromLocalDateTimeInput(controlValue)).toBe(iso)
  })

  it('keeps empty optional dates empty and null-safe', () => {
    expect(toLocalDateTimeInput(null)).toBe('')
    expect(toLocalDateTimeInput(undefined)).toBe('')
    expect(toLocalDateTimeInput('')).toBe('')
    expect(fromLocalDateTimeInput(null)).toBeNull()
    expect(fromLocalDateTimeInput(undefined)).toBeNull()
    expect(fromLocalDateTimeInput('')).toBeNull()
  })

  it('handles invalid dates safely', () => {
    expect(toLocalDateTimeInput('not-a-date')).toBe('')
    expect(fromLocalDateTimeInput('not-a-date')).toBeNull()
  })

  it('uses the local datetime control value when editing', () => {
    const values = promotionFormValues(promotion())

    expect(values.startsAt).toBe(
      toLocalDateTimeInput('2026-11-06T12:00:00.000Z'),
    )
    expect(buildPromotionInput({ ...values, name: 'Renamed' }).startsAt).toBe(
      fromLocalDateTimeInput(values.startsAt),
    )
  })
})

describe('promotion request payload', () => {
  it('sends only the percentage field for a percentage promotion', () => {
    const input = buildPromotionInput({
      ...emptyPromotionForm(),
      name: 'Ten percent',
      kind: 'COUPON',
      code: ' save10 ',
      discountType: 'PERCENTAGE',
      percentOff: '10.00',
      amountOff: '5.00',
    })

    expect(input).toMatchObject({
      name: 'Ten percent',
      code: 'save10',
      discountType: 'PERCENTAGE',
      percentOff: '10.00',
      amountOff: null,
    })
  })

  it('sends only the fixed amount for a fixed-amount promotion', () => {
    const input = buildPromotionInput({
      ...emptyPromotionForm(),
      name: 'Five off',
      kind: 'AUTOMATIC',
      discountType: 'FIXED_AMOUNT',
      percentOff: '10.00',
      amountOff: '5.00',
    })

    expect(input).toMatchObject({
      kind: 'AUTOMATIC',
      code: null,
      discountType: 'FIXED_AMOUNT',
      percentOff: null,
      amountOff: '5.00',
    })
  })

  it('sends no discount fields for a free-shipping promotion', () => {
    const input = buildPromotionInput({
      ...emptyPromotionForm(),
      name: 'Free delivery',
      kind: 'AUTOMATIC',
      discountType: 'FREE_SHIPPING',
      percentOff: '10.00',
      amountOff: '5.00',
    })

    expect(input).toMatchObject({
      discountType: 'FREE_SHIPPING',
      percentOff: null,
      amountOff: null,
    })
  })

  it('keeps optional dates and usage limits null when left empty', () => {
    const input = buildPromotionInput({
      ...emptyPromotionForm(),
      name: 'Always on',
      kind: 'AUTOMATIC',
      discountType: 'FREE_SHIPPING',
    })

    expect(input).toMatchObject({
      startsAt: null,
      endsAt: null,
      minSubtotal: null,
      maxDiscount: null,
      usageLimitTotal: null,
      usageLimitPerUser: null,
    })
  })
})

describe('promotion form validation', () => {
  it('does not require discount fields for free shipping', () => {
    expect(
      validatePromotionForm({
        ...emptyPromotionForm(),
        name: 'Free delivery',
        kind: 'AUTOMATIC',
        discountType: 'FREE_SHIPPING',
        percentOff: '',
        amountOff: '',
      }),
    ).toBeUndefined()
  })

  it('requires a percentage in (0, 100]', () => {
    expect(
      validatePromotionForm({
        ...emptyPromotionForm(),
        name: 'Ten percent',
        code: 'SAVE10',
        percentOff: '0',
      }),
    ).toBe('Enter a percentage greater than 0 and at most 100.')

    expect(
      validatePromotionForm({
        ...emptyPromotionForm(),
        name: 'Ten percent',
        code: 'SAVE10',
        percentOff: '100.01',
      }),
    ).toBe('Enter a percentage greater than 0 and at most 100.')
  })

  it('requires a positive fixed amount', () => {
    expect(
      validatePromotionForm({
        ...emptyPromotionForm(),
        name: 'Five off',
        code: 'SAVE5',
        discountType: 'FIXED_AMOUNT',
        amountOff: '0',
      }),
    ).toBe('Enter a fixed amount greater than zero.')
  })

  it('validates subtotal, maximum discount, dates, and usage limits', () => {
    const base = {
      ...emptyPromotionForm(),
      name: 'Guarded promotion',
      code: 'GUARD',
      percentOff: '10.00',
    }

    expect(validatePromotionForm({ ...base, minSubtotal: '-1.00' })).toBe(
      'Minimum subtotal must be a non-negative amount with at most 2 decimals.',
    )
    expect(validatePromotionForm({ ...base, maxDiscount: '0.00' })).toBe(
      'Maximum discount must be an amount greater than zero.',
    )
    expect(validatePromotionForm({ ...base, usageLimitTotal: '1.5' })).toBe(
      'Global usage limit must be a whole number of zero or more.',
    )
    expect(validatePromotionForm({ ...base, usageLimitPerUser: '-1' })).toBe(
      'Per-user usage limit must be a whole number of zero or more.',
    )
    expect(
      validatePromotionForm({
        ...base,
        startsAt: '2026-11-06T12:00',
        endsAt: '2026-11-06T11:00',
      }),
    ).toBe('The end date must be after the start date.')
  })
})
