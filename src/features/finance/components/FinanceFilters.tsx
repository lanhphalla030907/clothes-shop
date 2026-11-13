import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  CalendarDays,
  Coins,
  RotateCcw,
  Scale,
  SlidersHorizontal,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { FormError, SelectField, TextField } from '@/components/account/Field'
import type { FinanceRangeResponse } from '@/types/api'
import type { AppliedFinanceFilters } from '../hooks/useFinanceFilters'
import {
  FINANCE_BASIS_OPTIONS,
  basisDescription,
  basisLabel,
  formatFinanceRange,
  validateFinanceDateRange,
} from '../utils'

type Draft = {
  from: string
  to: string
  currency: string
  basis: AppliedFinanceFilters['basis']
}

const draftsFrom = (filters: AppliedFinanceFilters): Draft => ({
  from: filters.from ?? '',
  to: filters.to ?? '',
  currency: filters.currency ?? '',
  basis: filters.basis,
})

type FinanceFiltersProps = {
  filters: AppliedFinanceFilters
  currencyOptions: readonly string[]
  range?: FinanceRangeResponse
  onApply: (filters: AppliedFinanceFilters) => void
  onReset: () => void
}

/**
 * The reporting window shared by every finance panel.
 *
 * Inputs are drafts until Apply is pressed, so typing a date cannot fire a
 * request per keystroke and the applied URL remains the single source of truth.
 */
export function FinanceFilters({
  filters,
  currencyOptions,
  range,
  onApply,
  onReset,
}: FinanceFiltersProps) {
  const [draft, setDraft] = useState<Draft>(() => draftsFrom(filters))
  const [error, setError] = useState<string>()

  useEffect(() => {
    const nextDraft = draftsFrom(filters)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync draft with URL filters; functional update prevents cascading renders
    setDraft((current) => {
      if (
        current.from === nextDraft.from &&
        current.to === nextDraft.to &&
        current.currency === nextDraft.currency &&
        current.basis === nextDraft.basis
      ) return current
      return nextDraft
    })
    setError(undefined)
  }, [filters])

  const currencies = Array.from(
    new Set(
      [...currencyOptions, filters.currency].filter(
        (value): value is string => typeof value === 'string' && value !== '',
      ),
    ),
  ).sort()

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationError = validateFinanceDateRange(draft.from, draft.to)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(undefined)
    onApply({
      from: draft.from === '' ? undefined : draft.from,
      to: draft.to === '' ? undefined : draft.to,
      currency: draft.currency === '' ? undefined : draft.currency,
      basis: draft.basis,
    })
  }

  const reset = () => {
    setDraft(draftsFrom({ basis: 'delivered' }))
    setError(undefined)
    onReset()
  }

  return (
    <section className="filter-bar overflow-hidden" aria-label="Reporting filters">
      <div className="flex flex-col gap-2 border-b border-line px-5 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div>
          <p className="eyebrow flex items-center gap-1.5 text-graphite">
            <SlidersHorizontal size={12} strokeWidth={1.8} aria-hidden />
            Reporting window
          </p>
          <h2 className="mt-1 text-[16px] font-semibold text-ink">Filters</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-graphite">
            Dates are calendar labels in {range?.timezone ?? 'Asia/Phnom_Penh'}. The server applies the
            reporting boundary; the browser does not shift it.
          </p>
        </div>
        {range && (
          <p className="text-[12px] text-graphite sm:text-right" aria-live="polite">
            <span className="font-medium text-ink">{formatFinanceRange(range)}</span>
            <span className="mt-0.5 block">
              {basisLabel(range.basis)} basis · {range.timezone}
            </span>
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-bone/40 px-5 py-3 sm:px-6">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-graphite">
          Active
        </span>
        <FilterChip icon={CalendarDays}>
          {range ? formatFinanceRange(range) : 'Server default window'}
        </FilterChip>
        <FilterChip icon={Coins}>{filters.currency ?? 'All currencies'}</FilterChip>
        <FilterChip icon={Scale}>{basisLabel(filters.basis)} basis</FilterChip>
      </div>

      <form onSubmit={submit} className="space-y-5 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <TextField
            type="date"
            name="finance-from"
            label="Start date"
            value={draft.from}
            onChange={(event) =>
              setDraft((current) => ({ ...current, from: event.target.value }))
            }
            hint="Leave blank for the server's default window"
          />
          <TextField
            type="date"
            name="finance-to"
            label="End date"
            value={draft.to}
            onChange={(event) =>
              setDraft((current) => ({ ...current, to: event.target.value }))
            }
            hint="Inclusive, in the reporting timezone"
          />
          <SelectField
            name="finance-currency"
            label="Currency"
            value={draft.currency}
            onChange={(event) =>
              setDraft((current) => ({ ...current, currency: event.target.value }))
            }
            hint="Currencies are never combined"
          >
            <option value="">All currencies</option>
            {currencies.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </SelectField>
          <SelectField
            name="finance-basis"
            label="Revenue basis"
            value={draft.basis}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                basis: event.target.value as Draft['basis'],
              }))
            }
            hint={basisDescription(draft.basis)}
          >
            {FINANCE_BASIS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </div>

        {error && <FormError message={error} />}

        <div className="flex flex-wrap items-center gap-2 border-t border-line-soft pt-4">
          <Action type="submit" size="sm">
            Apply filters
          </Action>
          <Action type="button" variant="ghost" size="sm" onClick={reset}>
            <RotateCcw size={14} strokeWidth={1.8} aria-hidden />
            Reset
          </Action>
          <p className="text-[12px] text-graphite">
            Defaults and the 366-day maximum are enforced by the finance API.
          </p>
        </div>
      </form>
    </section>
  )
}

function FilterChip({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper-pure px-2.5 py-1 text-[11.5px] font-medium text-graphite">
      <Icon size={12} strokeWidth={1.8} aria-hidden />
      {children}
    </span>
  )
}