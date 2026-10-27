import { createContext } from 'react'

/** Overlay state: the full-bleed mobile menu. */
export interface UIContextValue {
  isMenuOpen: boolean
  openMenu: () => void
  closeMenu: () => void
}

export const UIContext = createContext<UIContextValue | null>(null)