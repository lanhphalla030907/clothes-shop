import { useContext } from 'react'
import { CartActionsContext, type CartActions } from './cartActions'

/** The cart write, from anywhere under the storefront provider. */
export const useCartActions = (): CartActions => {
  const value = useContext(CartActionsContext)
  if (!value) throw new Error('useCartActions must be used within CartActionsProvider')
  return value
}