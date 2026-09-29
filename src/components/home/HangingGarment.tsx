import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { formatPrice } from '@/lib/format'
import type { Product } from '@/types'

interface HangingGarmentProps {
  product: Product
  index: number
  className?: string
}

/**
 * Per-piece swing. A garment on a rail pivots about its hook, so each piece
 * gets its own amplitude, period and phase — otherwise four identical loops
 * read as one mechanical animation rather than four separate clothes.
 */
const SWAY = [
  { rotate: 0.9, duration: 8.4, delay: 0 },
  { rotate: -1.15, duration: 9.7, delay: 1.6 },
  { rotate: 0.75, duration: 7.6, delay: 3.1 },
  { rotate: -1.35, duration: 10.8, delay: 0.8 },
] as const

/**
 * How far each cut-out is lifted above the cell's top edge. The cell edge sits
 * on the rail, so this is what carries the hook — already present in the
 * artwork — over the line. Measured against `image.png`, whose hook curls
 * across source rows 11-28 with the shoulders starting at row 72: the rail has
 * to land inside that curl, which puts the image top 7px above the rail.
 * Per-piece corrections live on `cutoutOffsetY`, because the hook sits at a
 * slightly different height in every photograph.
 */
const HOOK_LIFT = 7

/**
 * One piece of the rail. The product photography already contains its own
 * hanger, so nothing is drawn here: the cell's top edge sits on the rail line
 * and the cut-out is lifted just far enough for the hook in the artwork to
 * ride over it. Everything below the hook hangs underneath.
 */
export function HangingGarment({ product, index, className = '' }: HangingGarmentProps) {
  const prefersReduced = useReducedMotion()
  const [hovered, setHovered] = useState(false)
  const swing = SWAY[index % SWAY.length]

  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.1, delay: 0.6 + index * 0.12, ease: [0.16, 1, 0.3, 1] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className={`group relative flex flex-col items-center ${className}`}
    >
      {/* Swings about the hook, which stays put on the rail — the hem travels
          furthest, the way a real garment moves. On hover the swing is caught
          and settles, as if the piece had been lifted off its rest. */}
      <motion.div
        style={{ transformOrigin: 'top center' }}
        animate={
          prefersReduced || hovered
            ? { rotate: 0 }
            : { rotate: [swing.rotate, -swing.rotate, swing.rotate] }
        }
        transition={
          hovered
            ? { type: 'spring', stiffness: 120, damping: 14 }
            : { duration: swing.duration, repeat: Infinity, ease: 'easeInOut', delay: swing.delay }
        }
        className="flex w-full flex-col items-center"
      >
        {/* ── Garment, hung by the hook already in the cut-out ─────────── */}
        <Link
          to={`/product/${product.id}`}
          aria-label={`${product.name} — ${formatPrice(product.price)}`}
          className="relative flex w-full justify-center"
        >
          {/* inline-flex so the wrapper shrink-wraps the garment and the shadow
              ellipse always lands directly beneath that piece, whatever its
              aspect ratio */}
          <span className="relative inline-flex flex-col items-center">
            <motion.img
              src={product.cutout}
              alt=""
              aria-hidden
              draggable={false}
              style={{
                filter: product.cutoutFilter,
                // lift the artwork so the hook drawn into it clears the rail
                marginTop: (product.cutoutOffsetY ?? 0) - HOOK_LIFT,
              }}
              animate={prefersReduced ? undefined : { y: hovered ? -30 : 0, scale: hovered ? 1.16 : 1, rotate: hovered ? 0.5 : 0 }}
              transition={
                hovered
                  ? { type: 'spring', stiffness: 340, damping: 20,rotate: { type: 'spring', stiffness: 280, damping: 18 } }
                  : { type: 'spring', stiffness: 180, damping: 26 }
              }
              className="block h-auto max-h-[clamp(380px,60vh,720px)] w-auto max-w-full origin-top object-contain object-top drop-shadow-[0_40px_50px_rgba(0,0,0,0.25)] transition-[filter,drop-shadow] duration-500 ease-editorial group-hover:drop-shadow-[0_60px_60px_rgba(0,0,0,0.45)]"
            />

            {/* soft blurred ellipse sitting directly beneath the piece; it
                tightens on hover so the garment reads as lifted clear of it */}
            <motion.span
              aria-hidden
              animate={
                prefersReduced
                  ? undefined
                  : { opacity: hovered ? 0.2 : 1, scaleX: hovered ? 0.6 : 1, scaleY: hovered ? 1.3 : 1 }
              }
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              className="pointer-events-none absolute -bottom-2 left-1/2 h-3 w-[50%] -translate-x-1/2 rounded-[50%] bg-black/15 blur-[14px]"
            />
          </span>
        </Link>
      </motion.div>
    </motion.div>
  )
}
