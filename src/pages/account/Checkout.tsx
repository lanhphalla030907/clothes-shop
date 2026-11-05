import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Action } from '@/components/ui/Action'
import { PageHeader, Panel, PanelHeader } from '@/components/account/PageHeader'
import { DefinitionRow, Money } from '@/components/account/Bits'
import { FormError } from '@/components/account/Field'
import { EmptyState, ErrorState, InlineNotice } from '@/components/account/States'
import { SkeletonCard } from '@/components/account/Skeleton'
import { useAddressActions } from '@/features/addresses/useAddressActions'
import { useCartActions } from '@/features/cart/useCartActions'
import { useCheckout, useCheckoutQuote, preferredAddressId } from '@/features/checkout/useCheckout'
import { PaymentForOrder } from '@/features/payments/PaymentForOrder'
import { fetchShippingProviders } from '@/features/shippingProviders/api'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { STORE_CURRENCY } from '@/lib/api/config'
import { ApiError, isApiError, toUserMessage } from '@/lib/api/errors'
import { formatMoney } from '@/lib/money'
import {
  administrativeLocationName,
  CHECKOUT_PAYMENT_METHOD,
  formatAddressLines,
  type CheckoutQuote,
  type CheckoutRequest,
  type CreateCheckoutQuoteRequest,
  type PublicShippingProvider,
  type UUID,
} from '@/types/api'

interface CheckoutAttempt {
  quote: CheckoutQuote
  idempotencyKey: UUID
}

const CHECKOUT_ATTEMPT_STORAGE_KEY = 'clothes-ecommerce.pending-checkout'
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isCheckoutQuote = (value: unknown): value is CheckoutQuote => {
  if (!isRecord(value) || !isRecord(value.shippingProvider)) return false
  const provider = value.shippingProvider
  const codArea = value.codArea
  const validArea =
    codArea === null ||
    (isRecord(codArea) &&
      typeof codArea.id === 'string' &&
      typeof codArea.code === 'string' &&
      typeof codArea.name === 'string')
  const locationPath = value.administrativeLocationPath
  const validLocationPath =
    locationPath === null ||
    (Array.isArray(locationPath) &&
      locationPath.every(
        (location) =>
          isRecord(location) &&
          typeof location.pcode === 'string' &&
          (typeof location.parentPcode === 'string' || location.parentPcode === null) &&
          typeof location.adminLevel === 'number' &&
          typeof location.nameEn === 'string' &&
          (typeof location.nameKm === 'string' || location.nameKm === null),
      ))
  const validLocation =
    Object.prototype.hasOwnProperty.call(value, 'administrativeLocationPath')
      ? validLocationPath
      : Object.prototype.hasOwnProperty.call(value, 'codArea') && validArea

  return (
    typeof value.quoteId === 'string' &&
    (value.paymentMethod === CHECKOUT_PAYMENT_METHOD.ABA_PAYWAY ||
      value.paymentMethod === CHECKOUT_PAYMENT_METHOD.COD) &&
    typeof value.addressId === 'string' &&
    typeof provider.id === 'string' &&
    typeof provider.code === 'string' &&
    typeof provider.name === 'string' &&
    typeof provider.fee === 'string' &&
    validLocation &&
    Array.isArray(value.items) &&
    value.items.every(
      (item) =>
        isRecord(item) &&
        typeof item.variantId === 'string' &&
        typeof item.productName === 'string' &&
        typeof item.sku === 'string' &&
        Array.isArray(item.variantOptions) &&
        item.variantOptions.every(
          (option) =>
            isRecord(option) &&
            typeof option.optionName === 'string' &&
            typeof option.optionValue === 'string',
        ) &&
        typeof item.unitPrice === 'string' &&
        typeof item.quantity === 'number' &&
        typeof item.lineTotal === 'string',
    ) &&
    typeof value.subtotal === 'string' &&
    typeof value.shippingFee === 'string' &&
    typeof value.discountAmount === 'string' &&
    typeof value.totalAmount === 'string' &&
    typeof value.currency === 'string' &&
    typeof value.expiresAt === 'string'
  )
}

const restoreCheckoutAttempt = (): { attempt?: CheckoutAttempt; error?: unknown } => {
  try {
    const stored = window.sessionStorage.getItem(CHECKOUT_ATTEMPT_STORAGE_KEY)
    if (stored === null) return {}

    const value: unknown = JSON.parse(stored)
    if (
      isRecord(value) &&
      isCheckoutQuote(value.quote) &&
      typeof value.idempotencyKey === 'string' &&
      UUID_PATTERN.test(value.idempotencyKey)
    ) {
      if (!Object.prototype.hasOwnProperty.call(value.quote, 'administrativeLocationPath')) {
        value.quote['administrativeLocationPath'] = null
      }
      return {
        attempt: {
          quote: value.quote,
          idempotencyKey: value.idempotencyKey,
        },
      }
    }

    return {
      error: new ApiError(
        'A previous checkout attempt could not be restored. For your safety, do not place another order; contact the studio for help.',
        { kind: 'unknown' },
      ),
    }
  } catch (cause) {
    return {
      error: new ApiError(
        'A previous checkout attempt could not be checked. For your safety, do not place another order; contact the studio for help.',
        { kind: 'unknown', cause },
      ),
    }
  }
}

export default function AccountCheckout() {
  const { orderId } = useParams<{ orderId: string }>()

  return orderId ? (
    <PaymentForOrder orderId={orderId as UUID} />
  ) : (
    <ReviewAndPlace />
  )
}

const ReviewAndPlace = () => {
  const navigate = useNavigate()
  const cart = useCartActions()
  const addresses = useAddressActions()
  const checkout = useCheckout()
  const providers = useAsyncResource<PublicShippingProvider[]>(
    (signal) => fetchShippingProviders(signal),
    [],
  )
  const [restoredAttempt] = useState(restoreCheckoutAttempt)
  const [paymentMethod, setPaymentMethod] = useState<
    typeof CHECKOUT_PAYMENT_METHOD[keyof typeof CHECKOUT_PAYMENT_METHOD]
  >(restoredAttempt.attempt?.quote.paymentMethod ?? CHECKOUT_PAYMENT_METHOD.ABA_PAYWAY)
  const [addressSelection, setAddressSelection] = useState<UUID | undefined>(
    restoredAttempt.attempt?.quote.addressId,
  )
  const [providerSelection, setProviderSelection] = useState<UUID | undefined>(
    restoredAttempt.attempt?.quote.shippingProvider.id,
  )
  const [activeAttempt, setActiveAttempt] = useState<CheckoutAttempt | undefined>(
    restoredAttempt.attempt,
  )
  const [quoteNotice, setQuoteNotice] = useState<string | undefined>()
  const [clientError, setClientError] = useState<unknown>(restoredAttempt.error)
  const [now, setNow] = useState(() => Date.now())
  const previousQuote = useRef<CheckoutQuote | undefined>(undefined)
  const submissionInFlight = useRef(false)
  const { refetch: refetchCart } = cart

  const addressId = addresses.addresses.some((address) => address.id === addressSelection)
    ? addressSelection
    : activeAttempt?.quote.addressId ?? preferredAddressId(addresses.addresses)
  const selectedAddress = addresses.addresses.find((address) => address.id === addressId)
  const selectedProvider =
    providers.data?.find((provider) => provider.id === providerSelection) ??
    (activeAttempt ? undefined : providers.data?.[0])
  const cartFingerprint = JSON.stringify([
    cart.cart?.updatedAt,
    cart.lines.map((line) => [
      line.id,
      line.variantId,
      line.quantity,
      line.unitPrice,
      line.lineTotal,
    ]),
  ])
  const providersLoading = providers.isLoading || providers.isRefreshing
  const isCod = paymentMethod === CHECKOUT_PAYMENT_METHOD.COD
  const canRequestQuote =
    !activeAttempt &&
    restoredAttempt.error === undefined &&
    Boolean(addressId && selectedProvider) &&
    (!isCod || selectedProvider?.supportsCod === true) &&
    !providersLoading &&
    !providers.error &&
    !cart.isLoading &&
    !cart.isRefreshing &&
    cart.lines.length > 0

  const quoteRequest = useMemo<CreateCheckoutQuoteRequest | undefined>(() => {
    if (!canRequestQuote || !addressId || !selectedProvider) return undefined

    return {
      addressId,
      shippingProviderId: selectedProvider.id,
      paymentMethod,
    }
  }, [addressId, canRequestQuote, paymentMethod, selectedProvider])
  const quoteKey = `${cartFingerprint}:${JSON.stringify(quoteRequest ?? null)}`
  const quoteResource = useCheckoutQuote(quoteRequest, quoteKey)
  const refetchQuote = quoteResource.refetch
  const liveQuote =
    quoteResource.requestKey === quoteKey ? quoteResource.quote : undefined
  const displayedQuote = activeAttempt?.quote ?? liveQuote
  const quoteLoading = quoteResource.isLoading
  const quoteError = quoteResource.error
  const quoteExpired =
    displayedQuote !== undefined && Date.parse(displayedQuote.expiresAt) <= now
  const hasAmbiguousAttempt = activeAttempt !== undefined
  const checkoutBlockedByStock =
    activeAttempt === undefined && cart.lines.some((line) => line.exceedsAvailable)

  useEffect(() => {
    if (checkout.placedOrder === undefined) return

    refetchCart()
    if (checkout.placedOrder.paymentMethod === CHECKOUT_PAYMENT_METHOD.ABA_PAYWAY) {
      navigate(`/dashboard/checkout/${checkout.placedOrder.id}`, {
        replace: true,
        state: { justPlaced: true },
      })
    } else {
      navigate(`/dashboard/orders/${checkout.placedOrder.id}`, {
        replace: true,
        state: { justPlaced: true },
      })
    }
  }, [checkout.placedOrder, navigate, refetchCart])

  useEffect(() => {
    if (!liveQuote || hasAmbiguousAttempt) return undefined

    const expiresAt = Date.parse(liveQuote.expiresAt)
    if (!Number.isFinite(expiresAt)) return undefined

    const timer = window.setTimeout(() => {
      setNow(Date.now())
      refetchQuote()
    }, Math.max(0, expiresAt - Date.now() + 1))
    return () => window.clearTimeout(timer)
  }, [hasAmbiguousAttempt, liveQuote, refetchQuote])

  useEffect(() => {
    if (!liveQuote || quoteResource.isLoading) return
    if (previousQuote.current && previousQuote.current.quoteId !== liveQuote.quoteId) {
      setQuoteNotice('Your quote was refreshed. Review the current item prices and total before placing the order.')
    }
    previousQuote.current = liveQuote
  }, [liveQuote, quoteResource.isLoading])

  if (cart.isLoading || addresses.isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Account" title="Checkout" />
        <SkeletonCard rows={4} />
      </div>
    )
  }

  if (cart.error) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Account" title="Checkout" />
        <ErrorState message={toUserMessage(cart.error)} onRetry={cart.refetch} />
      </div>
    )
  }

  if (addresses.error) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Account" title="Checkout" />
        <ErrorState message={toUserMessage(addresses.error)} onRetry={addresses.refetch} />
      </div>
    )
  }

  if (cart.lines.length === 0 && !activeAttempt) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Account" title="Checkout" />
        <EmptyState
          eyebrow="Nothing to buy"
          title="Your bag is empty"
          description="There is nothing to check out. Add something from your bag before continuing."
          action={
            <Action to="/dashboard/bag" withArrow>
              Go to your bag
            </Action>
          }
        />
      </div>
    )
  }

  const place = async () => {
    if (submissionInFlight.current || checkout.isPlacing || checkoutBlockedByStock) return
    submissionInFlight.current = true

    try {
      setClientError(undefined)
      const quote = activeAttempt?.quote ?? liveQuote
      if (!quote || (!activeAttempt && quoteExpired)) return

      let attempt = activeAttempt
      if (!attempt) {
        if (typeof globalThis.crypto?.randomUUID !== 'function') {
          setClientError(
            new ApiError(
              'This browser cannot securely create a checkout request. Update your browser and try again.',
              { kind: 'unknown' },
            ),
          )
          return
        }
        attempt = { quote, idempotencyKey: globalThis.crypto.randomUUID() }
      }

      try {
        window.sessionStorage.setItem(CHECKOUT_ATTEMPT_STORAGE_KEY, JSON.stringify(attempt))
      } catch (cause) {
        setClientError(
          new ApiError(
            'This browser could not save the checkout retry key, so the order was not submitted. Enable session storage and try again.',
            { kind: 'unknown', cause },
          ),
        )
        return
      }
      setActiveAttempt(attempt)

      const body: CheckoutRequest = {
        quoteId: attempt.quote.quoteId,
        idempotencyKey: attempt.idempotencyKey,
      }
      const result = await checkout.placeOrder(body)
      if (result.kind === 'success') {
        setActiveAttempt(undefined)
        try {
          window.sessionStorage.removeItem(CHECKOUT_ATTEMPT_STORAGE_KEY)
        } catch (cause) {
          setClientError(
            new ApiError(
              'The order was created, but the browser could not clear its retry record. The same attempt remains safe to retry if needed.',
              { kind: 'unknown', cause },
            ),
          )
        }
        return
      }
      if (result.kind === 'busy') return

      if (result.ambiguous) {
        setQuoteNotice(
          'The checkout response was not conclusive. Retry to safely check the same attempt; its quote and idempotency key will not change.',
        )
        return
      }

      setActiveAttempt(undefined)
      try {
        window.sessionStorage.removeItem(CHECKOUT_ATTEMPT_STORAGE_KEY)
      } catch (cause) {
        setClientError(
          new ApiError(
            'The checkout attempt was rejected, but the browser could not clear its retry record. Refresh before starting another attempt.',
            { kind: 'unknown', cause },
          ),
        )
      }
      if (isApiError(result.error) && (result.error.kind === 'conflict' || result.error.kind === 'notFound')) {
        setQuoteNotice('The quote is no longer valid. We are refreshing it; review the new total before submitting again.')
        refetchCart()
        providers.refetch()
        refetchQuote()
      }
    } finally {
      submissionInFlight.current = false
    }
  }

  const selectionDisabled = checkout.isPlacing || hasAmbiguousAttempt
  const quoteIsCurrent = displayedQuote !== undefined &&
    (activeAttempt !== undefined || (quoteResource.requestKey === quoteKey && !quoteLoading))
  const canSubmit =
    quoteIsCurrent &&
    (!quoteExpired || activeAttempt !== undefined) &&
    !checkoutBlockedByStock &&
    !checkout.isPlacing
  const submissionError =
    clientError ??
    (isApiError(checkout.error) &&
    (checkout.error.kind === 'conflict' || checkout.error.kind === 'notFound')
      ? undefined
      : checkout.error)
  const selectedProviderSupportsCod =
    !isCod || selectedProvider?.supportsCod === true

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Account"
        title="Checkout"
        description="Choose delivery and payment. The server calculates the quote and final order total."
      />

      {submissionError !== undefined && <FormError message={toUserMessage(submissionError)} />}
      {quoteNotice && <InlineNotice tone="info" message={quoteNotice} />}

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader title="Delivery and payment" />
          <div className="space-y-7 p-6">
            <section aria-labelledby="checkout-address-heading">
              <h2 id="checkout-address-heading" className="eyebrow text-ink">Shipping address</h2>
              {addresses.addresses.length === 0 ? (
                <div className="mt-4">
                  <p className="text-sm leading-relaxed text-graphite">
                    Checkout needs a saved address with a verified delivery location.
                  </p>
                  <Action to="/dashboard/addresses" size="sm" className="mt-5" withArrow>
                    Add an address
                  </Action>
                </div>
              ) : (
                <fieldset className="mt-4 space-y-3">
                  <legend className="sr-only">Choose a delivery address</legend>
                  {addresses.addresses.map((address) => {
                    const chosen = address.id === addressId
                    return (
                      <label
                        key={address.id}
                        className={`flex cursor-pointer items-start gap-3 border p-4 transition-colors ${
                          chosen ? 'border-ink bg-bone' : 'border-line hover:border-graphite'
                        } ${selectionDisabled ? 'opacity-70' : ''}`}
                      >
                        <input
                          type="radio"
                          name="checkout-address"
                          value={address.id}
                          checked={chosen}
                          disabled={selectionDisabled}
                          onChange={() => setAddressSelection(address.id)}
                          className="mt-1 size-4 shrink-0 accent-ink"
                        />
                        <span className="min-w-0">
                          <span className="block text-[13.5px] font-semibold text-ink">
                            {address.label}
                            {address.isDefault && <span className="ml-2 text-[12px] font-normal text-graphite">Default</span>}
                          </span>
                          <address className="mt-2 space-y-0.5 text-[12.5px] not-italic leading-relaxed text-graphite">
                            <span className="block text-ink">{address.recipientName}</span>
                            {formatAddressLines(address).map((line) => <span key={line} className="block">{line}</span>)}
                          </address>
                        </span>
                      </label>
                    )
                  })}
                </fieldset>
              )}
            </section>

            <section aria-labelledby="checkout-provider-heading" className="border-t border-line pt-6">
              <h2 id="checkout-provider-heading" className="eyebrow text-ink">Shipping provider</h2>
              {providersLoading ? (
                <p className="mt-3 text-sm text-graphite" role="status">Loading shipping providers…</p>
              ) : providers.error ? (
                <div className="mt-3">
                  <FormError message={toUserMessage(providers.error)} />
                  <button type="button" className="mt-2 text-sm underline" onClick={providers.refetch}>Try again</button>
                </div>
              ) : providers.data?.length ? (
                <fieldset className="mt-4 space-y-3">
                  <legend className="sr-only">Choose a shipping provider</legend>
                  {providers.data.map((provider) => (
                    <ProviderChoice
                      key={provider.id}
                      provider={provider}
                      selected={provider.id === selectedProvider?.id}
                      disabled={selectionDisabled}
                      onSelect={() => setProviderSelection(provider.id)}
                    />
                  ))}
                </fieldset>
              ) : (
                <div className="mt-3">
                  <p className="text-sm text-graphite">No shipping providers are currently available.</p>
                  <button type="button" className="mt-2 text-sm underline" onClick={providers.refetch}>Try again</button>
                </div>
              )}
            </section>

            <section aria-labelledby="checkout-payment-heading" className="border-t border-line pt-6">
              <h2 id="checkout-payment-heading" className="eyebrow text-ink">Payment method</h2>
              <fieldset className="mt-4 grid gap-3 sm:grid-cols-2">
                <legend className="sr-only">Choose a payment method</legend>
                {([
                  [CHECKOUT_PAYMENT_METHOD.ABA_PAYWAY, 'ABA PayWay', 'Pay securely using a QR code.'],
                  [CHECKOUT_PAYMENT_METHOD.COD, 'Cash on Delivery', 'Pay when the order is delivered.'],
                ] as const).map(([method, label, description]) => (
                  <label
                    key={method}
                    className={`flex cursor-pointer items-start gap-3 border p-4 transition-colors ${
                      paymentMethod === method ? 'border-ink bg-bone' : 'border-line hover:border-graphite'
                    } ${selectionDisabled ? 'opacity-70' : ''}`}
                  >
                    <input
                      type="radio"
                      name="checkout-payment-method"
                      value={method}
                      checked={paymentMethod === method}
                      disabled={selectionDisabled}
                      onChange={() => {
                        setPaymentMethod(method)
                        setQuoteNotice(undefined)
                      }}
                      className="mt-1 size-4 shrink-0 accent-ink"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-ink">{label}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-graphite">{description}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
            </section>

            {isCod && (
              <section aria-labelledby="checkout-cod-eligibility-heading" className="border-t border-line pt-6">
                <h2 id="checkout-cod-eligibility-heading" className="eyebrow text-ink">Cash on Delivery eligibility</h2>
                <p className="mt-2 text-xs leading-relaxed text-graphite">
                  Eligibility is checked against the standardized location saved with your delivery address. You do not need to choose a separate area.
                </p>
                {!selectedProviderSupportsCod && (
                  <p className="mt-3 text-sm text-signal" role="alert">
                    The selected shipping provider does not support Cash on Delivery. Choose another provider or payment method.
                  </p>
                )}
                {selectedAddress?.countryCode === 'KH' &&
                  selectedAddress.administrativeLocationPath === null && (
                    <div className="mt-3 space-y-3">
                      <p className="text-sm text-signal" role="alert">
                        This Cambodia address needs a canonical province or municipality before Cash on Delivery can be checked. District and commune are entered as text in your address.
                      </p>
                      <Action to="/dashboard/addresses" size="sm" variant="outline">
                        Update delivery address
                      </Action>
                    </div>
                  )}
              </section>
            )}
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel>
            <PanelHeader title="Server quote" />
            {displayedQuote ? (
              <div className="p-6">
                <p className="text-sm font-semibold text-ink">{displayedQuote.shippingProvider.name}</p>
                <p className="mt-1 text-xs text-graphite">
                  {displayedQuote.paymentMethod === CHECKOUT_PAYMENT_METHOD.COD
                    ? `Cash on Delivery · ${displayedQuote.administrativeLocationPath?.map(administrativeLocationName).join(', ') ?? 'Address location'}`
                    : 'ABA PayWay'}
                </p>
                <ul className="mt-5 divide-y divide-line-soft border-y border-line-soft">
                  {displayedQuote.items.map((item) => (
                    <li key={item.variantId} className="py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink">{item.productName}</p>
                          <p className="mt-1 font-mono text-xs text-graphite">{item.sku}</p>
                          {item.variantOptions.length > 0 && (
                            <ul className="mt-3 flex flex-wrap gap-2">
                              {item.variantOptions.map((option) => (
                                <li
                                  key={`${option.optionName}-${option.optionValue}`}
                                  className="border border-line bg-bone px-2 py-1 text-[12px] text-graphite"
                                >
                                  {option.optionName}: {option.optionValue}
                                </li>
                              ))}
                            </ul>
                          )}
                          <p className="mt-1 text-xs text-graphite">
                            {item.quantity} × {formatMoney(item.unitPrice, displayedQuote.currency)}
                          </p>
                        </div>
                        <Money amount={item.lineTotal} currency={displayedQuote.currency} className="shrink-0 font-mono text-sm" />
                      </div>
                    </li>
                  ))}
                </ul>
                <dl className="mt-4 space-y-3">
                  <DefinitionRow label="Subtotal"><Money amount={displayedQuote.subtotal} currency={displayedQuote.currency} /></DefinitionRow>
                  <DefinitionRow label="Shipping"><Money amount={displayedQuote.shippingFee} currency={displayedQuote.currency} /></DefinitionRow>
                  <DefinitionRow label="Discount"><Money amount={displayedQuote.discountAmount} currency={displayedQuote.currency} /></DefinitionRow>
                  <DefinitionRow label="Total"><Money amount={displayedQuote.totalAmount} currency={displayedQuote.currency} emphasis="total" /></DefinitionRow>
                </dl>
                <p className="mt-4 text-xs text-graphite">
                  Quote expires {new Date(displayedQuote.expiresAt).toLocaleTimeString()}.
                </p>
                {quoteExpired && (
                  <p className="mt-2 text-sm text-signal" role="status">
                    {activeAttempt
                      ? 'This attempt has an expired quote. Retrying uses the same quote and key to safely check whether an order was created.'
                      : 'Quote expired. Refreshing the server quote; review its total before submitting.'}
                  </p>
                )}
              </div>
            ) : (
              <div className="p-6">
                {cart.isRefreshing ? (
                  <p className="text-sm text-graphite" role="status">Refreshing your bag before quoting…</p>
                ) : quoteLoading ? (
                  <p className="text-sm text-graphite" role="status">Calculating your server quote…</p>
                ) : quoteError ? (
                  <>
                    <FormError message={toUserMessage(quoteError)} />
                    <button type="button" className="mt-3 text-sm underline" onClick={refetchQuote}>
                      Refresh quote
                    </button>
                  </>
                ) : (
                  <p className="text-sm leading-relaxed text-graphite">
                    Select a saved address, an available provider, and a payment method to request a quote.
                  </p>
                )}
              </div>
            )}

            <div className="border-t border-line p-6">
              {checkoutBlockedByStock && (
                <p className="mb-4 text-sm text-signal" role="alert">
                  Reduce the quantities flagged in your bag before checkout.
                </p>
              )}
              <Action className="w-full" disabled={!canSubmit} onClick={() => void place()}>
                {checkout.isPlacing
                  ? 'Submitting your order…'
                  : activeAttempt
                    ? 'Retry same checkout attempt'
                    : 'Place order'}
              </Action>
              {activeAttempt && (
                <p className="mt-3 text-xs leading-relaxed text-graphite">
                  This retry reuses the same quote and idempotency key. Checkout options are locked until the result is resolved.
                </p>
              )}
            </div>
          </Panel>
          <Action to="/dashboard/bag" variant="outline" className="w-full">
            Return to bag
          </Action>
        </div>
      </div>
    </div>
  )
}

const ProviderChoice = ({
  provider,
  selected,
  disabled,
  onSelect,
}: {
  provider: PublicShippingProvider
  selected: boolean
  disabled: boolean
  onSelect: () => void
}) => (
  <label
    className={`flex cursor-pointer items-start gap-3 border p-4 transition-colors ${
      selected ? 'border-ink bg-bone' : 'border-line hover:border-graphite'
    } ${disabled ? 'opacity-70' : ''}`}
  >
    <input
      type="radio"
      name="checkout-shipping-provider"
      value={provider.id}
      checked={selected}
      disabled={disabled}
      onChange={onSelect}
      className="mt-1 size-4 shrink-0 accent-ink"
    />
    <span className="min-w-0 flex-1">
      <span className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-ink">{provider.name}</span>
        <Money amount={provider.baseFee} currency={STORE_CURRENCY} className="font-mono text-sm" />
      </span>
      {provider.description && <span className="mt-1 block text-xs text-graphite">{provider.description}</span>}
      <span className="mt-2 block text-xs text-graphite">
        {provider.supportsCod ? 'Cash on Delivery supported' : 'Cash on Delivery not supported'}
      </span>
    </span>
  </label>
)
