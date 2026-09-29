import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Lock, ShieldCheck } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import { SmartImage } from '@/components/ui/SmartImage'
import { Reveal } from '@/components/ui/Reveal'
import { formatPrice } from '@/lib/format'
import { createOrderId, saveOrder } from '@/lib/order'
import type { OrderSummary } from '@/types'

const SHIPPING_METHODS = [
  { id: 'standard', label: 'Standard', detail: '4 — 6 business days', price: 0 },
  { id: 'express', label: 'Express', detail: '2 — 3 business days', price: 18 },
  { id: 'courier', label: 'Next day', detail: 'Ordered before 4pm', price: 34 },
] as const

type FieldName =
  | 'email'
  | 'name'
  | 'address'
  | 'city'
  | 'postalCode'
  | 'country'
  | 'card'

interface FormState {
  email: string
  name: string
  address: string
  city: string
  postalCode: string
  country: string
  card: string
}

const INITIAL: FormState = {
  email: '',
  name: '',
  address: '',
  city: '',
  postalCode: '',
  country: 'United States',
  card: '',
}

const validate = (values: FormState): Partial<Record<FieldName, string>> => {
  const errors: Partial<Record<FieldName, string>> = {}
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email)) errors.email = 'Enter a valid email address'
  if (values.name.trim().length < 2) errors.name = 'Enter the name for delivery'
  if (values.address.trim().length < 4) errors.address = 'Enter a street address'
  if (values.city.trim().length < 2) errors.city = 'Enter a city'
  if (!/^[a-z0-9][a-z0-9\s-]{2,10}$/i.test(values.postalCode.trim()))
    errors.postalCode = 'Enter a valid postal code'
  const digits = values.card.replace(/\D/g, '')
  if (digits.length < 15 || digits.length > 16) errors.card = 'Enter a 16-digit card number'
  return errors
}

const formatCard = (value: string) =>
  value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()

export default function Checkout() {
  const navigate = useNavigate()
  const { items, subtotal, shipping, clearCart } = useCart()

  const [values, setValues] = useState<FormState>(INITIAL)
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({})
  const [method, setMethod] = useState<(typeof SHIPPING_METHODS)[number]['id']>('standard')
  const [submitting, setSubmitting] = useState(false)

  if (items.length === 0 && !submitting) {
    return (
      <section className="container-editorial flex min-h-[70svh] flex-col justify-center py-28">
        <Reveal>
          <div className="flex flex-col items-start gap-8">
            <h1 className="type-display text-[15vw] leading-[0.84] sm:text-[9vw]">
              Nothing
              <br />
              to check out
            </h1>
            <p className="max-w-sm text-sm leading-relaxed text-graphite">
              Your bag is empty, so there is nothing to settle. Add a piece and come back.
            </p>
            <Link
              to="/shop"
              className="group label-micro inline-flex items-center gap-3 border-b border-ink pb-2"
            >
              Shop the collection
            </Link>
          </div>
        </Reveal>
      </section>
    )
  }

  const methodPrice = SHIPPING_METHODS.find((m) => m.id === method)?.price ?? 0
  const shippingTotal = shipping === 0 && methodPrice === 0 ? 0 : Math.max(shipping, methodPrice)
  const grandTotal = subtotal + shippingTotal

  const update = (field: keyof FormState) => (value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = validate(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      document.querySelector<HTMLElement>('[data-invalid]')?.focus()
      return
    }

    setSubmitting(true)
    const order: OrderSummary = {
      orderId: createOrderId(),
      email: values.email,
      name: values.name,
      address: `${values.address}, ${values.city} ${values.postalCode}, ${values.country}`,
      city: values.city,
      postalCode: values.postalCode,
      country: values.country,
      items,
      subtotal,
      shipping: shippingTotal,
      total: grandTotal,
    }
    saveOrder(order)
    clearCart()
    navigate('/success', { replace: true })
  }

  return (
    <section className="container-editorial pt-28 pb-24 sm:pt-40 sm:pb-32">
      <Reveal>
        <Link
          to="/cart"
          className="group label-micro inline-flex items-center gap-2 text-graphite transition-colors hover:text-ink"
        >
          <ArrowLeft size={12} strokeWidth={1.5} className="transition-transform duration-500 group-hover:-translate-x-1" />
          Back to bag
        </Link>

        <div className="mt-8 border-b border-line pb-8">
          <div className="flex items-center gap-4">
            <span className="h-px w-8 bg-line" aria-hidden />
            <span className="label-micro text-graphite">Secure checkout</span>
          </div>
          <h1 className="type-display mt-6 text-[14vw] leading-[0.84] sm:text-[8vw]">
            Confirm order
          </h1>
        </div>
      </Reveal>

      <div className="grid gap-12 pt-10 lg:grid-cols-12 lg:gap-16">
        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="lg:col-span-7 xl:col-span-8">
          <fieldset className="border-0 p-0">
            <legend className="label-micro mb-6 text-graphite">Contact</legend>
            <Field
              id="email"
              label="Email address"
              value={values.email}
              onChange={update('email')}
              error={errors.email}
              type="email"
              autoComplete="email"
              placeholder="you@studio.com"
            />
          </fieldset>

          <fieldset className="mt-10 border-0 p-0">
            <legend className="label-micro mb-6 text-graphite">Delivery</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field
                  id="name"
                  label="Full name"
                  value={values.name}
                  onChange={update('name')}
                  error={errors.name}
                  autoComplete="name"
                  placeholder="Alex Mercer"
                />
              </div>
              <div className="sm:col-span-2">
                <Field
                  id="address"
                  label="Street address"
                  value={values.address}
                  onChange={update('address')}
                  error={errors.address}
                  autoComplete="street-address"
                  placeholder="18 Rivington Street"
                />
              </div>
              <Field
                id="city"
                label="City"
                value={values.city}
                onChange={update('city')}
                error={errors.city}
                autoComplete="address-level2"
                placeholder="New York"
              />
              <Field
                id="postalCode"
                label="Postal code"
                value={values.postalCode}
                onChange={update('postalCode')}
                error={errors.postalCode}
                autoComplete="postal-code"
                placeholder="10002"
              />
              <div className="sm:col-span-2">
                <label
                  htmlFor="country"
                  className="label-micro mb-3 block text-graphite"
                >
                  Country
                </label>
                <select
                  id="country"
                  value={values.country}
                  onChange={(e) => update('country')(e.target.value)}
                  className="h-12 w-full appearance-none border-b border-line bg-transparent text-sm transition-colors duration-400 focus:border-ink focus:outline-none"
                >
                  {['United States', 'United Kingdom', 'Canada', 'Japan', 'Germany', 'Australia'].map(
                    (country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>
          </fieldset>

          <fieldset className="mt-10 border-0 p-0">
            <legend className="label-micro mb-6 text-graphite">Shipping method</legend>
            <div className="flex flex-col gap-px border border-line bg-line">
              {SHIPPING_METHODS.map((option) => (
                <label
                  key={option.id}
                  className="group flex cursor-pointer items-center gap-4 bg-paper px-5 py-4 transition-colors duration-400 ease-editorial hover:bg-bone"
                >
                  <input
                    type="radio"
                    name="shipping"
                    value={option.id}
                    checked={method === option.id}
                    onChange={() => setMethod(option.id)}
                    className="sr-only"
                  />
                  <span
                    className={`grid size-4 shrink-0 place-items-center rounded-full border transition-colors duration-300 ${
                      method === option.id ? 'border-ink' : 'border-line'
                    }`}
                  >
                    {method === option.id && <span className="size-2 rounded-full bg-ink" />}
                  </span>
                  <span className="flex-1">
                    <span className="block text-[13px] font-semibold tracking-[-0.01em] uppercase">
                      {option.label}
                    </span>
                    <span className="mt-0.5 block font-mono text-[10px] tracking-[0.1em] text-graphite uppercase">
                      {option.detail}
                    </span>
                  </span>
                  <span className="font-mono text-[11px] tabular-nums">
                    {option.price === 0 ? 'Free' : formatPrice(option.price)}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-10 border-0 p-0">
            <legend className="label-micro mb-6 text-graphite">Payment</legend>
            <Field
              id="card"
              label="Card number"
              value={values.card}
              onChange={(value) => update('card')(formatCard(value))}
              error={errors.card}
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="4242 4242 4242 4242"
              mono
            />
            <p className="mt-4 flex items-center gap-2 font-mono text-[10px] tracking-[0.12em] text-ash uppercase">
              <Lock size={12} strokeWidth={1.4} />
              Demo checkout — no card is charged
            </p>
          </fieldset>

          <motion.button
            type="submit"
            whileTap={{ scale: 0.99 }}
            className="group relative mt-10 flex h-15 w-full items-center justify-center gap-3 overflow-hidden bg-ink text-paper label-micro transition-colors duration-500 ease-editorial hover:text-ink sm:h-16"
          >
            <span
              aria-hidden
              className="absolute inset-0 origin-bottom scale-y-0 bg-paper transition-transform duration-500 ease-editorial group-hover:scale-y-100"
            />
            <span className="relative z-10 flex items-center gap-3">
              <ShieldCheck size={14} strokeWidth={1.4} />
              Place order — {formatPrice(grandTotal)}
            </span>
          </motion.button>
        </form>

        {/* Summary */}
        <aside className="lg:col-span-5 xl:col-span-4">
          <div className="lg:sticky lg:top-28">
            <div className="border border-line bg-bone/45 p-6 sm:p-8">
              <h2 className="type-display text-2xl">Order</h2>

              <ul className="mt-6 flex flex-col gap-4 border-t border-line pt-6">
                {items.map((item) => (
                  <li key={item.lineId} className="flex gap-4">
                    <div className="relative w-14 shrink-0 bg-bone">
                      <SmartImage src={item.image} alt={item.name} className="aspect-3/4 w-full" />
                      <span className="absolute -top-2 -right-2 grid size-5 place-items-center rounded-full bg-ink font-mono text-[9px] text-paper">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold tracking-[0.01em] uppercase">
                        {item.name}
                      </p>
                      <p className="mt-1 font-mono text-[10px] tracking-[0.1em] text-graphite uppercase">
                        {item.size} / {item.color}
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
                  <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
                </div>
                <div className="flex items-baseline justify-between">
                  <dt className="text-graphite uppercase">Shipping</dt>
                  <dd className="tabular-nums">
                    {shippingTotal === 0 ? 'Complimentary' : formatPrice(shippingTotal)}
                  </dd>
                </div>
                <div className="mt-2 flex items-baseline justify-between border-t border-line pt-4 text-base">
                  <dt className="uppercase">Total</dt>
                  <dd className="tabular-nums">{formatPrice(grandTotal)}</dd>
                </div>
              </dl>
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}

interface FieldProps {
  id: FieldName
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  type?: string
  placeholder?: string
  autoComplete?: string
  inputMode?: 'text' | 'numeric'
  mono?: boolean
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  type = 'text',
  placeholder,
  autoComplete,
  inputMode,
  mono = false,
}: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="label-micro mb-3 block text-graphite">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={Boolean(error)}
        data-invalid={error ? 'true' : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={`h-12 w-full border-b bg-transparent transition-colors duration-400 ease-editorial placeholder:text-ash focus:outline-none ${
          error ? 'border-ink' : 'border-line focus:border-ink'
        } ${mono ? 'font-mono text-[13px] tracking-[0.12em] tabular-nums' : 'text-sm'}`}
      />
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 font-mono text-[10px] tracking-[0.12em] text-ink uppercase"
        >
          {error}
        </motion.p>
      )}
    </div>
  )
}
