import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, Loader2, Plus, TriangleAlert } from 'lucide-react'
import { Plate } from './ProductStates'
import { SaveToWishlist } from './SaveToWishlist'
import { STORE_CURRENCY } from '@/lib/api/config'
import { formatMoney } from '@/lib/money'
import { defaultVariantFor } from '@/features/catalogue/defaultVariant'
import { useCartActions } from '@/features/cart/useCartActions'
import type { QuickAddTarget } from '@/features/catalogue/defaultVariant'
import type { CataloguePiece } from '@/types'

export interface ProductCardProps {
  piece: CataloguePiece
  index?: number
  priority?: boolean
  className?: string
}

  /**
   * Editorial LOMOR Storefront Product Card.
   *
   * Designed with a luxury fashion aesthetic:
   * - 4:5 vertical portrait aspect ratio with high-fashion imagery focus.
   * - Subtle hover transition: reveals a secondary angle/fit image when available.
   * - Minimal floating badges: sale discount percentage and out-of-stock indicators.
   * - Circular, glassmorphic wishlist action button.
   * - Tactile quick-add slide bar with status transitions.
   * - Typography uses the Hero body face (the exact `--font-store` stack) throughout,
   *   with the existing size, weight and colour hierarchy kept intact.
   * - Automatic variant and color indicator support.
   * - Fixed aspect-[4/5] frame, w-full overflow-hidden, no container background.
   * - Images fill the whole frame with object-cover object-center, exactly like the
   *   Shop by Category plates; the image's own background is used, so no letterboxing.
   */
export function ProductCard({ piece, index = 0, priority = false, className = '' }: ProductCardProps) {
  const primaryImage = piece.images[0]
  const secondaryImage = piece.images.length > 1 ? piece.images[1] : undefined

  // Discount calculations
  const currentPrice = Number(piece.price)
  const originalPrice = piece.originalPrice ? Number(piece.originalPrice) : undefined
  const isDiscounted =
    originalPrice !== undefined &&
    Number.isFinite(originalPrice) &&
    Number.isFinite(currentPrice) &&
    originalPrice > currentPrice &&
    currentPrice > 0
  const discountPercent = isDiscounted
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
    : 0

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.7, delay: Math.min(index * 0.05, 0.35), ease: [0.16, 1, 0.3, 1] }}
      className={`group/card relative flex min-w-0 flex-col font-store [&_.label-micro]:font-store ${className}`}
    >
      <Link
        to={`/product/${piece.id}`}
        className="block focus-visible:outline-offset-4"
        aria-label={`${piece.name} — ${formatMoney(piece.price, STORE_CURRENCY)}`}
      >
        {/* Product image frame — fixed 4:5, fills the frame like Shop by Category, transparent background */}
        <div className="relative block aspect-[4/5] w-full shrink-0 overflow-hidden bg-transparent">
          {/* Primary image */}
          <div className="absolute inset-0 flex h-full w-full items-center justify-center">
            <Plate
              src={primaryImage}
              alt={piece.name}
              priority={priority}
              fit="cover"
              position="object-center"
              background={false}
              className={`h-full w-full transition-opacity duration-700 ease-editorial ${
                secondaryImage ? 'group-hover/card:opacity-0' : ''
              } ${!piece.isAvailable ? 'opacity-80 grayscale-[20%]' : ''}`}
            />
          </div>

          {/* Secondary image (hover crossfade) */}
          {secondaryImage && (
            <div className="absolute inset-0 flex h-full w-full items-center justify-center">
              <Plate
                src={secondaryImage}
                alt={`${piece.name} alternate view`}
                fit="cover"
                position="object-center"
                background={false}
                className={`h-full w-full opacity-0 transition-opacity duration-700 ease-editorial group-hover/card:opacity-100 ${
                  !piece.isAvailable ? 'grayscale-[20%]' : ''
                }`}
              />
            </div>
          )}

          {/* Editorial Badges (Top-Left) */}
          <div className="pointer-events-none absolute top-2.5 left-2.5 z-20 flex flex-col items-start gap-1.5 sm:top-3 sm:left-3">
            {!piece.isAvailable && (
              <span className="inline-flex items-center border border-line bg-white/95 px-2 py-0.5 text-[9px] font-medium tracking-[0.12em] text-ink uppercase shadow-xs backdrop-blur-md sm:text-[10px]">
                Sold Out
              </span>
            )}
            {isDiscounted && discountPercent > 0 && (
              <span className="inline-flex items-center bg-ink px-2 py-0.5 text-[9px] font-medium tracking-[0.08em] text-paper uppercase shadow-xs backdrop-blur-md sm:text-[10px]">
                -{discountPercent}%
              </span>
            )}
          </div>

          {/* Quick Add Bar (Slides up smoothly on hover / focus) */}
          <QuickAdd piece={piece} />
        </div>

        {/* Product Metadata */}
        <div className="mt-3 sm:mt-3.5 space-y-1">
          {/* Eyebrow: Brand / Category and Variant indicators */}
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[10px] tracking-[0.14em] text-graphite uppercase sm:text-[11px]">
              {piece.category || 'LOMOR'}
            </p>
            {renderVariantIndicators(piece)}
          </div>

          {/* Product Name */}
          <h3 className="truncate text-xs font-medium tracking-tight text-ink uppercase transition-colors duration-200 group-hover/card:text-graphite sm:text-[13px]">
            {piece.name}
          </h3>

          {/* Pricing */}
          <div className="flex items-baseline gap-2 pt-0.5">
            <span
              className={`text-xs tracking-tight tabular-nums sm:text-[13px] ${
                isDiscounted ? 'font-semibold text-signal' : 'font-medium text-ink'
              }`}
            >
              {formatMoney(piece.price, STORE_CURRENCY)}
            </span>
            {isDiscounted && piece.originalPrice && (
              <span className="text-[11px] text-graphite/70 line-through tabular-nums">
                {formatMoney(piece.originalPrice, STORE_CURRENCY)}
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Wishlist Button (Preserves isolated click handling & server state) */}
      <SaveToWishlist productId={piece.id} productName={piece.name} />
    </motion.article>
  )
}

/**
 * Renders color swatches or image count indicators when supported on the piece.
 */
function renderVariantIndicators(piece: CataloguePiece) {
  const raw = piece as unknown as {
    colors?: Array<{ name?: string; hex?: string } | string>
    axes?: Array<{ name: string; values: Array<{ hex?: string; value: string }> }>
  }

  // 1. Direct colors array
  if (Array.isArray(raw.colors) && raw.colors.length > 0) {
    return (
      <div className="flex shrink-0 items-center gap-1" aria-label={`${raw.colors.length} color variants`}>
        {raw.colors.slice(0, 4).map((color, i) => {
          const hex = typeof color === 'string' ? color : color?.hex
          return hex ? (
            <span
              key={i}
              className="size-2 rounded-full border border-black/15 shadow-xs"
              style={{ backgroundColor: hex }}
              title={typeof color === 'string' ? color : color?.name}
            />
          ) : null
        })}
        {raw.colors.length > 4 && (
          <span className="text-[9px] text-graphite">+{raw.colors.length - 4}</span>
        )}
      </div>
    )
  }

  // 2. Axes colors (when piece is a detailed piece)
  const colorAxis = raw.axes?.find((axis) => /colou?r/i.test(axis.name))
  if (colorAxis && colorAxis.values.length > 1) {
    const hasHex = colorAxis.values.some((v) => Boolean(v.hex))
    if (hasHex) {
      return (
        <div className="flex shrink-0 items-center gap-1" aria-label={`${colorAxis.values.length} color options`}>
          {colorAxis.values.slice(0, 4).map((val, i) => (
            <span
              key={i}
              className="size-2 rounded-full border border-black/15 shadow-xs"
              style={{ backgroundColor: val.hex || '#000' }}
              title={val.value}
            />
          ))}
          {colorAxis.values.length > 4 && (
            <span className="text-[9px] text-graphite">+{colorAxis.values.length - 4}</span>
          )}
        </div>
      )
    }
    return (
      <span className="shrink-0 text-[9px] tracking-wider text-graphite uppercase">
        {colorAxis.values.length} Colors
      </span>
    )
  }

  // 3. Alternate angles indicator when multiple images exist
  if (piece.images && piece.images.length > 1) {
    return (
      <span className="shrink-0 text-[9px] tracking-wider text-graphite/60 uppercase">
        {piece.images.length} views
      </span>
    )
  }

  return null
}

/**
 * Editorial Quick Add Button.
 *
 * Resolves cheapest active variant on click to preserve lazy loading.
 * Provides clear feedback states (pending spinner, added checkmark, failure alert).
 */
function QuickAdd({ piece }: { piece: CataloguePiece }) {
  const { add, isPendingVariant } = useCartActions()
  const [target, setTarget] = useState<QuickAddTarget | undefined>(undefined)
  const [resolving, setResolving] = useState(false)
  const [justAdded, setJustAdded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [unaddable, setUnaddable] = useState(false)

  if (!piece.isAvailable || unaddable) return null

  const pending = resolving || (target !== undefined && isPendingVariant(target.id))

  const handleQuickAdd = async (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()

    setResolving(true)
    const resolved = await defaultVariantFor(piece.id).catch(() => undefined)
    setResolving(false)

    if (!resolved) {
      setUnaddable(true)
      return
    }

    setTarget(resolved)
    if (await add(resolved.id)) {
      setFailed(false)
      setJustAdded(true)
      window.setTimeout(() => setJustAdded(false), 1600)
    } else {
      setFailed(true)
    }
  }

  return (
    <div className="pointer-events-none absolute inset-x-2.5 bottom-2.5 z-20 translate-y-2 opacity-0 transition-all duration-300 ease-editorial group-hover/card:pointer-events-auto group-hover/card:translate-y-0 group-hover/card:opacity-100 group-focus-within/card:pointer-events-auto group-focus-within/card:translate-y-0 group-focus-within/card:opacity-100 sm:inset-x-3 sm:bottom-3">
      <button
        type="button"
        disabled={pending}
        onClick={handleQuickAdd}
        aria-busy={pending}
        className="flex h-9 sm:h-10 w-full items-center justify-center gap-1.5 border border-white/10 bg-ink/95 px-3 py-2 text-paper text-[10px] sm:text-[11px] font-medium tracking-[0.1em] uppercase backdrop-blur-md transition-all duration-300 hover:bg-black hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
      >
        {pending ? (
          <>
            <Loader2 size={12} strokeWidth={2} className="animate-spin" />
            <span>Adding...</span>
          </>
        ) : justAdded ? (
          <>
            <Check size={12} strokeWidth={2} className="text-emerald-400" />
            <span>Added to Bag</span>
          </>
        ) : failed ? (
          <>
            <TriangleAlert size={12} strokeWidth={2} className="text-rose-400" />
            <span>Try Again</span>
          </>
        ) : (
          <>
            <Plus size={12} strokeWidth={1.5} />
            <span className="truncate">
              Quick Add{target ? ` · ${target.label}` : ''}
            </span>
          </>
        )}
      </button>
    </div>
  )
}
