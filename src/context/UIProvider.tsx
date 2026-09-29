import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { UIContext, type UIContextValue } from './ui'

export function UIProvider({ children }: { children: ReactNode }) {
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const [lastPath, setLastPath] = useState(pathname)

  // Adjusting state during render (the React-recommended alternative to an
  // effect) so any route change dismisses both overlays immediately.
  if (lastPath !== pathname) {
    setLastPath(pathname)
    setIsCartOpen(false)
    setIsMenuOpen(false)
  }

  const openCart = useCallback(() => {
    setIsMenuOpen(false)
    setIsCartOpen(true)
  }, [])

  const openMenu = useCallback(() => {
    setIsCartOpen(false)
    setIsMenuOpen(true)
  }, [])

  const closeCart = useCallback(() => setIsCartOpen(false), [])
  const closeMenu = useCallback(() => setIsMenuOpen(false), [])

  // Escape closes whichever overlay is open.
  useEffect(() => {
    if (!isCartOpen && !isMenuOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setIsCartOpen(false)
      setIsMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isCartOpen, isMenuOpen])

  const value = useMemo<UIContextValue>(
    () => ({ isCartOpen, openCart, closeCart, isMenuOpen, openMenu, closeMenu }),
    [isCartOpen, openCart, closeCart, isMenuOpen, openMenu, closeMenu],
  )

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}
