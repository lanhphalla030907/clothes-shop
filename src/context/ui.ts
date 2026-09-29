import { createContext } from 'react'

export interface UIContextValue {
  isCartOpen: boolean
  openCart: () => void
  closeCart: () => void
  isMenuOpen: boolean
  openMenu: () => void
  closeMenu: () => void
}

export const UIContext = createContext<UIContextValue | null>(null)
