import { useState } from 'react'
import type { FormEvent } from 'react'
import { CalendarDays, ChevronDown, RotateCcw } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { FormError, TextField } from '@/components/account/Field'
import {
  DASHBOARD_PERIOD_PRESETS,
  REPORTING_TIMEZONE,
  formatReportingRange,
  validateReportingRange,
  type DashboardPeriodPreset,
  type ReportingRange,
} from '../reporting'

type PeriodSelectorProps = {
  preset: DashboardPeriodPreset
  range: ReportingRange
  isRefreshing?: boolean
  onPreset: (preset: Exclude<DashboardPeriodPreset, 'custom'>) => void
  onCustom: (from: string, to: string) => void
}

/**
 * One reporting window for the whole overview.
 *
 * Presets are applied immediately; a custom range is a draft until Apply, so
 * typing a date does not fire a request per keystroke. Validation mirrors the
 * finance API's calendar-date and 366-day rules.
 */
export function PeriodSelector({
  preset,
  range,
  isRefreshing = false,
  onPreset,
  onCustom,
}: PeriodSelectorProps) {
  const [customOpen, setCustomOpen] = useState(preset === 'custom')
  const [from, setFrom] = useState(range.from)
  const [to, setTo] = useState(range.to)
  const [error, setError] = useState<string>()

  const choosePreset = (next: Exclude<DashboardPeriodPreset, 'custom'>) => {
    setError(undefined)
    setCustomOpen(false)
    onPreset(next)
  }

  const openCustom = () => {
    setError(undefined)
    setFrom(range.from)
    setTo(range.to)
    setCustomOpen((current) => !current)
  }

  const submitCustom = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationError = validateReportingRange(from, to)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(undefined)
    onCustom(from, to)
  }

  return (
    <section
      aria-label="Reporting period"
      className="rounded-xl border border-line bg-paper-pure shadow-xs"
    >
      <div className="flex flex-col gap-3 border-b border-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-bone text-graphite">
            <CalendarDays size={16} strokeWidth={1.8} aria-hidden />
          </span>
          <div>
            <p className="text-[13px] font-semibold text-ink">Reporting period</p>
            <p className="text-[12px] text-graphite" aria-live="polite">
              {formatReportingRange(range)} · {REPORTING_TIMEZONE}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isRefreshing && (
            <span className="text-[12px] text-graphite" role="status">
              Refreshing…
            </span>
          )}
          <Action
            variant="ghost"
            size="sm"
            onClick={() => choosePreset('30d')}
            disabled={preset === '30d'}
          >
            <RotateCcw size={14} strokeWidth={1.8} aria-hidden />
            Last 30 days
          </Action>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-5">
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Reporting period presets"
        >
          {DASHBOARD_PERIOD_PRESETS.map((option) => {
            const active = preset === option.value
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => choosePreset(option.value)}
                className={`min-h-9 rounded-lg border px-3 text-[12px] font-medium transition-colors ${
                  active
                    ? 'border-ink bg-ink text-paper shadow-xs'
                    : 'border-line bg-paper-pure text-ink hover:border-ink'
                }`}
              >
                {option.label}
              </button>
            )
          })}
          <button
            type="button"
            aria-pressed={preset === 'custom'}
            aria-expanded={customOpen}
            onClick={openCustom}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-[12px] font-medium transition-colors ${
              preset === 'custom'
                ? 'border-ink bg-ink text-paper shadow-xs'
                : 'border-line bg-paper-pure text-ink hover:border-ink'
            }`}
          >
            Custom range
            <ChevronDown
              size={13}
              strokeWidth={1.8}
              aria-hidden
              className={`transition-transform ${customOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {customOpen && (
        <form
          onSubmit={submitCustom}
          className="space-y-4 border-t border-line bg-canvas/30 px-4 py-4 sm:px-5"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:max-w-xl">
            <TextField
              type="date"
              name="dashboard-from"
              label="Start date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              hint="Inclusive, in the reporting timezone"
            />
            <TextField
              type="date"
              name="dashboard-to"
              label="End date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              hint="Inclusive, in the reporting timezone"
            />
          </div>
          {error && <FormError message={error} />}
          <div className="flex flex-wrap items-center gap-2">
            <Action type="submit" size="sm">
              Apply range
            </Action>
            <p className="text-[12px] text-graphite">
              The finance API accepts ranges up to 366 days.
            </p>
          </div>
        </form>
      )}
    </section>
  )
}
