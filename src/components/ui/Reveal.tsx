import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

interface RevealProps {
  children: ReactNode
  /** Seconds of delay — kept small; stagger is handled by the parent. */
  delay?: number
  y?: number
  className?: string
  once?: boolean
  as?: 'div' | 'section' | 'li' | 'article' | 'header' | 'span'
}

const OFFSET_Y: Record<NonNullable<RevealProps['as']>, number> = {
  div: 28,
  section: 40,
  li: 24,
  article: 32,
  header: 24,
  span: 16,
}

/** Standard scroll-triggered reveal. Motion-safe: collapses to a fade. */
export function Reveal({
  children,
  delay = 0,
  y,
  className,
  once = true,
  as = 'div',
}: RevealProps) {
  const prefersReduced = useReducedMotion()
  const Component = motion[as]

  if (prefersReduced) {
    const Plain = as
    return <Plain className={className}>{children}</Plain>
  }

  return (
    <Component
      className={className}
      initial={{ opacity: 0, y: y ?? OFFSET_Y[as] }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount: 0.25, margin: '0px 0px -80px 0px' }}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </Component>
  )
}

/**
 * Container that staggers direct `Reveal`-like children on scroll.
 * Pair with `<RevealItem />`.
 */
export const StaggerGroup = ({
  children,
  className,
  stagger = 0.08,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  stagger?: number
  delay?: number
}) => (
  <motion.div
    className={className}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.15, margin: '0px 0px -60px 0px' }}
    variants={{
      hidden: {},
      visible: { transition: { staggerChildren: stagger, delayChildren: delay } },
    }}
  >
    {children}
  </motion.div>
)

export const StaggerItem = ({ children, className }: { children: ReactNode; className?: string }) => (
  <motion.div
    className={className}
    variants={{
      hidden: { opacity: 0, y: 24 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.85, ease: [0.16, 1, 0.3, 1] } },
    }}
  >
    {children}
  </motion.div>
)
