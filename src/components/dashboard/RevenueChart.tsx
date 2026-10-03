import { useEffect, useRef, useState } from 'react'
import { formatPrice } from '@/lib/format'
import { formatDay } from '@/data/dashboard'

export interface ChartPoint {
  date: string
  revenue: number
  orders: number
}

interface RevenueChartProps {
  series: ChartPoint[]
  height?: number
}

const PAD_TOP = 14
const PAD_BOTTOM = 28
const GUTTER = 44

/** Rounds an axis maximum up to a readable 1 / 2 / 5 × 10ⁿ step. */
const niceMax = (value: number): number => {
  if (value <= 0) return 100
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const normalised = value / magnitude
  const step = normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10
  return step * magnitude
}

/** Axis value as `0` / `5k` / `7.5k` — one decimal only where it carries meaning. */
const axisLabel = (value: number): string => {
  if (value === 0) return '0'
  const thousands = value / 1000
  return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}k`
}

/**
 * Revenue over time, drawn as SVG — the storefront has no charting dependency
 * and the aesthetic wants hairline rules rather than a library's chrome.
 *
 * Rendered at the container's measured pixel width rather than scaled by a
 * viewBox, so gridlines stay exactly 1px and axis labels keep their true size.
 *
 * Deliberately reduced to one series, three gridlines and no legend: the first
 * pass overlaid a dashed comparison line, a legend row and a peak-day stat,
 * which is three ways of reading the same trend. The period-on-period number
 * lives in the panel header instead, where it is a label and not a chart.
 */
export function RevenueChart({ series, height = 250 }: RevenueChartProps) {
  const frame = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [hover, setHover] = useState<number | null>(null)

  useEffect(() => {
    const element = frame.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const plotWidth = Math.max(width - GUTTER, 0)
  const plotHeight = height - PAD_TOP - PAD_BOTTOM
  const max = niceMax(Math.max(...series.map((point) => point.revenue)) * 1.1)

  const xFor = (index: number) => GUTTER + (index / (series.length - 1)) * plotWidth
  const yFor = (value: number) => PAD_TOP + plotHeight - (value / max) * plotHeight

  const points = series.map((point, index) => ({ x: xFor(index), y: yFor(point.revenue) }))
  const line = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)},${point.y.toFixed(2)}`)
    .join(' ')
  const floor = PAD_TOP + plotHeight
  const area = points.length
    ? `${line} L${xFor(series.length - 1).toFixed(2)},${floor.toFixed(2)} L${GUTTER},${floor.toFixed(2)} Z`
    : ''

  const hasGeometry = width > 0 && series.length > 1

  // Three rules only. Enough to gauge a value, not enough to read as graph paper.
  const gridRatios = [1, 0.5, 0]

  // Roughly five date labels, thinning out as the plot narrows.
  const labelCount = plotWidth > 640 ? 6 : plotWidth > 380 ? 4 : 3
  const labelStride = Math.max(1, Math.round((series.length - 1) / (labelCount - 1)))

  const handleMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - bounds.left
    if (x < GUTTER - 12) return setHover(null)
    const ratio = (x - GUTTER) / plotWidth
    const index = Math.round(ratio * (series.length - 1))
    setHover(index >= 0 && index < series.length ? index : null)
  }

  const active = hover !== null ? series[hover] : null

  return (
    <div
      ref={frame}
      className="relative w-full touch-pan-y"
      onPointerMove={handleMove}
      onPointerLeave={() => setHover(null)}
    >
      {hasGeometry && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label="Daily revenue across the selected period"
          className="block"
        >
          <defs>
            <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-ink)" stopOpacity="0.09" />
              <stop offset="100%" stopColor="var(--color-ink)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {gridRatios.map((ratio) => {
            const y = floor - ratio * plotHeight
            return (
              <g key={ratio}>
                <line
                  x1={GUTTER}
                  y1={y}
                  x2={width}
                  y2={y}
                  stroke="var(--color-line)"
                  strokeWidth={1}
                  shapeRendering="crispEdges"
                />
                <text
                  x={GUTTER - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-ash font-mono text-[11px]"
                >
                  {axisLabel(max * ratio)}
                </text>
              </g>
            )
          })}

          {series.map((point, index) =>
            index % labelStride === 0 || index === series.length - 1 ? (
              <text
                key={point.date}
                x={xFor(index)}
                y={height - 8}
                textAnchor={index === 0 ? 'start' : index === series.length - 1 ? 'end' : 'middle'}
                className="fill-ash font-mono text-[11px]"
              >
                {formatDay(point.date)}
              </text>
            ) : null,
          )}

          <path d={area} fill="url(#revenue-fill)" />
          <path
            d={line}
            fill="none"
            stroke="var(--color-ink)"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="square"
          />

          {active && (
            <g>
              <line
                x1={xFor(hover as number)}
                y1={PAD_TOP}
                x2={xFor(hover as number)}
                y2={floor}
                stroke="var(--color-ink)"
                strokeWidth={1}
                opacity={0.35}
                shapeRendering="crispEdges"
              />
              <rect
                x={xFor(hover as number) - 4}
                y={yFor(active.revenue) - 4}
                width={8}
                height={8}
                fill="var(--color-ink)"
              />
            </g>
          )}
        </svg>
      )}

      {/* Readout — HTML so it uses the real type scale and never scales oddly */}
      {active && (
        <div
          className="pointer-events-none absolute top-0 z-20 border border-line bg-paper px-3 py-2.5"
          style={{
            left: Math.min(Math.max(xFor(hover as number) - 70, 0), Math.max(width - 152, 0)),
          }}
        >
          <p className="text-xs text-graphite">{formatDay(active.date)}</p>
          <p className="mt-1 font-mono text-[15px] tracking-[0.02em] tabular-nums">
            {formatPrice(active.revenue)}
          </p>
          <p className="mt-0.5 text-xs text-ash">
            {active.orders} order{active.orders === 1 ? '' : 's'}
          </p>
        </div>
      )}
    </div>
  )
}
