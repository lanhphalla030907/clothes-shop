import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { formatPrice } from '@/lib/format'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import type { Product } from '@/types'
import { DEFAULT_HOOK_Y, DEFAULT_HEM_Y, clamp01, round2 } from './garmentGeometry'
import { CHROME } from './studioTokens'

interface HangingGarmentProps {
  product: Product
  index: number
  className?: string
  ratio?: number
}

const EASE = [0.16, 1, 0.3, 1] as const

export function HangingGarment({
  product,
  index,
  className = '',
  ratio = 1,
}: HangingGarmentProps) {
  const prefersReduced = useReducedMotion()
  const canHover = useMediaQuery('(hover: hover) and (pointer: fine)')
  const [hovered, setHovered] = useState(false)

  const hookY = clamp01(product.hookY ?? DEFAULT_HOOK_Y)
  const hemY = clamp01(product.hemY ?? DEFAULT_HEM_Y)

  /**
   * We translate the image upward by the fraction of *its own rendered height*
   * that sits above the hook. Because the image is drawn at height
   * `(ratio * pieceScale * g) * aspect`, and `hookY` is a fraction of the
   * canvas, `-hookY * 100%` of the *image element* is exactly the pixel
   * distance from the top of the canvas to the hook. So plain `-{hookY}%`
   * is correct — it does not need to know the pixel size.
   */
  const pieceShift = `-${round2(hookY * 100, 3)}%`

  /**
   * The drop shadow's bottom edge sits at the hem, i.e. `(1 - hemY)` from the
   * bottom of the canvas. Same logic as above: express as a percentage of the
   * image element's own height.
   */
  const shadowBottom = `${round2((1 - hemY) * 100, 3)}%`

  const isHovered = canHover && hovered

  useEffect(() => {
    const release = () => setHovered(false)
    window.addEventListener('scroll', release, { passive: true })
    window.addEventListener('blur', release)
    return () => {
      window.removeEventListener('scroll', release)
      window.removeEventListener('blur', release)
    }
  }, [])

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: -40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.75 + index * 0.11, ease: EASE }}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') setHovered(true)
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse') setHovered(false)
      }}
      onPointerCancel={() => setHovered(false)}
      className={`group relative flex flex-col items-center ${
        canHover ? 'cursor-pointer' : ''
      } [--bleed:0px] [--pad-b:2.75rem] md:[--bleed:calc(var(--g)*-48)] md:[--pad-b:calc(var(--g)*80+1.25rem)] ${className}`}
      style={
        {
          marginInline: 'var(--bleed)',
          paddingBottom: 'var(--pad-b)',
          zIndex: isHovered ? 2 : 1,
          '--w': ratio,
        } as React.CSSProperties
      }
    >
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-2 md:hidden"
        style={{ background: CHROME, boxShadow: '0 6px 10px -4px #00000059' }}
      />

      <motion.div
        animate={prefersReduced || !isHovered ? { y: 0 } : { y: -10 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="relative block"
        style={{ marginTop: '-5px' }}
      >
        <Link
          to={`/product/${product.id}`}
          aria-label={`${product.name} — ${formatPrice(product.price)}`}
          className="block outline-none"
        >
          <span
            className="block"
            style={{ transformOrigin: '50% 0', willChange: 'transform' }}
          >
            <span
              className="block"
              style={{
                transform: `translateY(${pieceShift})`,
                ...(product.cutoutFilter && product.cutoutFilter !== 'none'
                  ? { filter: product.cutoutFilter }
                  : null),
              }}
            >
              <img
                src={product.cutout ?? product.images[0]}
                alt=""
                aria-hidden
                draggable={false}
                className="block h-auto max-w-none select-none"
                style={{
                  width: 'calc(var(--w) * var(--piece-scale) * var(--g))',
                  filter: 'drop-shadow(0 18px 22px #00000029)',
                }}
              />
            </span>
          </span>
        </Link>

        {canHover && (
          <motion.span
            aria-hidden
            initial={false}
            animate={
              prefersReduced
                ? undefined
                : { opacity: isHovered ? 1 : 0, rotate: isHovered ? 0 : -10 }
            }
            transition={{ opacity: { duration: 0.18 }, rotate: { duration: 0.7, ease: EASE } }}
            className="pointer-events-none absolute flex flex-col items-start"
            style={{
              top: 'calc(var(--g) * 170)',
              left: 'calc(50% + var(--g) * 70)',
              transformOrigin: '.4rem 0',
              marginTop: isHovered ? 0 : -6,
            }}
          >
            <span className="ml-[.4rem] h-[1.4rem] w-px bg-[var(--ctrl-red)]" />
            <span
              className="relative w-[9.25rem] rounded-[3px] px-3 pt-4 pb-[.7rem] text-[var(--ink)]"
              style={{
                background: 'var(--paper)',
                boxShadow: 'inset 0 1px #ffffffcc, 0 10px 18px -8px #00000073',
              }}
            >
              <span
                className="absolute top-[.35rem] left-[.2rem] h-[.4rem] w-[.4rem] rounded-full bg-[var(--backdrop)]"
                style={{ boxShadow: 'inset 0 1px 1px #00000059' }}
              />
              <span className="block font-extrabold text-[0.7rem] uppercase [font-stretch:125%]">
                {product.name}
              </span>
              <span className="mt-0.5 block text-[0.8rem] text-[var(--ink-soft)]">
                {formatPrice(product.price)}
              </span>
            </span>
          </motion.span>
        )}
      </motion.div>

      <motion.span
        aria-hidden
        animate={
          prefersReduced
            ? undefined
            : { opacity: isHovered ? 0.55 : 1, scaleX: isHovered ? 0.85 : 1 }
        }
        transition={{ opacity: { duration: 0.5 }, scaleX: { duration: 0.5, ease: EASE } }}
        className="pointer-events-none absolute left-1/2 h-6 -translate-x-1/2 rounded-[50%]"
        style={{
          bottom: shadowBottom,
          width: 'calc(var(--w) * var(--piece-scale) * var(--g) * 0.85)',
          filter: 'blur(7px)',
          background: 'radial-gradient(closest-side, #0006, #0000)',
        }}
      />
    </motion.div>
  )
}