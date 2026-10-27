import { useContext } from 'react'
import { UIContext, type UIContextValue } from '@/context/ui'

/** Access the storefront's overlay state. */
export const useUI = (): UIContextValue => {
  const context = useContext(UIContext)
  if (!context) throw new Error('useUI must be used within a UIProvider')
  return context
}