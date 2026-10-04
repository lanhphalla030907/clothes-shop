import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, ShoppingBag, X } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import { QuantityStepper } from '@/components/cart/QuantityStepper'
import { SmartImage } from '@/components/ui/SmartImage'
import { Reveal } from '@/components/ui/Reveal'
import { Action } from '@/components/ui/Action'
import { formatPrice } from '@/lib/format'
import { FREE_SHIPPING_THRESHOLD } from '@/context/cart'

export default function Cart() {
  const { items, itemCount, subtotal, shipping, total, increaseQuantity, decreaseQuantity, removeItem, clearCart } =
    useCart()

  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal)

  if (items.length === 0) {
    return (
      <section className="container-editorial flex min-h-[70svh] flex-col justify-center py-28">
        <Reveal>
          <div className="flex flex-col items-start gap-8">
            <ShoppingBag size={30} strokeWidth={0.9} className="text-ash" />
            <div>
              <h1 className="type-display text-[15vw] leading-[0.84] sm:text-[9vw]">
                Your bag
                <br />
                is empty
              </h1>
              <p className="mt-6 max-w-sm text-sm leading-relaxed text-graphite">
                Nothing selected yet. Ten pieces make up the release — start with the one that
                keeps pulling you back.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Action to="/shop" size="lg" withArrow>
                Shop the collection
              </Action>
              <Action to="/" variant="outline" size="lg">
                Back to home
              </Action>
            </div>
          </div>
        </Reveal>
      </section>
    )
  }

  return (
    <section className="container-editorial pt-28 pb-24 sm:pt-40 sm:pb-32">
      <Reveal>
        <div className="flex items-end justify-between gap-6 border-b border-line pb-8">
          <div>
            <div className="flex items-center gap-4">
              <span className="h-px w-8 bg-line" aria-hidden />
              <span className="label-micro text-graphite">Bag</span>
            </div>
            <h1 className="type-display mt-6 text-[14vw] leading-[0.84] sm:text-[8vw]">
              Your selection
            </h1>
          </div>
          <div className="hidden text-right sm:block">
            <p className="label-micro text-graphite">
              {String(itemCount).padStart(2, '0')} {itemCount === 1 ? 'Piece' : 'Pieces'}
            </p>
            <button
              type="button"
              onClick={clearCart}
              className="label-micro mt-3 text-ash transition-colors duration-400 ease-editorial hover:text-ink"
            >
              Clear bag
            </button>
          </div>
        </div>
      </Reveal>

      <div className="grid gap-12 pt-10 lg:grid-cols-12 lg:gap-16">
        {/* Lines */}
        <div className="lg:col-span-7 xl:col-span-8">
          <ul className="border-t border-line-soft">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.li
                  key={item.lineId}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden border-b border-line-soft"
                >
                  <div className="flex gap-4 py-6 sm:gap-6 sm:py-7">
                    <Link to={`/product/${item.productId}`} className="w-24 shrink-0 bg-bone sm:w-32">
                      <SmartImage src={item.image} alt={item.name} className="aspect-3/4 w-full" />
                    </Link>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="label-micro text-ash">{item.category}</p>
                          <Link
                            to={`/product/${item.productId}`}
                            className="mt-1.5 block truncate text-[13px] font-bold tracking-[-0.01em] uppercase transition-colors hover:text-graphite sm:text-[15px]"
                          >
                            {item.name}
                          </Link>
                          <p className="mt-1.5 font-mono text-[10px] tracking-[0.1em] text-graphite uppercase">
                            {item.size} / {item.color}
                          </p>
                        </div>
                        <p className="shrink-0 font-mono text-sm tabular-nums">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                      </div>

                      <div className="mt-auto flex items-end justify-between gap-4 pt-6">
                        <QuantityStepper
                          value={item.quantity}
                          onDecrease={() => decreaseQuantity(item.lineId)}
                          onIncrease={() => increaseQuantity(item.lineId)}
                          label={`Quantity for ${item.name}`}
                        />
                        <button
                          type="button"
                          onClick={() => removeItem(item.lineId)}
                          aria-label={`Remove ${item.name}`}
                          className="grid size-9 place-items-center border border-line text-graphite transition-colors duration-400 ease-editorial hover:border-ink hover:bg-ink hover:text-paper"
                        >
                          <X size={13} strokeWidth={1.4} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          <Link
            to="/shop"
            className="group label-micro mt-8 inline-flex items-center gap-2 text-graphite transition-colors hover:text-ink"
          >
            <ArrowLeft size={12} strokeWidth={1.5} className="transition-transform duration-500 group-hover:-translate-x-1" />
            Continue shopping
          </Link>
        </div>

        {/* Summary */}
        <div className="lg:col-span-5 xl:col-span-4">
          <div className="lg:sticky lg:top-28">
            <div className="border border-line bg-bone/45 p-6 sm:p-8">
              <h2 className="type-display text-2xl">Summary</h2>

              <dl className="mt-7 flex flex-col gap-3.5 border-t border-line pt-6 font-mono text-[11px] tracking-[0.06em]">
                <div className="flex items-baseline justify-between">
                  <dt className="text-graphite uppercase">Subtotal</dt>
                  <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
                </div>
                <div className="flex items-baseline justify-between">
                  <dt className="text-graphite uppercase">Shipping</dt>
                  <dd className="tabular-nums">
                    {shipping === 0 ? 'Complimentary' : formatPrice(shipping)}
                  </dd>
                </div>
                <div className="mt-2 flex items-baseline justify-between border-t border-line pt-4 text-base">
                  <dt className="uppercase">Total</dt>
                  <dd className="tabular-nums">{formatPrice(total)}</dd>
                </div>
              </dl>

              {remaining > 0 && (
                <p className="mt-5 font-mono text-[10px] leading-relaxed tracking-[0.1em] text-graphite uppercase">
                  Add {formatPrice(remaining)} for complimentary express shipping
                </p>
              )}

              <Action to="/checkout" size="lg" className="mt-7 w-full" withArrow>
                Proceed to checkout
              </Action>

              <p className="mt-4 text-center font-mono text-[9px] leading-relaxed tracking-[0.14em] text-ash uppercase">
                Encrypted checkout — taxes calculated at the next step
              </p>
            </div>

            <ul className="mt-6 flex flex-col gap-px border border-line bg-line">
              {['Free express over $500', '30-day returns', 'Archive-only releases'].map((label) => (
                <li key={label} className="bg-paper px-5 py-3.5 font-mono text-[10px] tracking-[0.12em] text-graphite uppercase">
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-16 flex justify-center">
        <Action to="/shop" variant="ghost" size="md">
          <ArrowRight size={13} strokeWidth={1.5} className="rotate-180" />
          Back to collection
        </Action>
      </div>
    </section>
  )
}
