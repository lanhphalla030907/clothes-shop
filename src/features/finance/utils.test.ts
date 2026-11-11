import { describe, expect, it } from 'vitest'
import {
  formatCalendarLabel,
  formatPeriodFullLabel,
  formatPeriodLabel,
  formatRatioPercent,
  isCalendarDate,
  pageBounds,
  parseFinancePageSize,
  parsePositiveInteger,
  validateFinanceDateRange,
} from './utils'

describe('finance utils', () => {
  it('validates real calendar dates and rejects impossible ones', () => {
    expect(isCalendarDate('2026-10-31')).toBe(true)
    expect(isCalendarDate('2026-02-30')).toBe(false)
    expect(isCalendarDate('31-10-2026')).toBe(false)
    expect(isCalendarDate(null)).toBe(false)
  })

  it('validates the user-entered date range without choosing a default', () => {
    expect(validateFinanceDateRange('', '')).toBeUndefined()
    expect(validateFinanceDateRange('2026-10-01', '2026-10-31')).toBeUndefined()
    expect(validateFinanceDateRange('2026-10-31', '2026-10-01')).toMatch(
      /on or before/,
    )
    expect(validateFinanceDateRange('2026-01-01', '2027-01-02')).toMatch(
      /366 days/,
    )
  })

  it('formats reporting labels in UTC so the browser cannot shift a day', () => {
    expect(formatCalendarLabel('2026-10-01')).toBe('01 Oct 2026')
    expect(formatPeriodLabel('2026-10-01', 'day')).toBe('01 Oct')
    expect(formatPeriodLabel('2026-10-01', 'week')).toBe('W/c 01 Oct')
    expect(formatPeriodLabel('2026-10-01', 'month')).toBe('Oct 2026')
    expect(formatPeriodFullLabel('2026-10-01', 'week')).toBe(
      'Week of 01 Oct 2026',
    )
  })

  it('formats a server ratio as a percentage and preserves null', () => {
    expect(formatRatioPercent('0.2941')).toBe('29.4%')
    expect(formatRatioPercent('1')).toBe('100.0%')
    expect(formatRatioPercent(null)).toBeNull()
    expect(formatRatioPercent('not-a-ratio')).toBeNull()
  })

  it('parses safe pagination values', () => {
    expect(parsePositiveInteger('2')).toBe(2)
    expect(parsePositiveInteger('0')).toBe(1)
    expect(parsePositiveInteger(null)).toBe(1)
    expect(parseFinancePageSize('50')).toBe(50)
    expect(parseFinancePageSize('999')).toBe(20)
    expect(pageBounds(2, 20, 41)).toEqual({ first: 21, last: 40 })
    expect(pageBounds(1, 20, 0)).toEqual({ first: 0, last: 0 })
  })
})
