import type { StockAlertSummary } from '@/types/api'
import { PackageCheck, PackageMinus, PackageX } from 'lucide-react'
import { AdminStatCard } from '@/components/admin/AdminStatCard'

const SUMMARY_CARDS: Array<{
  key: keyof Omit<StockAlertSummary, 'total'>
  label: string
  hint: string
  icon: typeof PackageCheck
  status: 'success' | 'warning' | 'danger'
}> = [
  {
    key: 'inStock',
    label: 'In stock',
    hint: 'More than 10 available',
    icon: PackageCheck,
    status: 'success',
  },
  {
    key: 'lowStock',
    label: 'Low stock',
    hint: '1 to 10 available',
    icon: PackageMinus,
    status: 'warning',
  },
  {
    key: 'outOfStock',
    label: 'Out of stock',
    hint: '0 or less available',
    icon: PackageX,
    status: 'danger',
  },
]

type InventorySummaryProps = {
  summary: StockAlertSummary | undefined
  loading?: boolean
  className?: string
}

export function InventorySummary({
  summary,
  loading = false,
  className = '',
}: InventorySummaryProps) {
  const ready = summary !== undefined && !loading

  return (
    <div
      className={`grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4 ${className}`}
    >
      {SUMMARY_CARDS.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.key}
            role="group"
            aria-label={`${card.label} variants`}
          >
            <AdminStatCard
              key={card.key}
              label={card.label}
              value={ready ? summary[card.key] : undefined}
              loading={!ready}
              hint={card.hint}
              icon={Icon}
              emphasis={card.status !== 'success' && ready && summary[card.key] > 0}
            />
          </div>
        )
      })}
    </div>
  )
}
