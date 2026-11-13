import { Money } from '@/components/account/Bits'
import { EmptyState } from '@/components/account/States'
import { Skeleton } from '@/components/account/Skeleton'
import type { AdminBestSeller } from '@/features/adminProducts/api'

type BestSellersPanelProps = {
  items?: readonly AdminBestSeller[]
  isLoading: boolean
}

/** All-time best sellers from the existing catalogue endpoint. */
export function BestSellersPanel({
  items,
  isLoading,
}: BestSellersPanelProps) {
  if (isLoading && items === undefined) {
    return (
      <div className="space-y-2 p-4" role="status" aria-busy="true">
        <span className="sr-only">Loading best-selling products</span>
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-11 w-full rounded-md" />
        ))}
      </div>
    )
  }

  if ((items?.length ?? 0) === 0) {
    return (
      <div className="p-5">
        <EmptyState
          align="left"
          eyebrow="No sales yet"
          title="No products have sold yet"
          description="Best-selling products appear once a non-cancelled order is paid or its COD cash is collected."
        />
      </div>
    )
  }

  return (
    <>
      <ul className="divide-y divide-line-soft">
        {items!.slice(0, 6).map((item) => (
          <li
            key={item.productId}
            className="flex items-center gap-3 px-4 py-3 sm:px-5"
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-md bg-bone font-mono text-[11px] font-semibold text-graphite">
              {item.rank}
            </span>
            {item.image ? (
              <img
                src={item.image}
                alt=""
                className="size-9 shrink-0 rounded-md bg-bone object-cover"
              />
            ) : (
              <div className="size-9 shrink-0 rounded-md bg-bone" />
            )}
            <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-ink">
                  {item.name}
                </p>
                <p className="text-[11px] text-graphite">
                  {item.unitsSold} {item.unitsSold === 1 ? 'unit' : 'units'} sold
                </p>
              </div>
              <Money
                amount={String(item.revenue ?? '0')}
                className="shrink-0 font-mono text-[11.5px] font-semibold"
              />
            </div>
          </li>
        ))}
      </ul>
      <p className="border-t border-line-soft px-4 py-2.5 text-[10.5px] leading-relaxed text-ash sm:px-5">
        All-time units and revenue from the best-sellers endpoint. The endpoint
        does not return a currency, so amounts are shown in USD.
      </p>
    </>
  )
}
