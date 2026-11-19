import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingBag, Trash2 } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { PageHeader, Panel } from '@/components/account/PageHeader'
import { EmptyState, ErrorState, InlineNotice } from '@/components/account/States'
import { Skeleton } from '@/components/account/Skeleton'
import { SmartImage } from '@/components/ui/SmartImage'
import { useWishlistActions } from '@/features/wishlist/useWishlistActions'
import { useCartActions } from '@/features/cart/useCartActions'
import { toUserMessage } from '@/lib/api/errors'
import { formatAmount } from '@/lib/money'
import type { WishlistItem } from '@/types/api'

/**
 * Saved pieces, read from the server. Saving records interest, so a product with
 * nothing sellable is still listed — it is simply not offered to the bag.
 */
export default function Wishlist() {
  const wishlist = useWishlistActions()
  const cart = useCartActions()
  const [added, setAdded] = useState<string | undefined>(undefined)
  const [confirmingClear, setConfirmingClear] = useState(false)

  const addToBag = async (item: WishlistItem) => {
    const variant = sellableVariant(item)
    if (!variant) return

    // The cart owns the failure: it re-reads the bag and holds the message.
    if (await cart.add(variant.id)) setAdded(item.id)
  }

  const count = wishlist.items.length

  const header = (
    <PageHeader
      eyebrow="Account"
      title="Wishlist"
      description="Saved against your account on the studio server, so it is here on any device rather than in this browser."
      action={
        confirmingClear ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-signal/20 bg-signal-soft px-3 py-2">
            <span className="text-[13px] text-ink">Remove everything saved?</span>
            <button
              type="button"
              disabled={wishlist.isClearing}
              onClick={() => void wishlist.clear().then((ok) => ok && setConfirmingClear(false))}
              className="inline-flex h-9 items-center rounded-md border border-signal bg-signal px-3 text-[12.5px] font-semibold text-paper transition-colors hover:bg-signal/90 disabled:opacity-40"
            >
              {wishlist.isClearing ? 'Clearing…' : 'Confirm'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingClear(false)}
              className="inline-flex h-9 items-center rounded-md px-3 text-[12.5px] font-medium text-graphite transition-colors hover:bg-paper hover:text-ink"
            >
              Cancel
            </button>
          </div>
        ) : count === 0 ? undefined : (
          <Action type="button" variant="ghost" size="sm" onClick={() => setConfirmingClear(true)}>
            Clear wishlist
          </Action>
        )
      }
    />
  )

  if (wishlist.isLoading) {
    return (
      <div className="space-y-8">
        {header}
        <WishlistSkeleton />
      </div>
    )
  }

  if (wishlist.error) {
    return (
      <div className="space-y-8">
        {header}
        <ErrorState message={toUserMessage(wishlist.error)} onRetry={wishlist.refetch} />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {header}

      {wishlist.actionError !== undefined && (
        <InlineNotice message={toUserMessage(wishlist.actionError)} onDismiss={wishlist.dismissActionError} />
      )}

      {cart.actionError !== undefined && (
        <InlineNotice message={toUserMessage(cart.actionError)} onDismiss={cart.dismissActionError} />
      )}

      {count === 0 ? (
        <EmptyState
          eyebrow="Nothing saved"
          title="Your wishlist is empty"
          description="Saving a piece keeps it here against your account. Nothing is added to your bag until you ask for it."
          action={
            <Action to="/shop" withArrow>
              Browse the storefront
            </Action>
          }
        />
      ) : (
        <>
          <div className="flex items-center justify-between gap-4">
            <p className="text-[13px] text-graphite">
              <span className="font-mono font-medium text-ink">{String(count).padStart(2, '0')}</span>{' '}
              {count === 1 ? 'piece' : 'pieces'} saved
            </p>
            <Action to="/shop" variant="ghost" size="sm" withArrow>
              Continue browsing
            </Action>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {wishlist.items.map((item) => {
              const variant = sellableVariant(item)
              const isAdding = variant ? cart.isPendingVariant(variant.id) : false
              const isPending = wishlist.isPendingItem(item.id)

              return (
                <li key={item.id}>
                  <Panel className="flex h-full flex-col">
                    <Link
                      to={`/product/${item.product.id}`}
                      className="group relative block aspect-[4/5] overflow-hidden bg-transparent"
                      aria-label={item.product.name}
                    >
                      {item.product.image ? (
                        <SmartImage
                          src={item.product.image.imageUrl}
                          alt={item.product.image.altText ?? item.product.name}
                          fit="cover"
                          position="object-top"
                          background={false}
                          className="h-full w-full transition-transform duration-700 ease-editorial group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="grid size-full place-items-center bg-bone">
                          <span className="text-[12px] text-graphite">No image</span>
                        </div>
                      )}

                      {!item.product.isActive && (
                        <span className="absolute top-3 left-3 inline-flex items-center rounded-md border border-line bg-paper-pure/95 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink shadow-xs backdrop-blur-sm">
                          No longer sold
                        </span>
                      )}

                      {item.product.isActive && !item.product.inStock && (
                        <span className="absolute top-3 left-3 inline-flex items-center rounded-md border border-amber-200/80 bg-amber-50/95 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-amber-800 shadow-xs backdrop-blur-sm">
                          Out of stock
                        </span>
                      )}
                    </Link>

                    <div className="flex flex-1 flex-col p-5 sm:p-6">
                      <div className="min-w-0">
                        <h2 className="text-[15px] leading-snug font-semibold tracking-[-0.01em] text-ink">
                          <Link
                            to={`/product/${item.product.id}`}
                            className="transition-colors duration-200 hover:text-graphite"
                          >
                            {item.product.name}
                          </Link>
                        </h2>

                        <p className="mt-1.5 font-mono text-[13.5px] tabular-nums text-ink">
                          {item.product.priceRange ? priceLabel(item.product.priceRange) : '—'}
                        </p>

                        <p className="mt-2 text-[12.5px] leading-relaxed text-graphite">
                          {describeStock(item)}
                        </p>
                      </div>

                      <div className="mt-auto flex items-center gap-2.5 pt-5">
                        {variant ? (
                          <Action
                            type="button"
                            size="sm"
                            className="flex-1"
                            onClick={() => void addToBag(item)}
                            disabled={isAdding || isPending}
                          >
                            <ShoppingBag size={14} strokeWidth={1.8} aria-hidden />
                            {isAdding ? 'Adding…' : added === item.id ? 'Added' : 'Add to bag'}
                          </Action>
                        ) : (
                          <span className="inline-flex h-11 flex-1 items-center justify-center rounded-[0px] border border-line bg-canvas/50 px-4 text-[13px] font-medium text-graphite">
                            Unavailable
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => void wishlist.remove(item.id)}
                          disabled={isPending || isAdding || wishlist.isClearing}
                          aria-label={`Remove ${item.product.name} from your wishlist`}
                          title="Remove from wishlist"
                          className="grid size-11 shrink-0 place-items-center rounded-[0px] border border-line text-graphite transition-colors duration-200 hover:border-signal/40 hover:bg-signal-soft hover:text-signal disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 size={15} strokeWidth={1.6} aria-hidden />
                        </button>
                      </div>

                      {added === item.id && variant && (
                        <p className="mt-3 text-[12px] leading-relaxed text-graphite">
                          Added to your bag.{' '}
                          <Link to="/account/bag" className="font-medium text-ink underline-offset-4 hover:underline">
                            View bag
                          </Link>
                        </p>
                      )}
                    </div>
                  </Panel>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}

/**
 * The variant to put in the bag: an active product's first active variant that
 * still has stock. No fallback — a wishlist may hold something unsellable, and
 * naming a dead variant would offer a purchase the server will refuse.
 */
const sellableVariant = (item: WishlistItem) =>
  item.product.isActive ? item.product.variants.find((variant) => (variant.available ?? 0) > 0) : undefined

/** A product with one active variant has one price; a range is shown as a range. */
const priceLabel = (range: { min: string; max: string }): string =>
  range.min === range.max
    ? formatAmount(range.min)
    : `${formatAmount(range.min)} — ${formatAmount(range.max)}`

const describeStock = (item: WishlistItem): string => {
  if (!item.product.isActive) return 'Withdrawn from the catalogue.'
  if (item.product.variants.length === 0) return 'No active variants are published yet.'
  if (!item.product.inStock) return 'Every variant is currently out of stock.'

  const available = item.product.variants.reduce((total, variant) => total + (variant.available ?? 0), 0)
  return `${available} available across ${item.product.variants.length} ${
    item.product.variants.length === 1 ? 'variant' : 'variants'
  }.`
}

const WishlistSkeleton = () => (
  <div
    className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
    role="status"
    aria-busy="true"
    aria-label="Loading wishlist"
  >
    <span className="sr-only">Loading wishlist</span>
    {Array.from({ length: 4 }, (_, index) => (
      <div key={index} className="overflow-hidden rounded-xl border border-line bg-paper-pure shadow-xs">
        <Skeleton className="aspect-[4/5] w-full" />
        <div className="space-y-3 p-5 sm:p-6">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-3 w-full" />
          <div className="flex gap-2.5 pt-2">
            <Skeleton className="h-11 flex-1" />
            <Skeleton className="size-11 shrink-0" />
          </div>
        </div>
      </div>
    ))}
  </div>
)