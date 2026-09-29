import { useEffect, useState } from 'react'

/**
 * SSR-safe media query hook. Starts pessimistic (`false`) so the first
 * client render always matches the mobile-first markup.
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const list = window.matchMedia(query)
    const update = () => setMatches(list.matches)
    update()
    list.addEventListener('change', update)
    return () => list.removeEventListener('change', update)
  }, [query])

  return matches
}

/** True at the `lg` breakpoint and up — used to branch real layouts. */
export const useIsDesktop = (): boolean => useMediaQuery('(min-width: 1024px)')
