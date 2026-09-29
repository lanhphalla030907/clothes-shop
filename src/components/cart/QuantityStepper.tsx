import { Minus, Plus } from 'lucide-react'

interface QuantityStepperProps {
  value: number
  onDecrease: () => void
  onIncrease: () => void
  /** Caps the increment (e.g. remaining stock). */
  max?: number
  size?: 'sm' | 'md'
  label?: string
}

const box = {
  sm: 'size-7',
  md: 'size-9',
}

/** Borderless inline stepper — reads as a control, not a form widget. */
export function QuantityStepper({
  value,
  onDecrease,
  onIncrease,
  max = 99,
  size = 'md',
  label = 'Quantity',
}: QuantityStepperProps) {
  return (
    <div className="inline-flex items-center border border-line" role="group" aria-label={label}>
      <button
        type="button"
        onClick={onDecrease}
        disabled={value <= 1}
        aria-label="Decrease quantity"
        className={`grid ${box[size]} place-items-center text-ink transition-colors duration-300 ease-editorial hover:bg-ink hover:text-paper disabled:pointer-events-none disabled:text-ash disabled:hover:bg-transparent disabled:hover:text-ash`}
      >
        <Minus size={12} strokeWidth={1.6} />
      </button>
      <span
        aria-live="polite"
        className={`${size === 'sm' ? 'w-7 text-[11px]' : 'w-9 text-xs'} text-center font-mono tabular-nums`}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={onIncrease}
        disabled={value >= max}
        aria-label="Increase quantity"
        className={`grid ${box[size]} place-items-center text-ink transition-colors duration-300 ease-editorial hover:bg-ink hover:text-paper disabled:pointer-events-none disabled:text-ash disabled:hover:bg-transparent disabled:hover:text-ash`}
      >
        <Plus size={12} strokeWidth={1.6} />
      </button>
    </div>
  )
}
