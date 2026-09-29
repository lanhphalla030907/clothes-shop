import { useContext } from 'react'
import { UIContext, type UIContextValue } from '@/context/ui'

/** Access cart-drawer / mobile-menu UI state. */
export const useUI = (): UIContextValue => {
  const context = useContext(UIContext)
  if (!context) throw new Error('useUI must be used within a UIProvider')
  return context
}
