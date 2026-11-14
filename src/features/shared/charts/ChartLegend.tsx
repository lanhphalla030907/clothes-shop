import type { CSSProperties } from 'react'

interface LegendItem {
  key: string
  label: string
  color: string
  hidden?: boolean
  onToggle?: (key: string) => void
}

interface ChartLegendProps {
  items: readonly LegendItem[]
  className?: string
  style?: CSSProperties
  maxItemsPerRow?: number
}

export function ChartLegend({
  items,
  className = '',
  style,
  maxItemsPerRow = 6,
}: ChartLegendProps) {
  if (items.length === 0) return null

  const containerStyles: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.375rem',
    ...style,
  }

  const itemStyles: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
    minHeight: '2rem',
    padding: '0 0.5rem',
    fontSize: '0.719rem',
    fontWeight: 500,
    transition: 'color 0.15s ease, border-color 0.15s ease, background-color 0.15s ease',
    borderRadius: '0.375rem',
    borderWidth: '1px',
    cursor: items.some((item) => item.onToggle) ? 'pointer' : 'default',
  }

  return (
    <div
      className={`flex flex-wrap gap-1.5 ${className}`}
      style={containerStyles}
      role="group"
      aria-label="Chart legend"
    >
      {items.slice(0, maxItemsPerRow).map((item) => (
        <button
          key={item.key}
          type="button"
          aria-pressed={!item.hidden}
          onClick={() => item.onToggle?.(item.key)}
          className={`inline-flex min-h-8 items-center gap-1.5 rounded-md border px-2 text-[11.5px] font-medium transition-colors ${
            item.hidden
              ? 'border-line bg-bone text-ash'
              : 'border-line bg-paper-pure text-graphite hover:border-ink hover:text-ink'
          }`}
          style={itemStyles}
        >
          <span
            aria-hidden
            className="h-[3px] w-4 rounded-full"
            style={{
              backgroundColor: item.color,
              opacity: item.hidden ? 0.35 : 1,
              borderRadius: '9999px',
            }}
          />
          <span className={item.hidden ? 'line-through' : ''}>
            {item.label}
          </span>
        </button>
      ))}
      {items.length > maxItemsPerRow && (
        <span className="inline-flex min-h-8 items-center px-2 text-[11.5px] text-ash">
          +{items.length - maxItemsPerRow} more
        </span>
      )}
    </div>
  )
}