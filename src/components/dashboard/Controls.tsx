import { useId, type ReactNode } from 'react'
import { Search } from 'lucide-react'

/* -------------------------------- search --------------------------------- */

interface SearchFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

/**
 * Boxed search. A table filter needs a real field, so this deliberately breaks
 * the storefront's border-bottom-only rule — but it keeps the 44px height so it
 * is comfortable to hit on a phone.
 */
export function SearchField({ value, onChange, placeholder, className = '' }: SearchFieldProps) {
  return (
    <div className={`relative flex items-center ${className}`}>
      <Search
        size={16}
        strokeWidth={1.5}
        aria-hidden
        className="pointer-events-none absolute left-3.5 text-ash"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-11 w-full border border-line bg-paper pl-10 pr-3 text-[13px] transition-colors duration-200 placeholder:text-ash hover:border-graphite focus:border-ink focus:outline-none"
      />
    </div>
  )
}

/* ------------------------------- chip row -------------------------------- */

interface ChipRowProps<T extends string> {
  options: { value: T; label: string; count?: number }[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  /** Show a count beside each chip. */
  counts?: boolean
  className?: string
}

/**
 * Filter chips on one scrollable line. A segmented control that wraps onto
 * three rows is what made the first pass feel fiddly; this scrolls sideways on
 * a phone and never breaks the row on a desktop.
 */
export function ChipRow<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  counts = false,
  className = '',
}: ChipRowProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-0.5 ${className}`}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`inline-flex h-11 shrink-0 items-center gap-2 border px-4 font-mono text-[11px] uppercase tracking-[0.1em] whitespace-nowrap transition-colors duration-200 ${
              active
                ? 'border-ink bg-ink text-paper'
                : 'border-line bg-paper text-graphite hover:border-graphite hover:text-ink'
            }`}
          >
            {option.label}
            {counts && option.count !== undefined && (
              <span className={active ? 'text-paper/60' : 'text-ash'}>{option.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/* --------------------------------- switch -------------------------------- */

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
  /** Draw the hairline above this row. */
  divided?: boolean
}

/**
 * Square toggle — a rounded pill would break the house radius rule, so "off" is
 * an empty hairline box and "on" is a filled one. The whole label is the hit
 * area, not just the 24px box.
 */
export function Switch({ checked, onChange, label, description, divided = true }: SwitchProps) {
  const id = useId()

  return (
    <label
      htmlFor={id}
      className={`flex cursor-pointer items-start justify-between gap-6 py-4 ${
        divided ? 'border-b border-line-soft' : ''
      }`}
    >
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold">{label}</span>
        {description && (
          <span className="mt-1 block text-[13px] leading-relaxed text-graphite">{description}</span>
        )}
      </span>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={`mt-0.5 grid size-6 shrink-0 place-items-center border transition-colors duration-200 peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-ink peer-focus-visible:outline-offset-2 ${
          checked ? 'border-ink bg-ink' : 'border-line bg-paper'
        }`}
      >
        {checked && <span className="size-2 bg-paper" />}
      </span>
    </label>
  )
}

/* --------------------------------- meter --------------------------------- */

interface MeterProps {
  value: number
  max: number
  tone?: 'ink' | 'signal' | 'bone'
  className?: string
}

/** Fill against a hairline track — a bar chart at 4px tall. */
export function Meter({ value, max, tone = 'ink', className = '' }: MeterProps) {
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0
  const fill = tone === 'signal' ? 'bg-signal' : tone === 'bone' ? 'bg-ash' : 'bg-ink'

  return (
    <div className={`h-1 w-full bg-line ${className}`}>
      <div
        className={`h-full transition-[width] duration-700 ease-editorial ${fill}`}
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  )
}

/* ------------------------------- stat row -------------------------------- */

interface StatRowProps {
  label: string
  value: ReactNode
  hint?: string
  /** Meter underneath, scaled against `meterMax`. */
  meter?: number
  meterMax?: number
  meterTone?: MeterProps['tone']
}

export function StatRow({ label, value, hint, meter, meterMax = 100, meterTone }: StatRowProps) {
  return (
    <div className="py-3.5">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-[13px] text-graphite">{label}</span>
        <span className="font-mono text-[13px] tabular-nums">{value}</span>
      </div>
      {meter !== undefined && (
        <Meter value={meter} max={meterMax} tone={meterTone} className="mt-2.5" />
      )}
      {hint && <p className="mt-2 text-xs text-ash">{hint}</p>}
    </div>
  )
}

/* ------------------------------- key / value ----------------------------- */

export function KeyValue({
  items,
  className = '',
}: {
  items: { label: string; value: ReactNode }[]
  className?: string
}) {
  return (
    <dl className={`grid gap-x-8 gap-y-3 sm:grid-cols-2 ${className}`}>
      {items.map((item) => (
        <div key={item.label} className="flex items-baseline justify-between gap-4 border-b border-line-soft pb-2.5">
          <dt className="text-[13px] text-graphite">{item.label}</dt>
          <dd className="font-mono text-[13px] tracking-[0.02em] tabular-nums">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/* ------------------------------ ranked rows ------------------------------ */

interface RankedRow {
  id: string
  label: string
  meta: string
  value: string
  /** 0-100, scaled against the largest row by the caller. */
  share: number
}

/** Leaderboard: rank, name, share bar, figure. */
export function RankedList({ rows }: { rows: RankedRow[] }) {
  return (
    <ul className="divide-y divide-line-soft">
      {rows.map((row, index) => (
        <li key={row.id} className="flex items-center gap-4 py-3.5">
          <span className="w-5 shrink-0 font-mono text-[11px] text-ash tabular-nums">
            {String(index + 1).padStart(2, '0')}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold">{row.label}</p>
            <p className="mt-0.5 truncate text-xs text-graphite">{row.meta}</p>
            <Meter value={row.share} max={100} className="mt-2" />
          </div>
          <span className="shrink-0 font-mono text-[13px] tabular-nums">{row.value}</span>
        </li>
      ))}
    </ul>
  )
}

/* -------------------------------- buttons -------------------------------- */

interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  className?: string
}

const BUTTON_VARIANTS = {
  primary: 'border-ink bg-ink text-paper hover:bg-ink-soft',
  secondary: 'border-line bg-paper text-ink hover:border-graphite',
  ghost: 'border-transparent text-graphite hover:border-line hover:text-ink',
} as const

/**
 * Square 44px action. The one filled `primary` per page is the only thing on
 * screen that looks like a call to action, which is what stops a dashboard from
 * reading as a wall of equal-weight buttons.
 */
export function Button({ children, onClick, variant = 'secondary', className = '' }: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-11 items-center justify-center gap-2 border px-5 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors duration-200 ${BUTTON_VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

interface IconButtonProps {
  label: string
  children: ReactNode
  onClick?: () => void
  /** Show the unread dot — notifications only. */
  flagged?: boolean
  className?: string
}

/** Square 44px icon button that inverts to ink on hover. */
export function IconButton({ label, children, onClick, flagged = false, className = '' }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`relative grid size-11 shrink-0 place-items-center border border-line bg-paper text-ink transition-colors duration-200 hover:border-ink hover:bg-ink hover:text-paper ${className}`}
    >
      {children}
      {flagged && <span aria-hidden className="absolute top-2.5 right-2.5 size-1.5 bg-signal" />}
    </button>
  )
}

/* ------------------------------ form fields ------------------------------ */

interface FieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  hint?: string
  placeholder?: string
  type?: string
  mono?: boolean
  suffix?: string
}

/**
 * Settings input. Border-bottom only, exactly as on the storefront checkout, so
 * the admin reads as part of the same product rather than a bolted-on CMS.
 */
export function FormField({
  label,
  value,
  onChange,
  hint,
  placeholder,
  type = 'text',
  mono = false,
  suffix,
}: FieldProps) {
  const id = useId()

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[13px] text-graphite">
        {label}
      </label>
      <div className="flex items-baseline gap-3">
        <input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={`h-12 w-full border-b bg-transparent transition-colors duration-200 placeholder:text-ash hover:border-graphite focus:border-ink focus:outline-none ${
            mono ? 'font-mono text-[13px] tracking-[0.06em] tabular-nums' : 'text-sm'
          }`}
        />
        {suffix && <span className="font-mono text-[11px] text-ash">{suffix}</span>}
      </div>
      {hint && <p className="mt-2 text-xs text-ash">{hint}</p>}
    </div>
  )
}

interface SelectFieldProps<T extends string> {
  label: string
  value: T
  options: readonly T[]
  onChange: (value: T) => void
  hint?: string
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
}: SelectFieldProps<T>) {
  const id = useId()

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[13px] text-graphite">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="h-12 w-full appearance-none border-b border-line bg-transparent text-sm transition-colors duration-200 hover:border-graphite focus:border-ink focus:outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {hint && <p className="mt-2 text-xs text-ash">{hint}</p>}
    </div>
  )
}
