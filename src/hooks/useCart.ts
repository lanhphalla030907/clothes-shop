import { useContext } from 'react'
import { CartContext, type CartContextValue } from '@/context/cart'

/** Access the cart store. Throws if used outside <CartProvider>. */
export const useCart = (): CartContextValue => {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used within a CartProvider')
  return context
}
