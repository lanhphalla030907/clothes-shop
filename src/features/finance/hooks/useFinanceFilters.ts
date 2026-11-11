import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { FinanceBasis } from '@/types/api'
import { isCalendarDate, isFinanceBasis } from '../utils'

export interface AppliedFinanceFilters {
  from?: string
  to?: string
  currency?: string
  basis: FinanceBasis
}

const setOrDelete = (
  params: URLSearchParams,
  key: string,
  value: string | undefined,
): void => {
  if (value === undefined || value === '') params.delete(key)
  else params.set(key, value)
}

/**
 * Finance filters live in the URL so every panel, and a copied link, describes
 * the same reporting window. The browser only validates labels; it never
 * substitutes a default date, because the backend owns the reporting default
 * and the `Asia/Phnom_Penh` day boundary.
 */
export const useFinanceFilters = () => {
  const [params, setParams] = useSearchParams()

  const filters = useMemo<AppliedFinanceFilters>(() => {
    const from = params.get('from')?.trim()
    const to = params.get('to')?.trim()
    const currency = params.get('currency')?.trim().toUpperCase()
    const basis = params.get('basis')

    return {
      from: isCalendarDate(from ?? null) ? from : undefined,
      to: isCalendarDate(to ?? null) ? to : undefined,
      currency: currency === '' ? undefined : currency,
      basis: isFinanceBasis(basis) ? basis : 'delivered',
    }
  }, [params])

  const applyFilters = useCallback(
    (next: AppliedFinanceFilters) => {
      const updated = new URLSearchParams(params)
      setOrDelete(updated, 'from', next.from)
      setOrDelete(updated, 'to', next.to)
      setOrDelete(updated, 'currency', next.currency?.toUpperCase())
      setOrDelete(
        updated,
        'basis',
        next.basis === 'delivered' ? undefined : next.basis,
      )
      updated.delete('page')
      setParams(updated, { replace: true })
    },
    [params, setParams],
  )

  const resetFilters = useCallback(() => {
    const updated = new URLSearchParams(params)
    updated.delete('from')
    updated.delete('to')
    updated.delete('currency')
    updated.delete('basis')
    updated.delete('page')
    setParams(updated, { replace: true })
  }, [params, setParams])

  const setCurrency = useCallback(
    (currency: string) => {
      const updated = new URLSearchParams(params)
      setOrDelete(updated, 'currency', currency.toUpperCase())
      updated.delete('page')
      setParams(updated, { replace: true })
    },
    [params, setParams],
  )

  return { params, setParams, filters, applyFilters, resetFilters, setCurrency }
}
