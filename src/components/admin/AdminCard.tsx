import type { HTMLAttributes, ReactNode } from 'react'

type AdminCardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
  className?: string
}

export function AdminCard({ children, className = '', ...rest }: AdminCardProps) {
  return (
    <div
      className={`rounded-xl border border-line bg-paper-pure shadow-xs transition-shadow ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}

type AdminCardHeaderProps = {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}

export function AdminCardHeader({
  title,
  description,
  action,
  className = '',
}: AdminCardHeaderProps) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6 ${className}`}
    >
      <div>
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {description && (
          <p className="mt-0.5 text-[12.5px] text-graphite">{description}</p>
        )}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  )
}

export function AdminCardBody({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={`p-5 sm:p-6 ${className}`}>{children}</div>
}

export function AdminCardFooter({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`flex items-center justify-between border-t border-line-soft bg-canvas/40 px-5 py-3 sm:px-6 ${className}`}
    >
      {children}
    </div>
  )
}
