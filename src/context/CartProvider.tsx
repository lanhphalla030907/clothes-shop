import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  CartContext,
  FLAT_SHIPPING,
  FREE_SHIPPING_THRESHOLD,
  buildLineId,
  type AddItemOptions,
  type CartContextValue,
} from './cart'
import type { CartItem, Product } from '@/types'

const STORAGE_KEY = 'ctrl.cart.v1'

const isCartItem = (value: unknown): value is CartItem => {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Partial<CartItem>
  return (
    typeof item.lineId === 'string' &&
    typeof item.productId === 'string' &&
    typeof item.name === 'string' &&
    typeof item.price === 'number' &&
    typeof item.quantity === 'number' &&
    typeof item.image === 'string' &&
    typeof item.size === 'string' &&
    typeof item.color === 'string'
  )
}

const readStoredCart = (): CartItem[] => {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isCartItem) : []
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(readStoredCart)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      /* storage unavailable — the cart simply lives in memory this session */
    }
  }, [items])

  const addItem = useCallback((product: Product, { size, color, quantity = 1 }: AddItemOptions) => {
    const lineId = buildLineId(product.id, size, color)

    setItems((current) => {
      const existing = current.find((item) => item.lineId === lineId)
      if (existing) {
        return current.map((item) =>
          item.lineId === lineId ? { ...item, quantity: item.quantity + quantity } : item,
        )
      }
      return [
        ...current,
        {
          lineId,
          productId: product.id,
          name: product.name,
          category: product.category,
          price: product.price,
          image: product.images[0],
          size,
          color,
          quantity: Math.max(1, quantity),
        },
      ]
    })
  }, [])

  const removeItem = useCallback((lineId: string) => {
    setItems((current) => current.filter((item) => item.lineId !== lineId))
  }, [])

  const increaseQuantity = useCallback((lineId: string) => {
    setItems((current) =>
      current.map((item) =>
        item.lineId === lineId ? { ...item, quantity: item.quantity + 1 } : item,
      ),
    )
  }, [])

  const decreaseQuantity = useCallback((lineId: string) => {
    setItems((current) =>
      current
        .map((item) =>
          item.lineId === lineId ? { ...item, quantity: item.quantity - 1 } : item,
        )
        .filter((item) => item.quantity > 0),
    )
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  const value = useMemo<CartContextValue>(() => {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
    const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING
    return {
      items,
      itemCount,
      subtotal,
      shipping,
      total: subtotal + shipping,
      addItem,
      removeItem,
      increaseQuantity,
      decreaseQuantity,
      clearCart,
    }
  }, [items, addItem, removeItem, increaseQuantity, decreaseQuantity, clearCart])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
