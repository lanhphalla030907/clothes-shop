import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { UIContext, type UIContextValue } from './ui'

/** Overlay state for the storefront: the full-bleed mobile menu. */
export function UIProvider({ children }: { children: ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const [lastPath, setLastPath] = useState(pathname)

  // Adjusting state during render (the React-recommended alternative to an
  // effect) so any route change dismisses the overlay immediately.
  if (lastPath !== pathname) {
    setLastPath(pathname)
    setIsMenuOpen(false)
  }

  const openMenu = useCallback(() => setIsMenuOpen(true), [])
  const closeMenu = useCallback(() => setIsMenuOpen(false), [])

  useEffect(() => {
    if (!isMenuOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isMenuOpen])

  const value = useMemo<UIContextValue>(
    () => ({ isMenuOpen, openMenu, closeMenu }),
    [isMenuOpen, openMenu, closeMenu],
  )

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}