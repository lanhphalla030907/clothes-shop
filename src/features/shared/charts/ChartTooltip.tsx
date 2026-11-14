import type { CSSProperties, ReactNode } from 'react'

interface ChartTooltipPayload {
  name: string
  value: number | string
  color: string
  payload: {
    formattedValue?: string
    label?: string
    metricLabel?: string
    [key: string]: unknown
  }
}

interface ChartTooltipProps {
  active?: boolean
  payload?: readonly ChartTooltipPayload[]
  label?: string
  labelFormatter?: (label: string) => ReactNode
  formatter?: (value: number | string, name: string, payload: ChartTooltipPayload) => ReactNode
  className?: string
  style?: CSSProperties
  title?: string
}

export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  formatter,
  className = '',
  style,
  title,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  const defaultLabelFormatter = (labelValue: string) => (
    <p className="text-[10.5px] font-semibold tracking-[0.06em] text-graphite uppercase">
      {labelValue}
    </p>
  )

  const renderLabel = labelFormatter ?? defaultLabelFormatter

  return (
    <div
      role="tooltip"
      className={`pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-xl border border-line bg-paper-pure p-3 shadow-[var(--shadow-raised)] ${className}`}
      style={{
        left: '50%',
        width: 260,
        ...style,
      } as CSSProperties}
    >
      {title && renderLabel(title)}
      {label && renderLabel(label)}
      <dl className="mt-2 space-y-1.5">
        {payload.map((entry, index) => {
          const formattedValue = formatter
            ? formatter(entry.value, entry.name, entry)
            : entry.payload.formattedValue ?? String(entry.value)

          return (
            <div key={index} className="flex items-start justify-between gap-3 text-[11.5px]">
              <dt className="flex items-center gap-1.5 text-graphite">
                <span
                  aria-hidden
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="leading-tight">
                  {entry.payload.metricLabel ?? entry.name}
                </span>
              </dt>
              <dd className="shrink-0 font-mono text-ink tabular-nums">
                {typeof formattedValue === 'string' ? formattedValue : String(formattedValue)}
              </dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}