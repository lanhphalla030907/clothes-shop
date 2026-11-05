import { describe, expect, it } from 'vitest'
import {
  ADMIN_ORDER_PAGE_SIZES,
  DEFAULT_ADMIN_ORDER_PAGE_SIZE,
  canCancelOrder,
  canShipOrder,
  cancelBlockedReason,
  codCollectionStatusLabel,
  effectiveCodCollectionStatus,
  effectivePaymentStatus,
  formatAdminOrderAddressLines,
  isOrderStatus,
  pageBounds,
  parsePageSize,
  parsePositivePage,
  paymentCodeLabel,
  safeDateParameter,
  shipBlockedReason,
  toCreatedFromTimestamp,
  toCreatedToTimestamp,
} from './rules'

describe('admin order query rules', () => {
  it('accepts only known statuses and positive pages', () => {
    expect(isOrderStatus('PENDING')).toBe(true)
    expect(isOrderStatus('NOT_A_STATUS')).toBe(false)
    expect(isOrderStatus(null)).toBe(false)

    expect(parsePositivePage('3')).toBe(3)
    expect(parsePositivePage('0')).toBe(1)
    expect(parsePositivePage('abc')).toBe(1)
    expect(parsePositivePage(null)).toBe(1)
  })

  it('falls back to the default page size for unsupported values', () => {
    expect(ADMIN_ORDER_PAGE_SIZES).toContain(DEFAULT_ADMIN_ORDER_PAGE_SIZE)
    expect(parsePageSize('50')).toBe(50)
    expect(parsePageSize('33')).toBe(DEFAULT_ADMIN_ORDER_PAGE_SIZE)
    expect(parsePageSize(null)).toBe(DEFAULT_ADMIN_ORDER_PAGE_SIZE)
  })

  it('sends inclusive local-day boundaries and rejects impossible dates', () => {
    const start = new Date(2026, 9, 30, 0, 0, 0, 0).toISOString()
    const end = new Date(2026, 9, 30, 23, 59, 59, 999).toISOString()

    expect(toCreatedFromTimestamp('2026-10-30')).toBe(start)
    expect(toCreatedToTimestamp('2026-10-30')).toBe(end)
    expect(toCreatedFromTimestamp('2026-02-31')).toBeUndefined()
    expect(toCreatedToTimestamp('')).toBeUndefined()
    expect(safeDateParameter('2026-10-30')).toBe('2026-10-30')
    expect(safeDateParameter('nonsense')).toBe('')
  })

  it('calculates the visible row bounds', () => {
    expect(pageBounds({ page: 2, limit: 20, total: 35, totalPages: 2 })).toEqual({
      first: 21,
      last: 35,
    })
    expect(pageBounds({ page: 1, limit: 20, total: 0, totalPages: 0 })).toEqual({
      first: 0,
      last: 0,
    })
  })
})

describe('admin order action rules', () => {
  it('only allows cancelling a pending order without a paid payment', () => {
    expect(canCancelOrder({ status: 'PENDING', hasPaidPayment: false })).toBe(true)
    expect(canCancelOrder({ status: 'PENDING', hasPaidPayment: true })).toBe(false)
    expect(canCancelOrder({ status: 'CONFIRMED', hasPaidPayment: true })).toBe(false)
    expect(cancelBlockedReason({ status: 'PENDING', hasPaidPayment: true })).toMatch(
      /verified payment/i,
    )
  })

  it('requires online payment but allows confirmed COD orders without payment', () => {
    expect(canShipOrder({
      status: 'CONFIRMED',
      paymentMethod: 'ABA_PAYWAY',
      hasPaidPayment: true,
    })).toBe(true)
    expect(canShipOrder({
      status: 'CONFIRMED',
      paymentMethod: 'ABA_PAYWAY',
      hasPaidPayment: false,
    })).toBe(false)
    expect(canShipOrder({
      status: 'CONFIRMED',
      paymentMethod: 'COD',
      hasPaidPayment: false,
    })).toBe(true)
    expect(canShipOrder({
      status: 'PENDING',
      paymentMethod: 'COD',
      hasPaidPayment: false,
    })).toBe(false)
    expect(shipBlockedReason({
      status: 'CONFIRMED',
      paymentMethod: 'ABA_PAYWAY',
      hasPaidPayment: false,
    })).toMatch(
      /no verified payment/i,
    )
    expect(shipBlockedReason({
      status: 'PENDING',
      paymentMethod: 'COD',
      hasPaidPayment: false,
    })).toMatch(/must be confirmed/i)
    expect(shipBlockedReason({
      status: 'SHIPPED',
      paymentMethod: 'COD',
      hasPaidPayment: false,
    })).toMatch(
      /already been shipped/i,
    )
  })

  it('lets an earlier verified payment win over a later failed attempt', () => {
    expect(effectivePaymentStatus(true, 'FAILED', 'ABA_PAYWAY')).toBe('PAID')
    expect(effectivePaymentStatus(false, 'FAILED', 'ABA_PAYWAY')).toBe('FAILED')
    expect(effectivePaymentStatus(false, null, 'ABA_PAYWAY')).toBe('PENDING')
    expect(effectivePaymentStatus(false, null, 'COD')).toBe('UNPAID')
    expect(effectivePaymentStatus(false, null, null)).toBe('PENDING')
  })

  it('derives COD collection only from the collection record', () => {
    expect(
      effectiveCodCollectionStatus('COD', {
        status: 'COLLECTED',
        amount: '6.50',
        currency: 'USD',
        collectedAt: '2026-11-01T17:39:58.212Z',
        collector: null,
      }),
    ).toBe('COLLECTED')
    expect(effectiveCodCollectionStatus('COD', null)).toBe('NOT_COLLECTED')
    expect(
      effectiveCodCollectionStatus('ABA_PAYWAY', {
        status: 'COLLECTED',
        amount: '6.50',
        currency: 'USD',
        collectedAt: '2026-11-01T17:39:58.212Z',
        collector: null,
      }),
    ).toBe('COLLECTED')
    expect(effectiveCodCollectionStatus('ABA_PAYWAY', null)).toBeNull()
    expect(codCollectionStatusLabel('COLLECTED')).toBe('Collected')
    expect(codCollectionStatusLabel('NOT_COLLECTED')).toBe('Not collected')
  })
})

describe('admin order presentation rules', () => {
  it('renders readable provider codes without changing unknown codes', () => {
    expect(paymentCodeLabel('ABA_PAYWAY')).toBe('ABA PayWay')
    expect(paymentCodeLabel('COD')).toBe('Cash on Delivery')
    expect(paymentCodeLabel('CUSTOM_PROVIDER')).toBe('CUSTOM_PROVIDER')
    expect(paymentCodeLabel(null)).toBe('—')
  })

  it('formats the stored shipping address and skips blank parts', () => {
    const lines = formatAdminOrderAddressLines({
      shippingAddressLine1: '12 Street 1',
      shippingAddressLine2: null,
      shippingCity: 'Phnom Penh',
      shippingStateProvince: null,
      shippingLocationPath: null,
      shippingPostalCode: '12000',
      shippingCountryCode: 'KH',
    })

    expect(lines).toEqual(['12 Street 1', 'Phnom Penh', '12000', 'KH'])
  })
})
