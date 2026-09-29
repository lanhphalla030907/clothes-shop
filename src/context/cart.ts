import { createContext } from 'react'
import type { CartItem, Product } from '@/types'

export interface AddItemOptions {
  size: string
  color: string
  quantity?: number
}

export interface CartContextValue {
  items: CartItem[]
  itemCount: number
  subtotal: number
  shipping: number
  total: number
  addItem: (product: Product, options: AddItemOptions) => void
  removeItem: (lineId: string) => void
  increaseQuantity: (lineId: string) => void
  decreaseQuantity: (lineId: string) => void
  clearCart: () => void
}

export const CartContext = createContext<CartContextValue | null>(null)

export const buildLineId = (productId: string, size: string, color: string): string =>
  `${productId}__${size}__${color}`

export const FREE_SHIPPING_THRESHOLD = 500
export const FLAT_SHIPPING = 24
