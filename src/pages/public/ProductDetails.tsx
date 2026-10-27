import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Truck, Ruler, RotateCcw } from 'lucide-react'
import { ProductCard } from '@/components/product/ProductCard'
import { SaveToWishlist } from '@/components/product/SaveToWishlist'
import { Plate, ProductDetailSkeleton, ProductNotice } from '@/components/product/ProductStates'
import { Reveal } from '@/components/ui/Reveal'
import { Action } from '@/components/ui/Action'
import { SmartImage } from '@/components/ui/SmartImage'
import { useProductDetail, useRelatedPieces } from '@/features/catalogue/useCatalogue'
import { initialSelection, isBuyable, reachableAxes, variantFor } from '@/features/catalogue/present'
import { useCartActions } from '@/features/cart/useCartActions'
import { STORE_CURRENCY } from '@/lib/api/config'
import { isApiError, toUserMessage } from '@/lib/api/errors'
import { formatMoney } from '@/lib/money'
import type { CatalogueAxis, CatalogueDetail, CatalogueAxisValue, OptionSelection } from '@/types'

const EASE = [0.16, 1, 0.3, 1] as const

/** The house ceiling on a single line, independent of what is in stock. */
const MAX_QUANTITY = 10

const ASSURANCES = [
  { icon: Truck, label: 'Free express over $500' },
  { icon: RotateCcw, label: '30-day returns' },
  { icon: Ruler, label: 'True to size' },
] as const

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>()
  const resource = useProductDetail(id)

  if (resource.isLoading) return <ProductDetailSkeleton />

  if (resource.error !== undefined) {
    // Absent is a fact about the catalogue and gets its own words; anything else
    // is a fault worth offering a retry for.
    if (isApiError(resource.error) && resource.error.kind === 'notFound') {
      return (
        <ProductNotice
          eyebrow="Not found"
          title="This piece has moved on"
          message="It is either out of the current release or has been archived. The rest of the collection is still open."
        />
      )
    }

    return (
      <ProductNotice
        eyebrow="The catalogue did not load"
        title="Nothing to show"
        message={toUserMessage(resource.error)}
        action={
          <Action size="sm" onClick={resource.refetch}>
            Try again
          </Action>
        }
      />
    )
  }

  if (!resource.data) return <ProductNotice eyebrow="Not found" title="This piece has moved on" message="It is either out of the current release or has been archived." />

  return <Piece detail={resource.data} />
}

function Piece({ detail }: { detail: CatalogueDetail }) {
  const { add, isPendingVariant, actionError } = useCartActions()
  const related = useRelatedPieces(detail.categoryId, detail.id)

  const [selection, setSelection] = useState<OptionSelection>(() =>
    initialSelection(detail.variants, detail.axes),
  )
  const [quantity, setQuantity] = useState(1)
  const [justAdded, setJustAdded] = useState(false)

  // Derive-during-reset: a different product means a fresh set of choices.
  const [shownId, setShownId] = useState(detail.id)
  if (shownId !== detail.id) {
    setShownId(detail.id)
    setSelection(initialSelection(detail.variants, detail.axes))
    setQuantity(1)
    setJustAdded(false)
  }

  // Options that still lead somewhere buyable, given everything else chosen.
  const axes = useMemo(
    () => reachableAxes(detail.variants.filter(isBuyable), detail.axes, selection),
    [detail, selection],
  )

  const selected = variantFor(detail.variants, selection)
  const price = selected?.price ?? detail.price
  const stock = selected?.available ?? null
  const buyable = selected !== undefined && isBuyable(selected)
  const pending = selected ? isPendingVariant(selected.id) : false

  const ceiling = Math.max(1, Math.min(MAX_QUANTITY, stock ?? MAX_QUANTITY))

  useEffect(() => {
    if (!justAdded) return
    const timer = window.setTimeout(() => setJustAdded(false), 4000)
    return () => window.clearTimeout(timer)
  }, [justAdded])

  const handleAdd = async () => {
    if (!selected) return
    if (await add(selected.id, quantity)) setJustAdded(true)
  }

  return (
    <>
      {/* Breadcrumb */}
      <div className="container-editorial pt-24 sm:pt-32">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-ash uppercase"
        >
          <Link to="/shop" className="transition-colors hover:text-ink">
            Collection
          </Link>
          <span aria-hidden>/</span>
          {detail.categorySlug ? (
            <Link to={`/shop?category=${detail.categorySlug}`} className="transition-colors hover:text-ink">
              {detail.category}
            </Link>
          ) : (
            <span className="text-graphite">{detail.category}</span>
          )}
          <span aria-hidden>/</span>
          <span className="text-ink">{detail.name}</span>
        </nav>
      </div>

      <div className="container-editorial grid gap-10 pt-8 pb-20 sm:pt-12 lg:grid-cols-12 lg:gap-14 lg:pb-32">
        {/* ── Gallery ──────────────────────────────────────────── */}
        <Gallery detail={detail} />

        {/* ── Info ─────────────────────────────────────────────── */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.05, ease: EASE }}
            >
              <div className="flex items-center justify-between gap-4">
                <span className="label-micro text-graphite">{detail.category}</span>
                <span className="label-micro text-ash">{stockLabel(stock)}</span>
              </div>

              <h1 className="type-display mt-5 text-[11vw] leading-[0.86] sm:text-[7vw] lg:text-[3.4rem]">
                {detail.name}
              </h1>

              <p className="mt-4 font-mono text-lg tracking-[0.02em] tabular-nums">
                {formatMoney(price, STORE_CURRENCY)}
              </p>

              {detail.description && (
                <p className="mt-6 text-sm leading-[1.85] text-graphite sm:text-[15px]">
                  {detail.description}
                </p>
              )}
            </motion.div>

            {axes.map((axis, index) => (
              <AxisRow
                key={axis.name}
                axis={axis}
                selected={selection[axis.name]}
                onSelect={(value) => setSelection((current) => ({ ...current, [axis.name]: value }))}
                delay={0.12 + index * 0.06}
              />
            ))}

            {/* Quantity + add */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.24, ease: EASE }}
              className="mt-8 flex flex-col gap-3 sm:flex-row"
            >
              <div className="flex items-center border border-line">
                <button
                  type="button"
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                  className="grid size-12 place-items-center text-lg transition-colors duration-300 ease-editorial hover:bg-ink hover:text-paper disabled:pointer-events-none disabled:text-ash"
                >
                  −
                </button>
                <span className="w-9 text-center font-mono text-xs tabular-nums">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((current) => Math.min(ceiling, current + 1))}
                  disabled={quantity >= ceiling}
                  aria-label="Increase quantity"
                  className="grid size-12 place-items-center text-lg transition-colors duration-300 ease-editorial hover:bg-ink hover:text-paper disabled:pointer-events-none disabled:text-ash"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={() => void handleAdd()}
                disabled={!buyable || pending}
                aria-busy={pending}
                className="group relative flex h-12 flex-1 items-center justify-center gap-3 overflow-hidden bg-ink py-0 text-paper label-micro transition-colors duration-500 ease-editorial hover:text-ink disabled:pointer-events-none disabled:opacity-40"
              >
                <span
                  aria-hidden
                  className="absolute inset-0 origin-bottom scale-y-0 bg-paper transition-transform duration-500 ease-editorial group-hover:scale-y-100"
                />
                <span className="relative z-10 flex items-center gap-2">
                  {addLabel({ buyable, pending, justAdded })}
                  <ArrowRight
                    size={13}
                    strokeWidth={1.5}
                    className="transition-transform duration-500 ease-editorial group-hover:translate-x-1"
                  />
                </span>
              </button>
            </motion.div>

            <SaveToWishlist
              productId={detail.id}
              productName={detail.name}
              variant="inline"
            />

            {actionError !== undefined && (
              <p role="alert" className="mt-4 border border-signal/30 bg-signal-soft px-4 py-3 text-sm text-ink">
                {toUserMessage(actionError)}
              </p>
            )}

            {justAdded && (
              <div role="status" className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-line bg-bone px-4 py-3">
                <span className="text-sm text-ink">Added to your bag.</span>
                <Link
                  to="/dashboard/bag"
                  className="label-micro inline-flex items-center gap-2 text-ink transition-opacity hover:opacity-70"
                >
                  View bag
                  <ArrowRight size={12} strokeWidth={1.5} />
                </Link>
              </div>
            )}

            {/* Assurances */}
            <ul className="mt-8 flex flex-col gap-px border border-line bg-line">
              {ASSURANCES.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-3 bg-paper px-4 py-3.5">
                  <Icon size={14} strokeWidth={1.3} className="text-graphite" />
                  <span className="font-mono text-[10px] tracking-[0.12em] text-graphite uppercase">
                    {label}
                  </span>
                </li>
              ))}
            </ul>

            {selected && (
              <p className="mt-6 font-mono text-[10px] tracking-[0.12em] text-ash uppercase">
                {selected.sku}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Related */}
      {related.data !== undefined && related.data.length > 0 && (
        <section className="container-editorial border-t border-line py-16 sm:py-24">
          <Reveal>
            <div className="flex items-center justify-between gap-6">
              <h2 className="type-display text-[10vw] leading-none sm:text-[5vw]">Pairs with</h2>
              <Link
                to="/shop"
                className="label-micro link-wipe text-graphite transition-colors hover:text-ink"
              >
                All pieces
              </Link>
            </div>
          </Reveal>
          <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-3">
            {related.data.map((piece, index) => (
              <ProductCard key={piece.id} piece={piece} index={index} />
            ))}
          </div>
        </section>
      )}
    </>
  )
}

/* ──────────────────────────────── gallery ──────────────────────────────── */

const Gallery = ({ detail }: { detail: CatalogueDetail }) => {
  const [active, setActive] = useState(0)
  const [shownId, setShownId] = useState(detail.id)

  if (shownId !== detail.id) {
    setShownId(detail.id)
    setActive(0)
  }

  const images = detail.images
  const index = Math.min(active, Math.max(0, images.length - 1))

  const step = (direction: 1 | -1) =>
    images.length > 0 && setActive((index + direction + images.length) % images.length)

  return (
    <div className="lg:col-span-7">
      <div className="relative">
        <div className="relative aspect-4/5 overflow-hidden bg-bone sm:aspect-4/3 lg:aspect-4/5">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${detail.id}-${index}`}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="absolute inset-0"
            >
              <Plate
                src={images[index]}
                alt={`${detail.name} — view ${index + 1}`}
                priority
                className="h-full w-full"
              />
            </motion.div>
          </AnimatePresence>

          {images.length > 1 && (
            <>
              <span className="label-micro pointer-events-none absolute top-4 left-4 bg-paper/85 px-2.5 py-2 text-ink backdrop-blur-sm">
                {String(index + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
              </span>

              <div className="absolute right-4 bottom-4 flex gap-2">
                <GalleryArrow direction={-1} onClick={() => step(-1)} />
                <GalleryArrow direction={1} onClick={() => step(1)} />
              </div>
            </>
          )}
        </div>

        {images.length > 1 && (
          <div className="mt-3 grid grid-cols-4 gap-3">
            {images.slice(0, 4).map((source, position) => (
              <button
                key={source}
                type="button"
                onClick={() => setActive(position)}
                aria-label={`View image ${position + 1}`}
                aria-current={position === index}
                className={`relative aspect-4/5 overflow-hidden bg-bone transition-opacity duration-400 ease-editorial ${
                  position === index ? 'opacity-100' : 'opacity-45 hover:opacity-80'
                }`}
              >
                <SmartImage src={source} alt="" shimmer={false} className="h-full w-full" />
                <span
                  className={`absolute inset-0 border transition-colors duration-400 ${
                    position === index ? 'border-ink' : 'border-transparent'
                  }`}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const GalleryArrow = ({ direction, onClick }: { direction: 1 | -1; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={direction === 1 ? 'Next image' : 'Previous image'}
    className="grid size-10 place-items-center border border-line bg-paper/85 text-ink backdrop-blur-sm transition-colors duration-400 ease-editorial hover:bg-ink hover:text-paper"
  >
    {direction === 1 ? (
      <ArrowRight size={14} strokeWidth={1.4} />
    ) : (
      <ArrowLeft size={14} strokeWidth={1.4} />
    )}
  </button>
)

/* ──────────────────────────────── options ──────────────────────────────── */

const AxisRow = ({
  axis,
  selected,
  onSelect,
  delay,
}: {
  axis: CatalogueAxis
  selected: string | undefined
  onSelect: (value: string) => void
  delay: number
}) => {
  const isSize = /size|fit/i.test(axis.name)

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.85, delay, ease: EASE }}
      className="mt-7 border-t border-line pt-7 first:border-t-0"
    >
      <div className="flex items-center justify-between gap-4">
        <span className="label-micro text-graphite">{axis.name}</span>
        {isSize ? (
          <span className="font-mono text-[10px] tracking-[0.12em] text-ash uppercase">
            True to size
          </span>
        ) : (
          <span className="font-mono text-[11px] text-ink">{selected}</span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {axis.values.map((entry) =>
          entry.hex ? (
            <Swatch
              key={entry.value}
              entry={entry}
              hex={entry.hex}
              isSelected={selected === entry.value}
              onSelect={onSelect}
            />
          ) : (
            <Chip
              key={entry.value}
              entry={entry}
              isSelected={selected === entry.value}
              onSelect={onSelect}
            />
          ),
        )}
      </div>
    </motion.div>
  )
}

const Chip = ({
  entry,
  isSelected,
  onSelect,
}: {
  entry: CatalogueAxisValue
  isSelected: boolean
  onSelect: (value: string) => void
}) => (
  <button
    type="button"
    onClick={() => onSelect(entry.value)}
    disabled={!entry.isAvailable}
    aria-pressed={isSelected}
    title={entry.isAvailable ? undefined : 'Sold out'}
    className={`h-11 min-w-13 border px-4 font-mono text-[11px] tracking-[0.08em] uppercase transition-all duration-400 ease-editorial ${
      isSelected
        ? 'border-ink bg-ink text-paper'
        : 'border-line text-ink hover:border-ink disabled:pointer-events-none disabled:text-ash'
    }`}
  >
    {entry.value}
  </button>
)

const Swatch = ({
  entry,
  hex,
  isSelected,
  onSelect,
}: {
  entry: CatalogueAxisValue
  /** Required, so the tick's contrast never has to guess at an absent colour. */
  hex: string
  isSelected: boolean
  onSelect: (value: string) => void
}) => (
  <button
    type="button"
    onClick={() => onSelect(entry.value)}
    disabled={!entry.isAvailable}
    aria-label={entry.value}
    aria-pressed={isSelected}
    title={entry.isAvailable ? entry.value : `${entry.value} — sold out`}
    className={`grid size-9 place-items-center rounded-full border transition-all duration-400 ease-editorial disabled:pointer-events-none disabled:opacity-40 ${
      isSelected ? 'border-ink' : 'border-line hover:border-graphite'
    }`}
  >
    <span className="grid size-6 place-items-center rounded-full" style={{ backgroundColor: hex }}>
      {isSelected && (
        <Check size={12} strokeWidth={2} className={isLight(hex) ? 'text-ink' : 'text-paper'} />
      )}
    </span>
  </button>
)

/* ───────────────────────────────── copy ─────────────────────────────────── */

/** Relative luminance, so a swatch's tick is legible on any colour. */
const isLight = (hex: string): boolean => {
  const value = hex.replace('#', '')
  const full =
    value.length === 3
      ? value
          .split('')
          .map((char) => char + char)
          .join('')
      : value

  const channels = [0, 2, 4].map((offset) => {
    const channel = Number.parseInt(full.slice(offset, offset + 2), 16) / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2] > 0.45
}

/** `null` is unknown stock, so it makes no claim at all. */
const stockLabel = (stock: number | null): string => {
  if (stock === null) return 'Availability on request'
  if (stock === 0) return 'Sold out'
  if (stock <= 3) return `Only ${stock} left`
  return 'In stock'
}

const addLabel = ({
  buyable,
  pending,
  justAdded,
}: {
  buyable: boolean
  pending: boolean
  justAdded: boolean
}): string => {
  if (pending) return 'Adding to bag'
  if (justAdded) return 'Added to bag'
  return buyable ? 'Add to bag' : 'Unavailable'
}
