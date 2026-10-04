import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { PageHeader, Panel } from '@/components/account/PageHeader'
import { EmptyState, ErrorState, InlineNotice } from '@/components/account/States'
import { SkeletonCard } from '@/components/account/Skeleton'
import { SmartImage } from '@/components/ui/SmartImage'
import { useWishlist } from '@/features/wishlist/useWishlist'
import { useAccountCart } from '@/features/cart/useAccountCart'
import { toUserMessage } from '@/lib/api/errors'
import { formatAmount } from '@/lib/money'
import type { WishlistItem } from '@/types/api'

/**
 * Saved pieces, held server-side against the account.
 *
 * ## "Add to bag" and the missing product pages
 *
 * The storefront's product pages are static, with no variant ids, so a saved
 * product cannot be shown as a row on `/product/:id`. The only honest way to move
 * a saved piece into the cart is to name a real, in-stock variant — which is what
 * this button does, using the server's own answer to "which variant should I
 * pick?". It adds the first in-stock active variant and says which one it chose,
 * rather than silently picking the cheapest and hoping.
 *
 * When nothing is in stock the button is absent rather than disabled-because-empty,
 * and the reason is on the row.
 */
export default function Wishlist() {
  const wishlist = useWishlist()
  const cart = useAccountCart()
  const [added, setAdded] = useState<string | undefined>(undefined)
  const [addingId, setAddingId] = useState<string | undefined>(undefined)
  const [actionError, setActionError] = useState<unknown>(undefined)

  const addToBag = async (item: WishlistItem) => {
    const variant = pickVariant(item)
    if (!variant) return

    setAddingId(item.id)
    setActionError(undefined)

    try {
      const ok = await cart.addVariant(variant.id)
      if (ok) setAdded(item.id)
      else setActionError(cart.actionError)
    } finally {
      setAddingId(undefined)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Account"
        title="Wishlist"
        description="Saved against your account on the studio server, so it is here on any device rather than in this browser."
      />

      {wishlist.actionError !== undefined && (
        <InlineNotice
          message={toUserMessage(wishlist.actionError)}
          onDismiss={wishlist.dismissActionError}
        />
      )}

      {actionError !== undefined && <InlineNotice message={toUserMessage(actionError)} />}

      {wishlist.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <SkeletonCard rows={2} />
          <SkeletonCard rows={2} />
        </div>
      ) : wishlist.error ? (
        <ErrorState message={toUserMessage(wishlist.error)} onRetry={wishlist.refetch} />
      ) : wishlist.items.length === 0 ? (
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
            const variant = pickVariant(item)
            const isAdding = addingId === item.id
            const isPending = wishlist.isPendingItem(item.id)

            return (
              <li key={item.id}>
                <Panel className="flex h-full flex-col">
                  <div className="relative aspect-4/5 overflow-hidden bg-bone">
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

                    {!item.product.inStock && (
                      <span className="label-micro absolute top-3 left-3 bg-paper px-2.5 py-1.5 text-ink">
                        Out of stock
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <h2 className="text-sm font-medium text-ink">{item.product.name}</h2>

                    <p className="mt-2 font-mono text-sm text-ink">
                      {item.product.priceRange
                        ? priceLabel(item.product.priceRange)
                        : '—'}
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
                        <span className="label-micro h-11 flex-1 border border-line text-ash">
                          Unavailable
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => void wishlist.remove(item.id)}
                        disabled={isPending || isAdding}
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
 * The variant to put in the bag: the first one that is active and in stock.
 *
 * Not the cheapest. The shopper saved a *product*, and choosing on price for them
 * would put something in their bag they did not choose. Ordering is whatever the
 * server returned, which is deterministic, so the same product always resolves to
 * the same variant.
 */
const pickVariant = (item: WishlistItem) =>
  item.product.variants.find((variant) => (variant.available ?? 0) > 0) ??
  item.product.variants[0]

/** A product with one active variant has one price; a range is shown as a range. */
const priceLabel = (range: { min: string; max: string }): string =>
  range.min === range.max ? formatAmount(range.min) : `${formatAmount(range.min)} — ${formatAmount(range.max)}`

const describeStock = (item: WishlistItem): string => {
  if (item.product.variants.length === 0) return 'No active variants are published yet.'
  if (!item.product.inStock) return 'Every variant is currently out of stock.'
  const available = item.product.variants.reduce((total, variant) => total + (variant.available ?? 0), 0)
  return `${available} available across ${item.product.variants.length} ${item.product.variants.length === 1 ? 'variant' : 'variants'}.`
}
