import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, Package, Truck } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import { SmartImage } from '@/components/ui/SmartImage'
import { Action } from '@/components/ui/Action'
import { formatPrice } from '@/lib/format'
import { readOrder } from '@/lib/order'
import type { OrderSummary } from '@/types'

const EASE = [0.16, 1, 0.3, 1] as const

const TIMELINE = [
  { icon: Check, label: 'Order confirmed', detail: 'Just now', done: true },
  { icon: Package, label: 'Packed at the studio', detail: 'Within 24 hours', done: false },
  { icon: Truck, label: 'On its way', detail: '2 — 4 business days', done: false },
]

export default function Success() {
  const { items } = useCart()
  // Read once from storage — the checkout writes it before navigating here.
  const [order] = useState<OrderSummary | null>(() => readOrder())

  // A checkout always empties the bag — if it did not, there is nothing to confirm.
  if (items.length > 0) return <Navigate to="/cart" replace />
  if (!order) return <Navigate to="/" replace />

  return (
    <section className="container-editorial pt-28 pb-24 sm:pt-40 sm:pb-32">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: EASE }}
        className="flex items-center gap-4"
      >
        <span className="h-px w-8 bg-line" aria-hidden />
        <span className="label-micro text-graphite">Order {order.orderId}</span>
      </motion.div>

      <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          <motion.div
            initial={{ opacity: 0, y: 34 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.08, ease: EASE }}
          >
            {/* Confirmation mark */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.2, ease: EASE }}
              className="grid size-14 place-items-center rounded-full border border-ink sm:size-16"
            >
              <Check size={24} strokeWidth={1.2} />
            </motion.div>

            <h1 className="type-display mt-8 text-[14vw] leading-[0.84] sm:text-[8vw]">
              Thank you
              <br />
              {order.name.split(' ')[0]}
            </h1>

            <p className="mt-7 max-w-md text-sm leading-[1.85] text-graphite sm:text-[15px]">
              Your order is confirmed. A receipt is on its way to{' '}
              <span className="text-ink">{order.email}</span>, and the studio starts packing within
              the day. You will get a tracking note as soon as it leaves.
            </p>
          </motion.div>

          {/* Timeline */}
          <motion.ul
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.3, ease: EASE }}
            className="mt-12 flex flex-col gap-px border border-line bg-line"
          >
            {TIMELINE.map(({ icon: Icon, label, detail, done }) => (
              <li key={label} className="flex items-center gap-4 bg-paper px-5 py-4">
                <Icon
                  size={15}
                  strokeWidth={1.3}
                  className={done ? 'text-ink' : 'text-ash'}
                />
                <span className="flex-1 text-[13px] font-semibold tracking-[-0.01em] uppercase">
                  {label}
                </span>
                <span className="font-mono text-[10px] tracking-[0.12em] text-graphite uppercase">
                  {detail}
                </span>
              </li>
            ))}
          </motion.ul>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.38, ease: EASE }}
            className="mt-10 flex flex-wrap gap-3"
          >
            <Action to="/shop" size="lg" withArrow>
              Continue shopping
            </Action>
            <Action to="/" variant="outline" size="lg">
              Back to home
            </Action>
          </motion.div>
        </div>

        {/* Receipt */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.95, delay: 0.2, ease: EASE }}
          className="lg:col-span-5"
        >
          <div className="border border-line bg-bone/45 p-6 sm:p-8 lg:sticky lg:top-28">
            <h2 className="type-display text-2xl">Receipt</h2>

            <ul className="mt-6 flex flex-col gap-4 border-t border-line pt-6">
              {order.items.map((item) => (
                <li key={item.lineId} className="flex gap-4">
                  <div className="w-14 shrink-0 bg-bone">
                    <SmartImage src={item.image} alt={item.name} className="aspect-3/4 w-full" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold tracking-[0.01em] uppercase">
                      {item.name}
                    </p>
                    <p className="mt-1 font-mono text-[10px] tracking-[0.1em] text-graphite uppercase">
                      {item.size} / {item.color} · ×{item.quantity}
                    </p>
                  </div>
                  <p className="shrink-0 font-mono text-[11px] tabular-nums">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </li>
              ))}
            </ul>

            <dl className="mt-7 flex flex-col gap-3 border-t border-line pt-6 font-mono text-[11px] tracking-[0.06em]">
              <div className="flex items-baseline justify-between">
                <dt className="text-graphite uppercase">Subtotal</dt>
                <dd className="tabular-nums">{formatPrice(order.subtotal)}</dd>
              </div>
              <div className="flex items-baseline justify-between">
                <dt className="text-graphite uppercase">Shipping</dt>
                <dd className="tabular-nums">
                  {order.shipping === 0 ? 'Complimentary' : formatPrice(order.shipping)}
                </dd>
              </div>
              <div className="mt-2 flex items-baseline justify-between border-t border-line pt-4 text-base">
                <dt className="uppercase">Paid</dt>
                <dd className="tabular-nums">{formatPrice(order.total)}</dd>
              </div>
            </dl>

            <div className="mt-7 border-t border-line pt-5">
              <p className="label-micro text-graphite">Delivering to</p>
              <address className="mt-3 text-[13px] leading-relaxed text-graphite not-italic">
                {order.name}
                <br />
                {order.address}
              </address>
            </div>

            <Link
              to="/shop"
              className="label-micro link-wipe mt-7 inline-block text-graphite transition-colors hover:text-ink"
            >
              Archive notice
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
