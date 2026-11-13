import { describe, expect, it } from 'vitest'
import type { CashReconciliationCurrency } from '@/types/api'
import {
  addCalendarDays,
  emptyOrderStatusCounts,
  formatShare,
  granularityForRange,
  inclusiveDays,
  paymentBreakdown,
  periodRange,
  reportingToday,
  sumOrderStatusCounts,
  toReportingEndTimestamp,
  toReportingStartTimestamp,
  validateReportingRange,
} from './reporting'

const cashRow = (
  overrides: Partial<CashReconciliationCurrency> = {},
): CashReconciliationCurrency => ({
  currency: 'USD',
  onlineCash: '0.00',
  codCash: '0.00',
  cashCollected: '0.00',
  orphanCash: '0.00',
  deferredCash: '0.00',
  codReceivable: '0.00',
  unpaidOnline: '0.00',
  accrualRevenue: '0.00',
  reconciliationVariance: '0.00',
  counts: {
    onlinePaidOrders: 0,
    codCollectedOrders: 0,
    orphanCashOrders: 0,
    deferredCashOrders: 0,
    codReceivableOrders: 0,
    unpaidOnlineOrders: 0,
    deliveredOrders: 0,
  },
  ...overrides,
})

describe('dashboard reporting helpers', () => {
  it('computes the reporting day in Asia/Phnom_Penh rather than local time', () => {
    expect(reportingToday(new Date('2026-11-13T04:00:00.000Z'))).toBe(
      '2026-11-13',
    )
    expect(reportingToday(new Date('2026-11-13T18:30:00.000Z'))).toBe(
      '2026-11-14',
    )
  })

  it('resolves presets to inclusive calendar windows', () => {
    expect(periodRange('today', '2026-11-13')).toEqual({
      from: '2026-11-13',
      to: '2026-11-13',
    })
    expect(periodRange('7d', '2026-11-13')).toEqual({
      from: '2026-11-07',
      to: '2026-11-13',
    })
    expect(periodRange('30d', '2026-11-13')).toEqual({
      from: '2026-10-15',
      to: '2026-11-13',
    })
    expect(periodRange('month', '2026-11-13')).toEqual({
      from: '2026-11-01',
      to: '2026-11-13',
    })
  })

  it('adds days without letting local time shift the calendar date', () => {
    expect(addCalendarDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addCalendarDays('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('counts inclusive days and chooses a supported bucket size', () => {
    expect(inclusiveDays({ from: '2026-11-13', to: '2026-11-13' })).toBe(1)
    expect(
      inclusiveDays({ from: '2026-10-15', to: '2026-11-13' }),
    ).toBe(30)
    expect(granularityForRange({ from: '2026-11-01', to: '2026-11-30' })).toBe(
      'day',
    )
    expect(granularityForRange({ from: '2026-10-01', to: '2026-12-31' })).toBe(
      'week',
    )
    expect(granularityForRange({ from: '2025-01-01', to: '2026-01-01' })).toBe(
      'month',
    )
  })

  it('validates the date labels the finance API would also reject', () => {
    expect(validateReportingRange('2026-10-01', '2026-10-31')).toBeUndefined()
    expect(validateReportingRange('2026-02-30', '2026-10-31')).toMatch(
      /real calendar date/,
    )
    expect(validateReportingRange('2026-10-31', '2026-10-01')).toMatch(
      /on or before/,
    )
    expect(validateReportingRange('2025-01-01', '2026-11-13')).toMatch(
      /366 days/,
    )
  })

  it('turns a reporting day into exact Phnom Penh instants', () => {
    expect(toReportingStartTimestamp('2026-11-13')).toBe(
      '2026-11-12T17:00:00.000Z',
    )
    expect(toReportingEndTimestamp('2026-11-13')).toBe(
      '2026-11-13T16:59:59.999Z',
    )
  })

  it('splits collected cash into the two non-overlapping sources', () => {
    const breakdown = paymentBreakdown(
      cashRow({
        onlineCash: '250.00',
        codCash: '150.00',
        cashCollected: '400.00',
      }),
    )

    expect(breakdown.total).toBe('400.00')
    expect(breakdown.totalValue).toBe(400)
    expect(breakdown.reconciles).toBe(true)
    expect(breakdown.segments.map((segment) => segment.key)).toEqual([
      'online',
      'cod',
    ])
    expect(breakdown.segments.map((segment) => segment.share)).toEqual([
      '62.5%',
      '37.5%',
    ])
  })

  it('only includes successful online cash and collected COD', () => {
    // A paid ABA order with no COD collection: COD is not cash yet.
    const onlineOnly = paymentBreakdown(
      cashRow({
        onlineCash: '200.00',
        codCash: '0.00',
        cashCollected: '200.00',
      }),
    )
    expect(onlineOnly.segments.map((segment) => segment.label)).toEqual([
      'ABA PayWay',
    ])

    // A collected COD order with no online payment: no fabricated online share.
    const codOnly = paymentBreakdown(
      cashRow({
        onlineCash: '0.00',
        codCash: '75.00',
        cashCollected: '75.00',
      }),
    )
    expect(codOnly.segments.map((segment) => segment.label)).toEqual([
      'Cash on delivery',
    ])
    expect(codOnly.segments[0].share).toBe('100%')
  })

  it('never substitutes a client sum for the backend collected total', () => {
    const breakdown = paymentBreakdown(
      cashRow({
        onlineCash: '100.00',
        codCash: '50.00',
        cashCollected: '175.00',
      }),
    )

    expect(breakdown.total).toBe('175.00')
    expect(breakdown.reconciles).toBe(false)
    expect(breakdown.segments.map((segment) => segment.value)).toEqual([
      100, 50,
    ])
  })

  it('returns no segments when nothing has been collected', () => {
    const breakdown = paymentBreakdown(cashRow())
    expect(breakdown.totalValue).toBe(0)
    expect(breakdown.segments).toEqual([])
    expect(formatShare(10, 0)).toBe('0%')
  })

  it('sums all lifecycle statuses from real counts', () => {
    const counts = emptyOrderStatusCounts()
    counts.PENDING = 2
    counts.DELIVERED = 6

    expect(sumOrderStatusCounts(counts)).toBe(8)
    expect(emptyOrderStatusCounts().CANCELLED).toBe(0)
  })
})
