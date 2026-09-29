import type { OrderSummary } from '@/types'

const ORDER_KEY = 'ctrl.order.v1'

/** Persists the placed order so the success page survives a refresh. */
export const saveOrder = (order: OrderSummary): void => {
  try {
    window.localStorage.setItem(ORDER_KEY, JSON.stringify(order))
  } catch {
    /* storage unavailable — the success page falls back to its defaults */
  }
}

export const readOrder = (): OrderSummary | null => {
  try {
    const raw = window.localStorage.getItem(ORDER_KEY)
    return raw ? (JSON.parse(raw) as OrderSummary) : null
  } catch {
    return null
  }
}

export const createOrderId = (): string => {
  const segment = () => Math.random().toString(36).slice(2, 6).toUpperCase()
  return `CTRL-${segment()}-${segment()}`
}
