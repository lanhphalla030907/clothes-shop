import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { heroProducts } from '@/data/products'
import type { Product } from '@/types'
import { HangingGarment } from './HangingGarment'
import { round2, pieceMetrics, pieceHeightCm, pieceScale } from './garmentGeometry'
import {
  TOKENS,
  STUDIO,
  GRAIN,
  CHROME,
  CHROME_SHADOW,
  DISPLAY,
  LABEL,
} from './studioTokens'

const EASE = [0.16, 1, 0.3, 1] as const
const PER_BAR = 4

const toRows = <T,>(items: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, row) =>
    items.slice(row * size, row * size + size),
  )

function RailBar({
  products,
  startIndex = 0,
  first = false,
}: {
  products: Product[]
  startIndex?: number
  first?: boolean
}) {
  const ratios = pieceRatios(products)

  return (
    <div className={first ? 'mt-[clamp(1.5rem,3.5vh,2.75rem)] flex-1' : 'mt-16 lg:mt-24'}>
      <div
        className="relative [--g:calc((50vw-0.75rem)/760)] [--rail-y:0.75rem] [--piece-scale:650] md:[--g:min(.4px,calc((100vw-4rem)/2200),calc((100svh-450px)/1130))] md:[--piece-scale:780]"
        style={{ width: '100vw', marginInline: 'calc(50% - 50vw)', paddingTop: 'var(--rail-y)' }}
      >
        <motion.div
          aria-hidden
          initial={false}
          animate={{ scaleX: 1 }}
          className="absolute inset-x-0 top-[var(--rail-y)] hidden h-[9px] rounded-[9px] origin-center md:block"
          style={{ background: CHROME, boxShadow: CHROME_SHADOW }}
        />

        <div className="flex items-stretch justify-center max-md:grid max-md:grid-cols-2 max-md:row-gap-9">
          {products.map((product, index) => (
            <HangingGarment
              key={product.id}
              product={product}
              index={startIndex + index}
              ratio={ratios.get(product.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Ratio for each piece = how wide to render the cutout image so that the
 * *drawn garment* is the correct real-world size relative to its neighbours.
 *
 * - `garmentHeightCm` is the physical length of the item (hoodie ≈ 72cm,
 *   trouser ≈ 108cm). Normalising by the tallest piece makes the trouser the
 *   reference and shortens everything else accordingly.
 * - `clothSpan` (hemY - hookY) is the fraction of the cutout canvas the garment
 *   actually occupies. The image is drawn at `width = ratio * scale * g`, and
 *   its height is width / aspect. So multiplying by `clothSpan` compensates
 *   for padding baked into the PNG.
 * - `pieceScale` remains a per-product or per-category nudge (accessories
 *   shrink, bottoms grow slightly). Keep it near 1.
 */
function pieceRatios(products: Product[]) {
  const metrics = products.map((product) => ({ product, ...pieceMetrics(product) }))
  if (metrics.length === 0) return new Map<string, number>()

  const heights = metrics.map((m) => pieceHeightCm(m.product))
  const refHeight = Math.max(...heights)

  const raw = metrics.map((m) => {
    const span = m.product.hemY! - m.product.hookY!
    const aspect = m.product.cutoutAspect ?? 1
    // Width such that rendered height = (height / refHeight) * pieceScale.
    return (pieceHeightCm(m.product) / refHeight) * (aspect / span) * pieceScale(m.product)
  })

  const norm = 1 / Math.max(...raw)

  return new Map(
    metrics.map((m, i) => [m.product.id, round2(raw[i] * norm, 4)]),
  )
}

export function Hero() {
  const prefersReduced = useReducedMotion()
  const [firstBar = [], ...extraBars] = toRows(heroProducts, PER_BAR)

  const rise = (delay: number) =>
    prefersReduced
      ? { initial: false as const, animate: { opacity: 1, y: 0 } }
      : {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.9, delay, ease: EASE },
        }

  return (
    <section
      className="relative isolate flex min-h-svh flex-col overflow-x-clip px-[clamp(1rem,4vw,3.5rem)] pt-[clamp(1.25rem,3vw,2.5rem)] text-[var(--ink)]"
      style={{ ...TOKENS, background: STUDIO }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-55 mix-blend-soft-light"
        style={{ backgroundImage: GRAIN }}
      />

      <header className="flex items-start justify-between">
        <motion.p {...rise(0)} className={`${LABEL} text-[clamp(0.95rem,1.5vw,1.25rem)]`}>
          Limited
          <br />
          Release
        </motion.p>
        <motion.p
          {...rise(0.12)}
          className={`${LABEL} text-right text-[clamp(0.95rem,1.5vw,1.25rem)]`}
        >
          June
          <br />
          2026
        </motion.p>
      </header>

      <div className="mt-[clamp(0.5rem,2vw,1.5rem)] flex flex-col items-center text-center">
        <motion.svg
          viewBox="0 0 48 24"
          fill="currentColor"
          aria-hidden
          focusable="false"
          className={`h-[clamp(0.9rem,1.6vw,1.35rem)] w-auto ${prefersReduced ? '' : 'intro-spark'}`}
          initial={prefersReduced ? false : { opacity: 0, rotate: -45, scale: 0.3 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          transition={{ duration: 1.1, delay: 0.12, ease: EASE }}
        >
          <path d="M10 5C10.84 11.16 10.84 11.16 17 12C10.84 12.84 10.84 12.84 10 19C9.16 12.84 9.16 12.84 3 12C9.16 11.16 9.16 11.16 10 5Z" />
          <path d="M24 1C25.32 10.68 25.32 10.68 35 12C25.32 13.32 25.32 13.32 24 23C22.68 13.32 22.68 13.32 13 12C22.68 10.68 22.68 10.68 24 1Z" />
          <path d="M38 5C38.84 11.16 38.84 11.16 45 12C38.84 12.84 38.84 12.84 38 19C37.16 12.84 37.16 12.84 31 12C37.16 11.16 37.16 11.16 38 5Z" />
        </motion.svg>

        <h1
          className={`${DISPLAY} mt-[clamp(0.75rem,1.6vw,1.25rem)] text-[clamp(2.75rem,8.4vw,7rem)] text-balance`}
        >
          {(['The', 'New', 'Era'] as const).map((word, i) => (
            <motion.span
              key={word}
              className="inline-block"
              initial={
                prefersReduced
                  ? false
                  : { opacity: 0, y: '0.55em', clipPath: 'inset(-0.2em -0.1em 100%)' }
              }
              animate={{ opacity: 1, y: 0, clipPath: 'inset(-0.2em -0.1em)' }}
              transition={{ duration: 1, delay: 0.2 + i * 0.11, ease: EASE }}
            >
              {word}
            </motion.span>
          ))}
        </h1>

        <motion.p
          {...(prefersReduced
            ? { initial: false as const, animate: { opacity: 1, y: 0 } }
            : {
                initial: { opacity: 0, y: 10, filter: 'blur(6px)' },
                animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
                transition: { duration: 1, delay: 0.62, ease: EASE },
              })}
          className="mt-[clamp(0.75rem,1.4vw,1.1rem)] max-w-[40ch] text-[clamp(1rem,1.5vw,1.25rem)] leading-snug text-balance text-[var(--ink-soft)]"
        >
          A new chapter of elevated essentials and statement silhouettes.
        </motion.p>
      </div>

      <RailBar products={firstBar} first />

      {extraBars.map((bar, barIndex) => (
        <RailBar key={barIndex} products={bar} startIndex={PER_BAR * (barIndex + 1)} />
      ))}

      <footer className="grid grid-cols-[auto_1fr_auto] items-end gap-4 pb-[clamp(1.25rem,3vw,2.25rem)]">
        <motion.p {...rise(1.25)} className={`${LABEL} text-[clamp(0.95rem,1.5vw,1.25rem)]`}>
          Never
          <br />
          Basic
        </motion.p>

        <motion.p {...rise(1.32)} className="text-center text-[0.95rem] leading-snug text-[var(--ink-soft)]">
          <span className="hidden sm:inline">
            Designed for those who never follow the crowd.
            <br />
          Tap a piece on the rail to take it to checkout.
          </span>
        </motion.p>

        <motion.div {...rise(1.39)} className="col-start-3 text-right">
          <Link
            to="/shop"
            className={`${LABEL} inline-block text-[clamp(0.95rem,1.5vw,1.25rem)] underline decoration-2 underline-offset-4 decoration-[var(--ctrl-red)] transition-colors hover:text-[var(--ctrl-red)] focus-visible:underline focus-visible:outline-none`}
          >
            Shop
            <br />
            Now
          </Link>
        </motion.div>
      </footer>
    </section>
  )
}