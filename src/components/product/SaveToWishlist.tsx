import { useState } from 'react'
import { Heart, TriangleAlert } from 'lucide-react'
import { useWishlistActions } from '@/features/wishlist/useWishlistActions'

interface SaveToWishlistProps {
  productId: string
  productName: string
  /** `plate` sits over a card image; `inline` is the product page's labelled control. */
  variant?: 'plate' | 'inline'
  className?: string
}

/**
 * The one save control. Card and product page read the same provider, so a heart
 * filled here is filled on every other surface for that product.
 */
export function SaveToWishlist({ productId, productName, variant = 'plate', className = '' }: SaveToWishlistProps) {
  const { add, remove, items, isSaved, isPendingProduct } = useWishlistActions()
  const [failed, setFailed] = useState(false)

  const saved = isSaved(productId)
  const pending = isPendingProduct(productId)
  const itemId = items.find((entry) => entry.productId === productId)?.id

  const toggle = async () => {
    setFailed(false)
    const ok =
      saved && itemId !== undefined ? await remove(itemId) : await add(productId)
    if (!ok) setFailed(true)
  }

  const label = pending
    ? saved
      ? 'Removing'
      : 'Saving'
    : failed
      ? 'Try again'
      : saved
        ? 'Saved'
        : 'Save'

  if (variant === 'inline') {
    return (
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={pending}
        aria-busy={pending}
        aria-pressed={saved}
        className="label-micro group mt-4 inline-flex h-11 items-center gap-2.5 border border-line px-5 text-graphite transition-colors duration-300 ease-editorial hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Heart
          size={14}
          strokeWidth={1.5}
          aria-hidden
          className={saved ? 'fill-signal text-signal' : 'transition-transform duration-300 ease-editorial group-hover:scale-110'}
        />
        {label} for later
        <span className="sr-only"> — {productName}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void toggle()
      }}
      disabled={pending}
      aria-busy={pending}
      aria-pressed={saved}
      aria-label={
        pending
          ? saved
            ? `Removing ${productName} from your wishlist`
            : `Saving ${productName} to your wishlist`
          : saved
            ? `Remove ${productName} from your wishlist`
            : failed
              ? `Saving ${productName} failed — try again`
              : `Save ${productName} to your wishlist`
      }
      title={label}
      className={`absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-30 grid size-8 sm:size-9 place-items-center rounded-full border backdrop-blur-md transition-all duration-300 ease-editorial focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60 hover:scale-105 active:scale-95 ${
        failed
          ? 'border-signal bg-signal text-paper'
          : saved
            ? 'border-signal/40 bg-white/95 text-signal shadow-xs'
            : 'border-line/80 bg-white/80 text-ink/75 hover:border-ink hover:bg-white hover:text-ink shadow-xs'
      } ${className}`}
    >
      {failed && !pending ? (
        <TriangleAlert size={14} strokeWidth={1.5} aria-hidden />
      ) : (
        <Heart
          size={14}
          strokeWidth={1.5}
          aria-hidden
          className={saved ? 'fill-signal text-signal' : 'transition-transform duration-200 group-hover:scale-110'}
        />
      )}
    </button>
  )
}