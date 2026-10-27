import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { PageHeader, Panel } from '@/components/account/PageHeader'
import { EmptyState, ErrorState, InlineNotice } from '@/components/account/States'
import { SkeletonCard } from '@/components/account/Skeleton'
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

  const header = (
    <PageHeader
      eyebrow="Account"
      title="Wishlist"
      description="Saved against your account on the studio server, so it is here on any device rather than in this browser."
      action={
        confirmingClear ? (
          <span className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-graphite">Remove everything saved?</span>
            <button
              type="button"
              disabled={wishlist.isClearing}
              onClick={() => void wishlist.clear()}
              className="label-micro border border-signal px-3 py-1.5 text-signal transition-colors hover:bg-signal hover:text-paper disabled:opacity-40"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => setConfirmingClear(false)}
              className="label-micro text-graphite transition-colors hover:text-ink"
            >
              Cancel
            </button>
          </span>
        ) : wishlist.items.length === 0 ? undefined : (
          <button
            type="button"
            onClick={() => setConfirmingClear(true)}
            className="label-micro text-graphite transition-colors hover:text-signal"
          >
            Clear wishlist
          </button>
        )
      }
    />
  )

  if (wishlist.isLoading) {
    return (
      <div className="space-y-8">
        {header}
        <div className="grid gap-4 sm:grid-cols-2">
          <SkeletonCard rows={2} />
          <SkeletonCard rows={2} />
        </div>
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
        <InlineNotice
          message={toUserMessage(wishlist.actionError)}
          onDismiss={wishlist.dismissActionError}
        />
      )}

      {cart.actionError !== undefined && (
        <InlineNotice message={toUserMessage(cart.actionError)} onDismiss={cart.dismissActionError} />
      )}

      {wishlist.items.length === 0 ? (
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
        <ul className="grid gap-4 sm:grid-cols-2">
          {wishlist.items.map((item) => {
            const variant = sellableVariant(item)
            const isAdding = variant ? cart.isPendingVariant(variant.id) : false
            const isPending = wishlist.isPendingItem(item.id)

            return (
              <li key={item.id}>
                <Panel className="flex h-full flex-col">
                  <Link
                    to={`/product/${item.product.id}`}
                    className="relative block aspect-4/5 overflow-hidden bg-bone"
                    aria-label={item.product.name}
                  >
                    {item.product.image ? (
                      <SmartImage
                        src={item.product.image.imageUrl}
                        alt={item.product.image.altText ?? item.product.name}
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="grid size-full place-items-center">
                        <span className="label-micro text-ash">No image</span>
                      </div>
                    )}

                    {!item.product.isActive && (
                      <span className="label-micro absolute top-3 left-3 bg-paper px-2.5 py-1.5 text-ink">
                        No longer sold
                      </span>
                    )}

                    {item.product.isActive && !item.product.inStock && (
                      <span className="label-micro absolute top-3 left-3 bg-paper px-2.5 py-1.5 text-ink">
                        Out of stock
                      </span>
                    )}
                  </Link>

                  <div className="flex flex-1 flex-col p-5">
                    <h2 className="text-sm font-medium text-ink">
                      <Link
                        to={`/product/${item.product.id}`}
                        className="transition-opacity duration-200 hover:opacity-70"
                      >
                        {item.product.name}
                      </Link>
                    </h2>

                    <p className="mt-2 font-mono text-sm text-ink">
                      {item.product.priceRange ? priceLabel(item.product.priceRange) : '—'}
                    </p>

                    <p className="mt-2 text-xs leading-relaxed text-graphite">
                      {describeStock(item)}
                    </p>

                    <div className="mt-auto flex items-center gap-3 pt-6">
                      {variant ? (
                        <button
                          type="button"
                          onClick={() => void addToBag(item)}
                          disabled={isAdding || isPending}
                          className="label-micro h-11 flex-1 border border-ink bg-ink text-paper transition-colors duration-300 hover:bg-paper hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {isAdding ? 'Adding' : added === item.id ? 'Added' : 'Add to bag'}
                        </button>
                      ) : (
                        <span className="label-micro flex h-11 flex-1 items-center justify-center border border-line text-ash">
                          Unavailable
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => void wishlist.remove(item.id)}
                        disabled={isPending || isAdding || wishlist.isClearing}
                        aria-label={`Remove ${item.product.name} from your wishlist`}
                        className="grid size-11 shrink-0 place-items-center border border-line text-graphite transition-colors duration-200 hover:border-signal hover:text-signal disabled:opacity-40"
                      >
                        <Trash2 size={14} strokeWidth={1.5} />
                      </button>
                    </div>

                    {variant && (
                      <p className="mt-3 text-xs leading-relaxed text-graphite">
                        Adds {variant.sku}
                        {added === item.id ? ' — open your bag to check out.' : '.'}
                      </p>
                    )}
                  </div>
                </Panel>
              </li>
            )
          })}
        </ul>
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
  item.product.isActive
    ? item.product.variants.find((variant) => (variant.available ?? 0) > 0)
    : undefined

/** A product with one active variant has one price; a range is shown as a range. */
const priceLabel = (range: { min: string; max: string }): string =>
  range.min === range.max
    ? formatAmount(range.min)
    : `${formatAmount(range.min)} — ${formatAmount(range.max)}`

const describeStock = (item: WishlistItem): string => {
  if (!item.product.isActive) return 'Withdrawn from the catalogue.'
  if (item.product.variants.length === 0) return 'No active variants are published yet.'
  if (!item.product.inStock) return 'Every variant is currently out of stock.'

  const available = item.product.variants.reduce(
    (total, variant) => total + (variant.available ?? 0),
    0,
  )
  return `${available} available across ${item.product.variants.length} ${item.product.variants.length === 1 ? 'variant' : 'variants'}.`
}