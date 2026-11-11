import type { ReactNode } from 'react'
import { formatRatioPercent } from '../utils'

/** A visible warning that a profit figure covers only known-cost revenue. */
export function PartialProfitBadge() {
  return (
    <span className="inline-flex w-fit items-center border border-warning/25 bg-warning-soft px-2 py-0.5 text-[11px] font-semibold text-warning">
      Partial profit
    </span>
  )
}

/** A visible warning that a row has no comparable historical cost. */
export function UnknownCostBadge() {
  return (
    <span className="inline-flex w-fit items-center border border-line bg-bone px-2 py-0.5 text-[11px] font-medium text-graphite">
      Cost unknown
    </span>
  )
}

export function CoverageBadge({ coverage }: { coverage: string | null }) {
  const label = formatRatioPercent(coverage)

  if (label === null) {
    return <span className="text-[12px] text-ash">—</span>
  }

  return (
    <span className="inline-flex w-fit items-center border border-line bg-bone px-2 py-0.5 font-mono text-[11px] tabular-nums text-ink">
      {label}
    </span>
  )
}

/** A coverage bar whose width is a display of the server's ratio, not a new sum. */
export function CoverageBar({ coverage }: { coverage: string | null }) {
  const percent = coverage === null ? null : Number(coverage)
  const width =
    percent === null || !Number.isFinite(percent)
      ? 0
      : Math.max(0, Math.min(100, percent * 100))

  return (
    <div
      className="mt-3 h-1.5 overflow-hidden bg-line-soft"
      role="img"
      aria-label={
        percent === null
          ? 'Cost coverage unavailable'
          : `Cost coverage ${formatRatioPercent(coverage) ?? 'unavailable'}`
      }
    >
      <div
        className="h-full bg-ink transition-all duration-300"
        style={{ width: `${width}%` }}
      />
    </div>
  )
}

/** `Unknown` is deliberately not rendered as a zero amount. */
export function UnknownMoney({ children }: { children?: ReactNode }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2 text-[13px] font-medium text-ash">
      Unknown
      {children}
    </span>
  )
}
