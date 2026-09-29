import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Truck, Ruler, RotateCcw } from 'lucide-react'
import { getProductById, getRelatedProducts } from '@/data/products'
import { useCart } from '@/hooks/useCart'
import { useUI } from '@/hooks/useUI'
import { SmartImage } from '@/components/ui/SmartImage'
import { Reveal } from '@/components/ui/Reveal'
import { ProductCard } from '@/components/product/ProductCard'
import { formatPrice } from '@/lib/format'
import type { Product } from '@/types'

const EASE = [0.16, 1, 0.3, 1] as const

const ASSURANCES = [
  { icon: Truck, label: 'Free express over $500' },
  { icon: RotateCcw, label: '30-day returns' },
  { icon: Ruler, label: 'True to size' },
] as const

/** Selections live per-product, so switching pieces resets them cleanly. */
interface Selection {
  productId: string | undefined
  image: number
  size: string | null
  color: string | null
  quantity: number
  sizeError: boolean
  justAdded: boolean
}

const selectionFor = (product: Product | undefined): Selection => ({
  productId: product?.id,
  image: 0,
  size: product?.sizes[0] ?? null,
  color: product?.colors[0].name ?? null,
  quantity: 1,
  sizeError: false,
  justAdded: false,
})

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>()
  const product = getProductById(id)

  const { addItem } = useCart()
  const { openCart } = useUI()

  const [selection, setSelection] = useState<Selection>(() => selectionFor(product))
  const [justAdded, setJustAdded] = useState(false)

  // Derive-during-reset: a different product means a fresh set of choices.
  if (selection.productId !== product?.id) {
    setSelection(selectionFor(product))
  }

  const { image: activeImage, size, color, quantity, sizeError } = selection
  const patch = (next: Partial<Selection>) =>
    setSelection((current) => ({ ...current, ...next }))

  useEffect(() => {
    if (!justAdded) return
    const timer = window.setTimeout(() => {
      setJustAdded(false)
      openCart()
    }, 550)
    return () => window.clearTimeout(timer)
  }, [justAdded, openCart])

  if (!product) return <Navigate to="/shop" replace />

  const related = getRelatedProducts(product)

  const handleAdd = () => {
    if (!size) {
      patch({ sizeError: true })
      return
    }
    addItem(product, { size, color: color ?? product.colors[0].name, quantity })
    setJustAdded(true)
  }

  const step = (direction: 1 | -1) =>
    patch({ image: (activeImage + direction + product.images.length) % product.images.length })

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
          <Link to={`/shop?category=${product.category}`} className="transition-colors hover:text-ink">
            {product.category}
          </Link>
          <span aria-hidden>/</span>
          <span className="text-ink">{product.name}</span>
        </nav>
      </div>

      <div className="container-editorial grid gap-10 pt-8 pb-20 sm:pt-12 lg:grid-cols-12 lg:gap-14 lg:pb-32">
        {/* ── Gallery ──────────────────────────────────────────── */}
        <div className="lg:col-span-7">
          <div className="relative">
            <div className="relative aspect-4/5 overflow-hidden bg-bone sm:aspect-4/3 lg:aspect-4/5">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activeImage}
                  initial={{ opacity: 0, scale: 1.04 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6, ease: EASE }}
                  className="absolute inset-0"
                >
                  <SmartImage
                    src={product.images[activeImage]}
                    alt={`${product.name} — view ${activeImage + 1}`}
                    priority
                    className="h-full w-full"
                  />
                </motion.div>
              </AnimatePresence>

              <span className="label-micro pointer-events-none absolute top-4 left-4 bg-paper/85 px-2.5 py-2 text-ink backdrop-blur-sm">
                {String(activeImage + 1).padStart(2, '0')} /{' '}
                {String(product.images.length).padStart(2, '0')}
              </span>

              <div className="absolute right-4 bottom-4 flex gap-2">
                <GalleryArrow direction={-1} onClick={() => step(-1)} />
                <GalleryArrow direction={1} onClick={() => step(1)} />
              </div>
            </div>

            {/* Thumbnails */}
            <div className="mt-3 grid grid-cols-4 gap-3">
              {product.images.map((source, index) => (
                <button
                  key={source}
                  type="button"
                  onClick={() => patch({ image: index })}
                  aria-label={`View image ${index + 1}`}
                  aria-current={index === activeImage}
                  className={`relative aspect-4/5 overflow-hidden bg-bone transition-opacity duration-400 ease-editorial ${
                    index === activeImage ? 'opacity-100' : 'opacity-45 hover:opacity-80'
                  }`}
                >
                  <SmartImage src={source} alt="" shimmer={false} className="h-full w-full" />
                  <span
                    className={`absolute inset-0 border transition-colors duration-400 ${
                      index === activeImage ? 'border-ink' : 'border-transparent'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Info ─────────────────────────────────────────────── */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.05, ease: EASE }}
            >
              <div className="flex items-center justify-between gap-4">
                <span className="label-micro text-graphite">
                  {product.category} — Release {product.release}
                </span>
                <span className="label-micro text-ash">Limited</span>
              </div>

              <h1 className="type-display mt-5 text-[11vw] leading-[0.86] sm:text-[7vw] lg:text-[3.4rem]">
                {product.name}
              </h1>

              <p className="mt-4 font-mono text-lg tracking-[0.02em] tabular-nums">
                {formatPrice(product.price)}
              </p>

              <p className="mt-6 text-sm leading-[1.85] text-graphite sm:text-[15px]">
                {product.description}
              </p>
            </motion.div>

            {/* Colour */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.12, ease: EASE }}
              className="mt-9 border-t border-line pt-7"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="label-micro text-graphite">Colour</span>
                <span className="font-mono text-[11px] text-ink">{color}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                {product.colors.map((option) => (
                  <button
                    key={option.name}
                    type="button"
                    onClick={() => patch({ color: option.name })}
                    aria-label={option.name}
                    aria-pressed={color === option.name}
                    className={`grid size-9 place-items-center rounded-full border transition-all duration-400 ease-editorial ${
                      color === option.name ? 'border-ink' : 'border-line hover:border-graphite'
                    }`}
                  >
                    <span
                      className="grid size-6 place-items-center rounded-full"
                      style={{ backgroundColor: option.hex }}
                    >
                      {color === option.name && (
                        <Check
                          size={12}
                          strokeWidth={2}
                          className={
                            option.hex === '#F7F6F3' || option.hex === '#E8E3D9'
                              ? 'text-ink'
                              : 'text-paper'
                          }
                        />
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Size */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.18, ease: EASE }}
              className="mt-7"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="label-micro text-graphite">Size</span>
                <span className="font-mono text-[10px] tracking-[0.12em] text-ash uppercase">
                  True to size
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {product.sizes.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => patch({ size: option, sizeError: false })}
                    aria-pressed={size === option}
                    className={`h-11 min-w-13 border px-4 font-mono text-[11px] tracking-[0.08em] uppercase transition-all duration-400 ease-editorial ${
                      size === option
                        ? 'border-ink bg-ink text-paper'
                        : 'border-line text-ink hover:border-ink'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              {sizeError && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 font-mono text-[10px] tracking-[0.12em] text-ink uppercase"
                >
                  Select a size to continue
                </motion.p>
              )}
            </motion.div>

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
                  onClick={() => patch({ quantity: Math.max(1, quantity - 1) })}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                  className="grid size-12 place-items-center text-lg transition-colors duration-300 ease-editorial hover:bg-ink hover:text-paper disabled:pointer-events-none disabled:text-ash"
                >
                  −
                </button>
                <span className="w-9 text-center font-mono text-xs tabular-nums">{quantity}</span>
                <button
                  type="button"
                  onClick={() => patch({ quantity: Math.min(10, quantity + 1) })}
                  disabled={quantity >= 10}
                  aria-label="Increase quantity"
                  className="grid size-12 place-items-center text-lg transition-colors duration-300 ease-editorial hover:bg-ink hover:text-paper disabled:pointer-events-none disabled:text-ash"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={handleAdd}
                className="group relative flex h-12 flex-1 items-center justify-center gap-3 overflow-hidden bg-ink py-0 text-paper label-micro transition-colors duration-500 ease-editorial hover:text-ink"
              >
                <span
                  aria-hidden
                  className="absolute inset-0 origin-bottom scale-y-0 bg-paper transition-transform duration-500 ease-editorial group-hover:scale-y-100"
                />
                <span className="relative z-10 flex items-center gap-2">
                  {justAdded ? 'Added to bag' : 'Add to bag'}
                  <ArrowRight
                    size={13}
                    strokeWidth={1.5}
                    className="transition-transform duration-500 ease-editorial group-hover:translate-x-1"
                  />
                </span>
              </button>
            </motion.div>

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

            {/* Details */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.9, delay: 0.32 }}
              className="mt-8"
            >
              <h2 className="label-micro text-graphite">Details</h2>
              <p className="mt-4 text-[13px] leading-[1.9] text-graphite sm:text-sm">
                {product.details}
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
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
            {related.map((item, index) => (
              <ProductCard key={item.id} product={item} index={index} />
            ))}
          </div>
        </section>
      )}
    </>
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
