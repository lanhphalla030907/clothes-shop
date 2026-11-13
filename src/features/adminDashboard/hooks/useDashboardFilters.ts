import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { isCalendarDate } from '@/features/finance/utils'
import {
  DEFAULT_DASHBOARD_PERIOD,
  isDashboardPeriodPreset,
  periodRange,
  reportingToday,
  validateReportingRange,
  type DashboardPeriodPreset,
  type ReportingRange,
} from '../reporting'

type PresetWithoutCustom = Exclude<DashboardPeriodPreset, 'custom'>

export type DashboardFilters = {
  preset: DashboardPeriodPreset
  range: ReportingRange
  currency?: string
  applyPreset: (preset: PresetWithoutCustom) => void
  applyCustom: (from: string, to: string) => void
  setCurrency: (currency: string | undefined) => void
}

/**
 * The one reporting window shared by every overview panel.
 *
 * Period values live in the URL next to the finance page's filters, so a copied
 * link describes the same dashboard. The browser computes calendar labels in the
 * reporting timezone; the finance API remains the authority on bucket boundaries
 * and validates the 366-day maximum again.
 */
export const useDashboardFilters = (): DashboardFilters => {
  const [params, setParams] = useSearchParams()

  const today = reportingToday()
  const rawPreset = params.get('period')
  const requested = isDashboardPeriodPreset(rawPreset)
    ? rawPreset
    : DEFAULT_DASHBOARD_PERIOD

  const customFrom = params.get('from')
  const customTo = params.get('to')
  const customIsValid =
    requested === 'custom' &&
    isCalendarDate(customFrom) &&
    isCalendarDate(customTo) &&
    validateReportingRange(customFrom, customTo) === undefined

  const preset: DashboardPeriodPreset =
    requested === 'custom' && !customIsValid
      ? DEFAULT_DASHBOARD_PERIOD
      : requested

  const range = useMemo<ReportingRange>(() => {
    if (preset === 'custom' && isCalendarDate(customFrom) && isCalendarDate(customTo)) {
      return { from: customFrom, to: customTo }
    }
    return periodRange(preset as PresetWithoutCustom, today)
  }, [preset, customFrom, customTo, today])

  const applyPreset = useCallback(
    (next: PresetWithoutCustom) => {
      const updated = new URLSearchParams(params)
      updated.set('period', next)
      updated.delete('from')
      updated.delete('to')
      setParams(updated, { replace: true })
    },
    [params, setParams],
  )

  const applyCustom = useCallback(
    (from: string, to: string) => {
      const updated = new URLSearchParams(params)
      updated.set('period', 'custom')
      updated.set('from', from)
      updated.set('to', to)
      setParams(updated, { replace: true })
    },
    [params, setParams],
  )

  const setCurrency = useCallback(
    (currency: string | undefined) => {
      const updated = new URLSearchParams(params)
      if (currency) updated.set('currency', currency.toUpperCase())
      else updated.delete('currency')
      setParams(updated, { replace: true })
    },
    [params, setParams],
  )

  return {
    preset,
    range,
    currency: params.get('currency')?.trim().toUpperCase() || undefined,
    applyPreset,
    applyCustom,
    setCurrency,
  }
}
