interface SparklineProps {
  /** Values in chronological order. Any scale — the line is normalised. */
  values: number[]
  /** Draw the hairline baseline under the series. */
  baseline?: boolean
  /** Colour of the line and its fill. */
  tone?: 'ink' | 'signal'
  /**
   * Fills its container by default. Two competing width utilities on one element
   * is a coin toss in Tailwind, so size it with a wrapper or a width class that
   * agrees with `w-full` rather than fighting it.
   */
  className?: string
}

const W = 120
const H = 34

const strokeFor = (tone: SparklineProps['tone']) =>
  tone === 'signal' ? 'var(--color-signal)' : 'var(--color-ink)'

/**
 * Dependency-free micro trend. The path is stretched to the viewBox and the
 * stroke is pinned with `non-scaling-stroke`, so it stays a true 1px hairline
 * at any rendered size instead of thickening with the container.
 */
export function Sparkline({ values, baseline = false, tone = 'ink', className = '' }: SparklineProps) {
  if (values.length < 2) return null

  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1

  // Inset by the stroke width so the extremes are not clipped at either end.
  const pad = 2
  const usable = H - pad * 2

  const x = (index: number) => (index / (values.length - 1)) * W
  const y = (value: number) => pad + usable - ((value - min) / span) * usable

  const line = values.map((value, index) => `${index === 0 ? 'M' : 'L'}${x(index)},${y(value)}`).join(' ')
  const area = `${line} L${W},${H} L0,${H} Z`
  const colour = strokeFor(tone)
  const gradientId = `spark-${tone}-${values.length}-${Math.round(min)}`

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      aria-hidden
      className={`h-8 w-full overflow-visible ${className}`}
    >
      {baseline && (
        <line
          x1={0}
          y1={H - 0.5}
          x2={W}
          y2={H - 0.5}
          stroke="var(--color-line)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      )}
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colour} stopOpacity="0.16" />
          <stop offset="100%" stopColor={colour} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke={colour}
        strokeWidth={1.25}
        strokeLinecap="square"
        strokeLinejoin="miter"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r={1.6} fill={colour} />
    </svg>
  )
}
