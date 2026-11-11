import type { ReactNode } from 'react'

export type AdminBadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

type AdminBadgeProps = {
  children: ReactNode
  variant?: AdminBadgeVariant
  size?: 'sm' | 'md'
  dot?: boolean
  className?: string
}

const variantStyles: Record<AdminBadgeVariant, { pill: string; dot: string }> = {
  neutral: {
    pill: 'border-line bg-bone text-graphite',
    dot: 'bg-graphite',
  },
  success: {
    pill: 'border-emerald-200/80 bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-500',
  },
  warning: {
    pill: 'border-amber-200/80 bg-amber-50 text-amber-700',
    dot: 'bg-amber-500',
  },
  danger: {
    pill: 'border-rose-200/80 bg-rose-50 text-rose-700',
    dot: 'bg-rose-500',
  },
  info: {
    pill: 'border-blue-200/80 bg-blue-50 text-blue-700',
    dot: 'bg-blue-500',
  },
}

export function AdminBadge({
  children,
  variant = 'neutral',
  size = 'md',
  dot = true,
  className = '',
}: AdminBadgeProps) {
  const styles = variantStyles[variant]
  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[10.5px] leading-tight'
      : 'px-2.5 py-1 text-[11.5px] leading-tight'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap shadow-2xs ${sizeClasses} ${styles.pill} ${className}`}
    >
      {dot && <span aria-hidden className={`size-1.5 rounded-full ${styles.dot}`} />}
      {children}
    </span>
  )
}
