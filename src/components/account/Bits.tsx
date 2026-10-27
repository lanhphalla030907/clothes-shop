import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { Minus, Plus } from 'lucide-react'
import { formatMoney } from '@/lib/money'
import { ORDER_STATUS, type OrderStatus } from '@/types/api'

/**
 * Small presentational pieces shared by the order, wishlist and bag screens.
 */

/**
 * An amount as the server sent it. Never a prop the client computed — `amount` is
 * the exact string from the response and the currency comes from the same payload.
 */
type MoneyProps = {
  amount: string
  currency?: string
  className?: string
  /** The figure that is the point of the screen, set larger. */
  emphasis?: 'default' | 'total'
}

export const Money = ({ amount, currency = 'USD', className = '', emphasis = 'default' }: MoneyProps) => (
  <span
    className={`${emphasis === 'total' ? 'font-mono text-lg font-semibold tabular-nums text-ink' : 'text-ink'} ${className}`}
  >
    {formatMoney(amount, currency)}
  </span>
)

/** Tone per status: only the ones that need attention are given a colour. */
const statusTone: Record<OrderStatus, string> = {
  [ORDER_STATUS.PENDING]: 'border-ink/20 bg-bone text-ink',
  [ORDER_STATUS.CONFIRMED]: 'border-ink/20 bg-bone text-ink',
  [ORDER_STATUS.PROCESSING]: 'border-ink/20 bg-bone text-ink',
  [ORDER_STATUS.SHIPPED]: 'border-ink/20 bg-ink text-paper',
  [ORDER_STATUS.DELIVERED]: 'border-ink/20 bg-ink text-paper',
  [ORDER_STATUS.CANCELLED]: 'border-signal/30 bg-signal-soft text-signal',
}

const statusLabel: Record<OrderStatus, string> = {
  [ORDER_STATUS.PENDING]: 'Awaiting payment',
  [ORDER_STATUS.CONFIRMED]: 'Confirmed',
  [ORDER_STATUS.PROCESSING]: 'Preparing',
  [ORDER_STATUS.SHIPPED]: 'Shipped',
  [ORDER_STATUS.DELIVERED]: 'Delivered',
  [ORDER_STATUS.CANCELLED]: 'Cancelled',
}

export const StatusBadge = ({ status }: { status: OrderStatus }) => (
  <span
    className={`label-micro inline-flex h-7 items-center border px-3 ${statusTone[status]}`}
  >
    {statusLabel[status] ?? status}
  </span>
)

type QuantityStepperProps = {
  value: number
  onChange: (quantity: number) => void
  /** Stock the server reported; caps the increment. */
  max?: number | null
  min?: number
  disabled?: boolean
  label: string
  /**
   * Enables typing a quantity. The typed figure is sent as an absolute value, so
   * the control commits only when it is a whole number the server could accept.
   */
  editable?: boolean
}

/**
 * Quantity control for a cart line.
 *
 * `max` comes from the server's `available`, which is why the plus button
 * disables itself — offering a quantity the server has already said it cannot
 * fulfil would only produce a rejection at checkout. `null` means "no inventory
 * row", which is *not* unlimited, so the stepper is capped at 1 rather than
 * allowed to run away.
 */
export const QuantityStepper = ({
  value,
  onChange,
  max,
  min = 1,
  disabled = false,
  label,
  editable = false,
}: QuantityStepperProps) => {
  const id = useId()
  const ceiling = typeof max === 'number' ? Math.min(max, 99) : 1

  return (
    <div className="inline-flex h-11 items-center border border-line bg-paper-pure">
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="grid size-11 place-items-center text-ink transition-colors hover:bg-bone disabled:cursor-not-allowed disabled:text-ash disabled:hover:bg-transparent"
      >
        <Minus size={13} strokeWidth={1.5} />
      </button>

      {editable ? (
        <QuantityInput
          id={id}
          value={value}
          label={label}
          disabled={disabled}
          onCommit={(quantity) => onChange(Math.max(min, Math.min(ceiling, quantity)))}
        />
      ) : (
        <span id={id} aria-live="polite" className="min-w-10 text-center font-mono text-sm tabular-nums text-ink">
          {value}
        </span>
      )}

      <button
        type="button"
        aria-label={`Increase ${label}`}
        disabled={disabled || value >= ceiling}
        onClick={() => onChange(Math.min(ceiling, value + 1))}
        className="grid size-11 place-items-center text-ink transition-colors hover:bg-bone disabled:cursor-not-allowed disabled:text-ash disabled:hover:bg-transparent"
      >
        <Plus size={13} strokeWidth={1.5} />
      </button>
    </div>
  )
}

/**
 * The middle of the stepper, typed into rather than stepped.
 *
 * Keeps the server's figure as the truth: whatever is typed is sent as an
 * absolute quantity and the control only re-reads the value the cart then holds,
 * so an out-of-stock or rejected figure snaps back instead of standing.
 */
const QuantityInput = ({
  id,
  value,
  label,
  disabled,
  onCommit,
}: {
  id: string
  value: number
  label: string
  disabled: boolean
  onCommit: (quantity: number) => void
}) => {
  const [draft, setDraft] = useState(() => String(value))
  const [shownValue, setShownValue] = useState(value)

  // A change made elsewhere — a duplicate refused, a refetch landing a different
  // quantity — wins over whatever is half-typed.
  if (shownValue !== value) {
    setShownValue(value)
    setDraft(String(value))
  }

  return (
    <input
      id={id}
      type="number"
      inputMode="numeric"
      min={1}
      step={1}
      value={draft}
      disabled={disabled}
      aria-label={`Quantity for ${label}`}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => commit(draft, value, onCommit)}
      onKeyDown={(event) => {
        if (event.key !== 'Enter') return
        event.preventDefault()
        commit(draft, value, onCommit)
      }}
      className="min-w-12 border-0 bg-transparent px-1 py-2 text-center font-mono text-sm text-ink tabular-nums focus:ring-0 [appearance:textfield] focus:outline-none disabled:text-ash [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
    />
  )
}

/** Sends the typed figure only when it is a whole number, and not a no-op. */
const commit = (draft: string, current: number, onCommit: (quantity: number) => void) => {
  const typed = Number(draft)
  if (!Number.isInteger(typed) || typed < 1 || typed === current) return
  onCommit(typed)
}

type DefinitionRowProps = {
  label: string
  children: ReactNode
}

export const DefinitionRow = ({ label, children }: DefinitionRowProps) => (
  <div className="flex items-baseline justify-between gap-6 border-b border-line-soft py-3 last:border-b-0">
    <dt className="label-micro text-ash">{label}</dt>
    <dd className="text-right text-sm text-ink">{children}</dd>
  </div>
)
