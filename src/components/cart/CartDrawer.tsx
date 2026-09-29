import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { X, ArrowRight, ShoppingBag } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import { useUI } from '@/hooks/useUI'
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll'
import { FREE_SHIPPING_THRESHOLD } from '@/context/cart'
import { QuantityStepper } from './QuantityStepper'
import { SmartImage } from '@/components/ui/SmartImage'
import { formatPrice } from '@/lib/format'

const EASE = [0.16, 1, 0.3, 1] as const

/** Slide-over bag. Shares the store's line-and-ink language with the page. */
export function CartDrawer() {
  const { isCartOpen, closeCart } = useUI()
  const { items, itemCount, subtotal, increaseQuantity, decreaseQuantity, removeItem } = useCart()

  useLockBodyScroll(isCartOpen)

  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal)
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100)

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            onClick={closeCart}
            className="fixed inset-0 z-[90] bg-ink/35 backdrop-blur-[2px]"
          />

          <motion.aside
            key="drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Shopping bag"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.6, ease: EASE }}
            className="fixed inset-y-0 right-0 z-[100] flex w-full max-w-[440px] flex-col border-l border-line bg-paper"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-line px-5 py-5 sm:px-7">
              <div className="flex items-baseline gap-3">
                <h2 className="text-sm font-bold tracking-[-0.01em] uppercase">Your Bag</h2>
                <span className="font-mono text-[10px] tracking-[0.14em] text-graphite tabular-nums">
                  {String(itemCount).padStart(2, '0')} {itemCount === 1 ? 'ITEM' : 'ITEMS'}
                </span>
              </div>
              <button
                type="button"
                onClick={closeCart}
                aria-label="Close bag"
                className="-mr-2 grid size-9 place-items-center text-ink transition-transform duration-500 ease-editorial hover:rotate-90"
              >
                <X size={17} strokeWidth={1.4} />
              </button>
            </div>

            {/* Free-shipping meter */}
            {items.length > 0 && (
              <div className="border-b border-line px-5 py-4 sm:px-7">
                <p className="font-mono text-[10px] tracking-[0.1em] text-graphite uppercase">
                  {remaining > 0 ? (
                    <>
                      <span className="text-ink">{formatPrice(remaining)}</span> from free express
                      shipping
                    </>
                  ) : (
                    <span className="text-ink">Express shipping unlocked</span>
                  )}
                </p>
                <div className="mt-2.5 h-px w-full bg-line">
                  <motion.div
                    className="h-px bg-ink"
                    initial={false}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.6, ease: EASE }}
                  />
                </div>
              </div>
            )}

            {/* Lines */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-5 px-8 text-center">
                  <ShoppingBag size={26} strokeWidth={1} className="text-ash" />
                  <div>
                    <p className="text-sm font-semibold tracking-[-0.01em] uppercase">Bag is empty</p>
                    <p className="mt-2 text-xs leading-relaxed text-graphite">
                      Nothing selected yet. The collection is waiting.
                    </p>
                  </div>
                  <Link
                    to="/shop"
                    onClick={closeCart}
                    className="label-micro link-wipe inline-flex items-center gap-2 border-b border-ink pb-1"
                  >
                    Browse the collection
                    <ArrowRight size={12} strokeWidth={1.5} />
                  </Link>
                </div>
              ) : (
                <ul>
                  <AnimatePresence initial={false}>
                    {items.map((item) => (
                      <motion.li
                        key={item.lineId}
                        layout
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        transition={{ duration: 0.45, ease: EASE }}
                        className="overflow-hidden border-b border-line-soft"
                      >
                        <div className="flex gap-4 px-5 py-5 sm:px-7">
                          <Link
                            to={`/product/${item.productId}`}
                            onClick={closeCart}
                            className="w-20 shrink-0 overflow-hidden bg-bone"
                          >
                            <SmartImage
                              src={item.image}
                              alt={item.name}
                              className="aspect-[3/4] w-full"
                            />
                          </Link>

                          <div className="flex min-w-0 flex-1 flex-col">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <Link
                                  to={`/product/${item.productId}`}
                                  onClick={closeCart}
                                  className="block truncate text-[12px] font-semibold tracking-[0.01em] uppercase transition-colors hover:text-graphite"
                                >
                                  {item.name}
                                </Link>
                                <p className="mt-1 font-mono text-[10px] tracking-[0.1em] text-graphite uppercase">
                                  {item.size} / {item.color}
                                </p>
                              </div>
                              <p className="shrink-0 font-mono text-[11px] tabular-nums">
                                {formatPrice(item.price * item.quantity)}
                              </p>
                            </div>

                            <div className="mt-auto flex items-center justify-between pt-4">
                              <QuantityStepper
                                size="sm"
                                value={item.quantity}
                                onDecrease={() => decreaseQuantity(item.lineId)}
                                onIncrease={() => increaseQuantity(item.lineId)}
                                label={`Quantity for ${item.name}`}
                              />
                              <button
                                type="button"
                                onClick={() => removeItem(item.lineId)}
                                className="label-micro text-ash transition-colors duration-300 ease-editorial hover:text-ink"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-line px-5 py-5 sm:px-7">
                <div className="flex items-baseline justify-between">
                  <span className="label-micro text-graphite">Subtotal</span>
                  <span className="font-mono text-base tabular-nums">{formatPrice(subtotal)}</span>
                </div>
                <p className="mt-2 font-mono text-[10px] tracking-[0.1em] text-ash uppercase">
                  Taxes and duties calculated at checkout
                </p>

                <div className="mt-5 grid gap-2">
                  <Link
                    to="/checkout"
                    onClick={closeCart}
                    className="group relative flex py-4 items-center justify-center gap-2 overflow-hidden bg-ink py-4 text-paper label-micro transition-colors duration-500 ease-editorial hover:text-ink"
                  >
                    <span
                      aria-hidden
                      className="absolute inset-0 origin-bottom scale-y-0 bg-paper transition-transform duration-500 ease-editorial group-hover:scale-y-100"
                    />
                    <span className="relative z-10 flex items-center gap-2">
                      Checkout
                      <ArrowRight size={13} strokeWidth={1.5} />
                    </span>
                  </Link>
                  <Link
                    to="/cart"
                    onClick={closeCart}
                    className="label-micro flex h-12 items-center justify-center border border-ink transition-colors duration-500 ease-editorial hover:bg-ink hover:text-paper"
                  >
                    View full bag
                  </Link>
                </div>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
