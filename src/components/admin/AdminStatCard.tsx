import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Skeleton } from '@/components/account/Skeleton'

type AdminStatCardProps = {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: LucideIcon
  loading?: boolean
  trend?: {
    value: string
    positive?: boolean
  }
  className?: string
}

export function AdminStatCard({
  label,
  value,
  hint,
  icon: Icon,
  loading = false,
  trend,
  className = '',
}: AdminStatCardProps) {
  return (
    <div
      className={`relative flex flex-col justify-between rounded-xl border border-line bg-paper-pure p-5 shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12.5px] font-medium text-graphite">{label}</span>
        {Icon && (
          <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-bone text-graphite">
            <Icon size={16} strokeWidth={1.8} aria-hidden />
          </div>
        )}
      </div>

      <div className="mt-3">
        {loading ? (
          <Skeleton className="h-8 w-20 rounded-md" />
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="font-sans text-[1.75rem] font-bold tracking-tight text-ink tabular-nums">
              {value}
            </span>
            {trend && (
              <span
                className={`inline-flex items-center text-[11.5px] font-semibold ${
                  trend.positive ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {trend.positive ? '↑' : '↓'} {trend.value}
              </span>
            )}
          </div>
        )}

        {hint && (
          <p className="mt-1.5 text-[11.5px] text-graphite/90">{hint}</p>
        )}
      </div>
    </div>
  )
}
