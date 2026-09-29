import { useEffect } from 'react'

/**
 * Freezes the page behind a modal overlay while compensating for the
 * disappearing scrollbar so the layout never jumps.
 */
export const useLockBodyScroll = (locked: boolean): void => {
  useEffect(() => {
    if (!locked) return

    const { body, documentElement } = document
    const previousOverflow = body.style.overflow
    const previousPadding = body.style.paddingRight
    const scrollbar = window.innerWidth - documentElement.clientWidth

    body.style.overflow = 'hidden'
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`

    return () => {
      body.style.overflow = previousOverflow
      body.style.paddingRight = previousPadding
    }
  }, [locked])
}
