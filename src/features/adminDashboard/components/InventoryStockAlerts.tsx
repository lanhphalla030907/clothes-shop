import { useState } from 'react'
import { Package, PackageCheck, PackageMinus, PackageX } from 'lucide-react'
import { Skeleton } from '@/components/account/Skeleton'
import { EmptyState, ErrorState } from '@/components/account/States'
import { fetchStockAlerts } from '@/features/adminDashboard/api'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { toUserMessage } from '@/lib/api/errors'
import type {
  StockAlertFilter,
  StockAlertItem,
  StockAlertStatus,
  StockAlertSummary,
} from '@/types/api'

const FILTERS: Array<{ value: StockAlertFilter; label: string }> = [
  { value: 'alerts', label: 'Alerts' },
  { value: 'low', label: 'Low stock' },
  { value: 'out', label: 'Out of stock' },
  { value: 'all', label: 'All' },
]

const STATUS_META: Record<
  StockAlertStatus,
  { label: string; badge: string; dot: string }
> = {
  IN_STOCK: {
    label: 'In stock',
    badge: 'border-success/25 bg-success-soft text-success',
    dot: 'bg-success',
  },
  LOW_STOCK: {
    label: 'Low stock',
    badge: 'border-warning/25 bg-warning-soft text-warning',
    dot: 'bg-warning',
  },
  OUT_OF_STOCK: {
    label: 'Out of stock',
    badge: 'border-signal/25 bg-signal-soft text-signal',
    dot: 'bg-signal',
  },
}

const SUMMARY_CARDS: Array<{
  key: keyof Omit<StockAlertSummary, 'total'>
  label: string
  description: string
  icon: typeof PackageCheck
  card: string
  iconChip: string
}> = [
  {
    key: 'inStock',
    label: 'In stock',
    description: 'More than 10 available',
    icon: PackageCheck,
    card: 'border-success/20 bg-success-soft',
    iconChip: 'bg-paper-pure text-success',
  },
  {
    key: 'lowStock',
    label: 'Low stock',
    description: '1 to 10 available',
    icon: PackageMinus,
    card: 'border-warning/25 bg-warning-soft',
    iconChip: 'bg-paper-pure text-warning',
  },
  {
    key: 'outOfStock',
    label: 'Out of stock',
    description: '0 or less available',
    icon: PackageX,
    card: 'border-signal/20 bg-signal-soft',
    iconChip: 'bg-paper-pure text-signal',
  },
]

const countFor = (
  value: StockAlertFilter,
  summary: StockAlertSummary | undefined,
): number | null => {
  if (summary === undefined) return null
  if (value === 'alerts') return summary.lowStock + summary.outOfStock
  if (value === 'low') return summary.lowStock
  if (value === 'out') return summary.outOfStock
  return summary.total
}

function StockStatusBadge({ status }: { status: StockAlertStatus }) {
  const meta = STATUS_META[status]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.badge}`}
    >
      <span aria-hidden className={`size-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}

function StockRow({ item }: { item: StockAlertItem }) {
  return (
    <tr className="border-b border-line-soft last:border-b-0 transition-colors hover:bg-bone/60">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {item.productImage === null ? (
            <span
              aria-hidden
              className="grid size-10 shrink-0 place-items-center rounded-md border border-line bg-bone text-graphite"
            >
              <Package size={16} strokeWidth={1.7} />
            </span>
          ) : (
            <img
              src={item.productImage}
              alt=""
              loading="lazy"
              className="size-10 shrink-0 rounded-md border border-line object-cover"
            />
          )}
          <span className="text-[13px] font-medium text-ink">
            {item.productName}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 font-mono text-[11.5px] text-graphite">
        {item.sku}
      </td>
      <td className="px-4 py-3 text-[12px] text-graphite">
        {item.color ?? '—'}
      </td>
      <td className="px-4 py-3 text-[12px] text-graphite">
        {item.size ?? '—'}
      </td>
      <td className="px-4 py-3 text-right">
        <p className="font-mono text-[13px] font-semibold tabular-nums text-ink">
          {item.available}
        </p>
        <p className="mt-0.5 text-[10.5px] text-ash">
          {item.quantity} on hand · {item.reservedQuantity} reserved
        </p>
      </td>
      <td className="px-4 py-3">
        <StockStatusBadge status={item.status} />
      </td>
    </tr>
  )
}

export function InventoryStockAlerts() {
  const [filter, setFilter] = useState<StockAlertFilter>('alerts')
  const resource = useAsyncResource(
    (signal) => fetchStockAlerts(filter, signal),
    [filter],
  )

  const { data, error, isLoading, refetch } = resource

  if (isLoading) {
    return (
      <div role="status" aria-busy="true" className="p-5 sm:p-6">
        <span className="sr-only">Loading stock alerts</span>
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="rounded-xl border border-line bg-paper p-4"
            >
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="mt-3 h-6 w-12" />
            </div>
          ))}
        </div>
        <div className="mt-5 space-y-2">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (error !== undefined) {
    return (
      <div className="p-5 sm:p-6">
        <ErrorState
          message={toUserMessage(error)}
          onRetry={refetch}
          className="border-line bg-paper"
        />
      </div>
    )
  }

  if (data === undefined) return null

  return (
    <div className="p-5 sm:p-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {SUMMARY_CARDS.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.key}
              role="group"
              aria-label={`${card.label} variants`}
              className={`rounded-xl border p-4 ${card.card}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-graphite">
                  {card.label}
                </p>
                <span
                  className={`grid size-7 place-items-center rounded-md ${card.iconChip}`}
                >
                  <Icon size={14} strokeWidth={1.8} aria-hidden />
                </span>
              </div>
              <p className="mt-2 font-mono text-[1.65rem] font-semibold leading-none tabular-nums text-ink">
                {data.summary[card.key]}
              </p>
              <p className="mt-1.5 text-[11px] text-graphite">
                {card.description}
              </p>
            </div>
          )
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Stock status filter"
          className="inline-flex flex-wrap gap-1 rounded-lg border border-line bg-bone p-1"
        >
          {FILTERS.map((option) => {
            const active = option.value === filter
            const count = countFor(option.value, data.summary)
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(option.value)}
                className={`inline-flex min-h-8 items-center gap-1.5 rounded-md px-3 text-[12px] font-medium transition-colors ${
                  active
                    ? 'bg-ink text-paper'
                    : 'text-graphite hover:text-ink'
                }`}
              >
                {option.label}
                {count !== null && (
                  <span
                    className={`font-mono text-[10.5px] tabular-nums ${
                      active ? 'text-paper/70' : 'text-ash'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <p className="text-[11px] text-ash" aria-live="polite">
          {data.items.length} {data.items.length === 1 ? 'variant' : 'variants'}
        </p>
      </div>

      {data.items.length === 0 ? (
        <EmptyState
          title={
            data.summary.total === 0
              ? 'No stock records yet'
              : 'Nothing in this view'
          }
          description={
            data.summary.total === 0
              ? 'Variants appear here once they have an inventory row.'
              : 'No variants match this stock filter.'
          }
          align="left"
          className="mt-4"
        />
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[840px] border-collapse text-left">
            <caption className="sr-only">Inventory stock alerts</caption>
            <thead>
              <tr className="border-b border-line bg-bone">
                {[
                  'Product',
                  'SKU',
                  'Color',
                  'Size',
                  'Available',
                  'Status',
                ].map((heading, index) => (
                  <th
                    key={heading}
                    scope="col"
                    className={`px-4 py-3 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-graphite ${
                      index === 4 ? 'text-right' : ''
                    }`}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <StockRow key={item.variantId} item={item} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-ash">
        Available = stock on hand − reserved for unpaid checkouts.
      </p>
    </div>
  )
}