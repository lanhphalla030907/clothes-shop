import { useEffect, useMemo } from 'react'
import { RefreshCw } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { EmptyState, ErrorState, InlineNotice } from '@/components/account/States'
import { Skeleton } from '@/components/account/Skeleton'
import { toUserMessage } from '@/lib/api/errors'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import type { FinanceTrendGranularity } from '@/types/api'
import { fetchFinanceRevenueTrend } from '../api'
import type { AppliedFinanceFilters } from '../hooks/useFinanceFilters'
import {
  FINANCE_GRANULARITY_OPTIONS,
  formatFinanceRange,
  granularityLabel,
  isFinanceGranularity,
} from '../utils'
import { FinanceSectionHeading } from './FinanceSectionHeading'
import { RevenueTrendChart } from './RevenueTrendChart'

type RevenueTrendSectionProps = {
  filters: AppliedFinanceFilters
  params: URLSearchParams
  setParams: (next: URLSearchParams, options?: { replace?: boolean }) => void
  onCurrencyChange: (currency: string) => void
  onCurrencies: (currencies: readonly string[]) => void
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
 * Currency-separated revenue and known-cost profit over time.
 *
 * When more than one currency is present and none is selected, the chart is
 * withheld until the administrator chooses one. A combined multi-currency line
 * would be a fabricated exchange rate, so it is never drawn.
 */
export function RevenueTrendSection({
  filters,
  params,
  setParams,
  onCurrencyChange,
  onCurrencies,
}: RevenueTrendSectionProps) {
  const granularity: FinanceTrendGranularity = isFinanceGranularity(
    params.get('granularity'),
  )
    ? (params.get('granularity') as FinanceTrendGranularity)
    : 'day'

  const query = useMemo(
    () => ({ ...filters, granularity }),
    [filters, granularity],
  )

  const trend = useAsyncResource(
    (signal) => fetchFinanceRevenueTrend(query, signal),
    [query],
  )

  useEffect(() => {
    if (!trend.data) return
    onCurrencies(trend.data.series.map((series) => series.currency))
  }, [trend.data, onCurrencies])

  const updateGranularity = (next: FinanceTrendGranularity) => {
    const updated = new URLSearchParams(params)
    setOrDelete(updated, 'granularity', next === 'day' ? undefined : next)
    setParams(updated, { replace: true })
  }

  const selectedSeries =
    trend.data?.series.find((series) => series.currency === filters.currency) ??
    (trend.data?.series.length === 1 ? trend.data.series[0] : undefined)
  const requiresCurrency =
    filters.currency === undefined &&
    trend.data !== undefined &&
    trend.data.series.length > 1

  return (
    <section className="space-y-5" aria-label="Revenue trend">
      <FinanceSectionHeading
        eyebrow="Revenue trend"
        title="Revenue and known-cost profit over time"
        description="Buckets are calculated in the reporting timezone. Null cost or profit breaks the line rather than becoming zero."
        action={
          <Action
            variant="outline"
            size="sm"
            onClick={trend.refetch}
            disabled={trend.isRefreshing}
          >
            <RefreshCw size={14} strokeWidth={1.8} aria-hidden />
            Refresh
          </Action>
        }
      />

      <div className="flex flex-col gap-3 border border-line bg-paper">
        <div>
          <p className="text-[12px] font-medium text-graphite">Granularity</p>
          <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Trend granularity">
            {FINANCE_GRANULARITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={granularity === option.value}
                onClick={() => updateGranularity(option.value)}
                className={`min-h-9 border px-3 text-[12px] font-medium transition-colors ${
                  granularity === option.value
                    ? 'border-ink bg-ink text-paper'
                    : 'border-line bg-paper-pure text-ink hover:border-ink'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        {trend.data && (
          <p className="text-[12px] text-graphite sm:text-right" aria-live="polite">
            <span className="font-medium text-ink">
              {formatFinanceRange(trend.data.range)}
            </span>
            <span className="mt-0.5 block">
              {granularityLabel(trend.data.granularity)} · {trend.data.timezone}
            </span>
          </p>
        )}
      </div>

      <p className="border border-line bg-bone px-4 py-3 text-[12px] leading-relaxed text-graphite">
        Yearly buckets are not exposed by the current finance API. Use a
        12-month window with monthly granularity for an annual view.
      </p>

      {trend.error !== undefined && trend.data === undefined && (
        <ErrorState message={toUserMessage(trend.error)} onRetry={trend.refetch} />
      )}

      {trend.error !== undefined && trend.data !== undefined && (
        <InlineNotice message={toUserMessage(trend.error)} />
      )}

      {trend.isRefreshing && (
        <p className="text-[12px] text-graphite" role="status">
          Refreshing trend…
        </p>
      )}

      {trend.isLoading && trend.data === undefined && <TrendSkeleton />}

      {!trend.isLoading &&
        trend.data !== undefined &&
        trend.data.series.length === 0 && (
          <EmptyState
            align="left"
            eyebrow="No trend data"
            title="No eligible revenue in this reporting window"
            description="Change the date range or recognition basis, or wait until an order is delivered or its cash is evidenced."
            action={
              <Action variant="outline" size="sm" onClick={trend.refetch}>
                Refresh
              </Action>
            }
          />
        )}

      {requiresCurrency && trend.data && (
        <div className="border border-line bg-paper px-5 py-6 sm:px-6">
          <p className="eyebrow text-graphite">Choose a currency</p>
          <h3 className="mt-1.5 text-[16px] font-semibold text-ink">
            The trend is available in more than one currency
          </h3>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-graphite">
            Amounts in different currencies cannot be combined. Select one
            currency to draw its trend.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {trend.data.series.map((series) => (
              <button
                key={series.currency}
                type="button"
                onClick={() => onCurrencyChange(series.currency)}
                className="min-h-10 border border-line bg-paper-pure px-4 font-mono text-[12px] font-semibold text-ink transition-colors hover:border-ink hover:bg-bone"
              >
                {series.currency}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedSeries && (
        <div className="border border-line bg-paper">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4 sm:px-6">
            <div>
              <p className="font-mono text-[12px] font-semibold tracking-[0.08em] text-ink">
                {selectedSeries.currency}
              </p>
              <p className="mt-1 text-[12px] text-graphite">
                {selectedSeries.buckets.length}{' '}
                {selectedSeries.buckets.length === 1 ? 'bucket' : 'buckets'}
              </p>
            </div>
            <p className="text-[11px] text-ash">
              Hover or focus a period for exact values.
            </p>
          </div>
          <RevenueTrendChart
            buckets={selectedSeries.buckets}
            currency={selectedSeries.currency}
            granularity={trend.data?.granularity ?? granularity}
          />
        </div>
      )}
    </section>
  )
}

const TrendSkeleton = () => (
  <div
    className="border border-line bg-paper p-5 sm:p-6"
    role="status"
    aria-busy="true"
    aria-label="Loading revenue trend"
  >
    <span className="sr-only">Loading revenue trend</span>
    <Skeleton className="h-3 w-44" />
    <Skeleton className="mt-6 h-[320px] w-full" />
  </div>
)
