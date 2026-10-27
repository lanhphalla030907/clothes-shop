import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { Plate } from './ProductStates'
import { SaveToWishlist } from './SaveToWishlist'
import { STORE_CURRENCY } from '@/lib/api/config'
import { formatMoney } from '@/lib/money'
import { defaultVariantFor } from '@/features/catalogue/defaultVariant'
import { useCartActions } from '@/features/cart/useCartActions'
import type { QuickAddTarget } from '@/features/catalogue/defaultVariant'
import type { CataloguePiece } from '@/types'

interface ProductCardProps {
  piece: CataloguePiece
  index?: number
  /** `rail` sizes down for the horizontal showcase. */
  variant?: 'grid' | 'rail'
  priority?: boolean
}

/**
 * Editorial product plate. Metadata lives under a hairline rule rather than
 * in a card, and the quick-add bar wipes up from the base on hover.
 */
export function ProductCard({ piece, index = 0, variant = 'grid', priority = false }: ProductCardProps) {
  const isRail = variant === 'rail'

  return (
    <motion.article
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.85, delay: Math.min(index * 0.06, 0.4), ease: [0.16, 1, 0.3, 1] }}
      className="group/card relative"
    >
      <Link
        to={`/product/${piece.id}`}
        className="block focus-visible:outline-offset-4"
        aria-label={`${piece.name} — ${formatMoney(piece.price, STORE_CURRENCY)}`}
      >
        <div className={`relative overflow-hidden bg-bone ${isRail ? 'aspect-[3/4]' : 'aspect-[4/5]'}`}>
          <Plate
            src={piece.images[0]}
            alt={piece.name}
            priority={priority}
            className="transition-transform duration-[1.4s] ease-editorial group-hover/card:scale-[1.06]"
          />

          {/* The only chrome on the image, and only when there is something to say. */}
          {!piece.isAvailable && (
            <span className="label-micro pointer-events-none absolute top-3 left-3 z-10 bg-paper/85 px-2 py-1.5 text-ink backdrop-blur-sm">
              Unavailable
            </span>
          )}

          <QuickAdd piece={piece} />
        </div>

        <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-line pt-3">
          <div className="min-w-0">
            <h3 className="truncate text-[13px] font-semibold tracking-[-0.01em] text-ink uppercase sm:text-sm">
              {piece.name}
            </h3>
            <p className="mt-1 truncate font-mono text-[10px] tracking-[0.12em] text-graphite uppercase">
              {piece.category}
            </p>
          </div>
          <p className="shrink-0 font-mono text-[11px] tracking-[0.06em] text-ink tabular-nums">
            {formatMoney(piece.price, STORE_CURRENCY)}
          </p>
        </div>
      </Link>

      <SaveToWishlist productId={piece.id} productName={piece.name} />
    </motion.article>
  )
}

/**
 * The hover bar's write to the cart.
 *
 * The variant id is resolved on the click rather than up front: the collection
 * endpoint does not carry variants, so fetching them for every card on the page
 * would cost one request per product to support a bar most visitors never touch.
 * Pending is per variant, so two quick adds on two cards do not block each other.
 */
function QuickAdd({ piece }: { piece: CataloguePiece }) {
  const { add, isPendingVariant } = useCartActions()
  const [target, setTarget] = useState<QuickAddTarget | undefined>(undefined)
  const [resolving, setResolving] = useState(false)
  const [justAdded, setJustAdded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [unaddable, setUnaddable] = useState(false)

  // A product the catalogue has nothing sellable under never gets a bar: the
  // collection only knows this by asking, so the first click is what finds out.
  if (!piece.isAvailable || unaddable) return null

  // Before a variant is resolved there is no id to ask about, so the click's own
  // lookup is what keeps the bar disabled. After that the server's pending state
  // for that variant takes over.
  const pending = resolving || (target !== undefined && isPendingVariant(target.id))

  const handleQuickAdd = async () => {
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
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 translate-y-full transition-transform duration-500 ease-editorial group-hover/card:pointer-events-auto group-hover/card:translate-y-0">
      <button
        type="button"
        disabled={pending}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          void handleQuickAdd()
        }}
        aria-busy={pending}
        className="flex w-full items-center justify-between bg-ink px-4 py-3.5 text-paper label-micro transition-colors duration-300 hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="truncate">
          {pending ? 'Adding' : justAdded ? 'Added' : failed ? 'Try again' : 'Quick add'}
          {target ? ` — ${target.label}` : ''}
        </span>
        <Plus size={13} strokeWidth={1.5} />
      </button>
    </div>
  )
}
