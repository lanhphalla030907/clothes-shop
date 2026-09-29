import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { SmartImage } from '@/components/ui/SmartImage'
import { formatPrice } from '@/lib/format'
import { useCart } from '@/hooks/useCart'
import { useUI } from '@/hooks/useUI'
import type { Product } from '@/types'

interface ProductCardProps {
  product: Product
  index?: number
  /** `rail` sizes down for the horizontal showcase. */
  variant?: 'grid' | 'rail'
  priority?: boolean
}

/**
 * Editorial product plate. Metadata lives under a hairline rule rather than
 * in a card, and the quick-add bar wipes up from the base on hover.
 */
export function ProductCard({ product, index = 0, variant = 'grid', priority = false }: ProductCardProps) {
  const { addItem } = useCart()
  const { openCart } = useUI()
  const isRail = variant === 'rail'

  const handleQuickAdd = () => {
    addItem(product, { size: product.sizes[0], color: product.colors[0].name })
    openCart()
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.85, delay: Math.min(index * 0.06, 0.4), ease: [0.16, 1, 0.3, 1] }}
      className="group/card relative"
    >
      <Link
        to={`/product/${product.id}`}
        className="block focus-visible:outline-offset-4"
        aria-label={`${product.name} — ${formatPrice(product.price)}`}
      >
        <div
          className={`relative overflow-hidden bg-bone ${
            isRail ? 'aspect-[3/4]' : 'aspect-[4/5]'
          }`}
        >
          <SmartImage
            src={product.images[0]}
            alt={product.name}
            priority={priority}
            className="h-full w-full transition-transform duration-[1.4s] ease-editorial group-hover/card:scale-[1.06]"
          />

          {/* Release tag — the only chrome that sits on the image */}
          <span className="label-micro pointer-events-none absolute top-3 left-3 z-10 bg-paper/85 px-2 py-1.5 text-ink backdrop-blur-sm">
            {product.release} / 25
          </span>

          {/* Quick add wipes up from the base */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 translate-y-full transition-transform duration-500 ease-editorial group-hover/card:pointer-events-auto group-hover/card:translate-y-0">
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                handleQuickAdd()
              }}
              className="flex w-full items-center justify-between bg-ink px-4 py-3.5 text-paper label-micro transition-colors duration-300 hover:bg-ink-soft"
            >
              <span>Quick add — {product.sizes[0]}</span>
              <Plus size={13} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-line pt-3">
          <div className="min-w-0">
            <h3 className="truncate text-[13px] font-semibold tracking-[-0.01em] text-ink uppercase sm:text-sm">
              {product.name}
            </h3>
            <p className="mt-1 truncate font-mono text-[10px] tracking-[0.12em] text-graphite uppercase">
              {product.category} — {product.tagline}
            </p>
          </div>
          <p className="shrink-0 font-mono text-[11px] tracking-[0.06em] text-ink tabular-nums">
            {formatPrice(product.price)}
          </p>
        </div>
      </Link>
    </motion.article>
  )
}
