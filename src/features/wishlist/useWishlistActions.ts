import { useContext } from 'react'
import { WishlistActionsContext, type WishlistActions } from './wishlistActions'

export function useWishlistActions(): WishlistActions {
  const actions = useContext(WishlistActionsContext)

  if (!actions) throw new Error('useWishlistActions must be used inside WishlistActionsProvider.')

  return actions
}