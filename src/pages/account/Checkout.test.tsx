import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { useAddressActions } from '@/features/addresses/useAddressActions'
import { useCartActions } from '@/features/cart/useCartActions'
import { createCheckoutQuote, placeOrder } from '@/features/checkout/api'
import { fetchShippingProviders } from '@/features/shippingProviders/api'
import { useCheckout } from '@/features/checkout/useCheckout'
import type {
  Address,
  CartLine,
  CheckoutQuote,
  CreateCheckoutQuoteRequest,
  Order,
  PublicShippingProvider,
} from '@/types/api'
import AccountCheckout from './Checkout'
import { ApiError } from '@/lib/api/errors'

vi.mock('@/features/addresses/useAddressActions', () => ({
  useAddressActions: vi.fn(),
}))

vi.mock('@/features/cart/useCartActions', () => ({
  useCartActions: vi.fn(),
}))

vi.mock('@/features/checkout/api', () => ({
  createCheckoutQuote: vi.fn(),
  placeOrder: vi.fn(),
}))

vi.mock('@/features/shippingProviders/api', () => ({
  fetchShippingProviders: vi.fn(),
}))

vi.mock('@/context/feedbackContext', () => ({
  useFeedback: () => ({ showFeedback: vi.fn() }),
}))

vi.mock('@/features/payments/PaymentForOrder', () => ({
  PaymentForOrder: ({ orderId }: { orderId: string }) => <p>PayWay order {orderId}</p>,
}))

const ADDRESS_ID = '11111111-1111-4111-8111-111111111111'
const PROVIDER_A_ID = '22222222-2222-4222-8222-222222222222'
const PROVIDER_B_ID = '33333333-3333-4333-8333-333333333333'
const ORDER_ID = '55555555-5555-4555-8555-555555555555'

const useAddressActionsMock = vi.mocked(useAddressActions)
const useCartActionsMock = vi.mocked(useCartActions)
const createQuoteMock = vi.mocked(createCheckoutQuote)
const placeOrderMock = vi.mocked(placeOrder)
const fetchProvidersMock = vi.mocked(fetchShippingProviders)

const address: Address = {
  id: ADDRESS_ID,
  userId: '66666666-6666-4666-8666-666666666666',
  label: 'Home',
  recipientName: 'Jane Doe',
  phone: '+85512345678',
  addressLine1: 'Street 1',
  addressLine2: null,
  city: null,
  stateProvince: null,
  district: null,
  commune: null,
  administrativeLocationPcode: 'KH120101',
  administrativeLocationPath: [
    { pcode: 'KH12', parentPcode: null, adminLevel: 1, nameEn: 'Phnom Penh', nameKm: null },
    { pcode: 'KH1201', parentPcode: 'KH12', adminLevel: 2, nameEn: 'Chamkar Mon', nameKm: null },
    { pcode: 'KH120101', parentPcode: 'KH1201', adminLevel: 3, nameEn: 'Tonle Bassac', nameKm: null },
  ],
  postalCode: null,
  countryCode: 'KH',
  isDefault: true,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
}

const line: CartLine = {
  id: '77777777-7777-4777-8777-777777777777',
  cartId: '88888888-8888-4888-8888-888888888888',
  variantId: '99999999-9999-4999-8999-999999999999',
  quantity: 1,
  available: 10,
  exceedsAvailable: false,
  unitPrice: '100.00',
  lineTotal: '100.00',
  variant: {
    id: '99999999-9999-4999-8999-999999999999',
    sku: 'TEE-M',
    price: '100.00',
    isActive: true,
    options: [{ optionName: 'Size', optionValue: 'M' }],
  },
  product: {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    name: 'Cotton tee',
    slug: 'cotton-tee',
    basePrice: '100.00',
    status: 'ACTIVE',
    isActive: true,
  },
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
}

const providers: PublicShippingProvider[] = [
  {
    id: PROVIDER_A_ID,
    code: 'LOCAL',
    name: 'Local delivery',
    description: 'City delivery',
    baseFee: '5.00',
    supportsCod: true,
  },
  {
    id: PROVIDER_B_ID,
    code: 'POST',
    name: 'Postal service',
    description: null,
    baseFee: '19.00',
    supportsCod: false,
  },
]

const makeQuote = (
  request: CreateCheckoutQuoteRequest,
  overrides: Partial<CheckoutQuote> = {},
): CheckoutQuote => {
  const provider = providers.find((entry) => entry.id === request.shippingProviderId) ?? providers[0]
  const shippingFee = provider.baseFee
  const totalAmount = provider.id === PROVIDER_B_ID ? '119.00' : '105.00'

  return {
    quoteId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    paymentMethod: request.paymentMethod,
    addressId: request.addressId,
    shippingProvider: { id: provider.id, code: provider.code, name: provider.name, fee: shippingFee },
    administrativeLocationPath: address.administrativeLocationPath,
    items: [
      {
        variantId: line.variantId,
        productName: line.product.name,
        sku: line.variant.sku,
        variantOptions: line.variant.options,
        unitPrice: line.unitPrice,
        quantity: line.quantity,
        lineTotal: line.lineTotal,
      },
    ],
    subtotal: '100.00',
    shippingFee,
    discountAmount: '0.00',
    totalAmount,
    couponCode: null,
    appliedCoupon: null,
    appliedAutomaticPromotion: null,
    appliedPromotions: [],
    currency: 'USD',
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    ...overrides,
  }
}

const makeOrder = (paymentMethod: Order['paymentMethod']): Order =>
  ({
    id: ORDER_ID,
    userId: address.userId,
    orderNumber: 'ORD-TEST-01',
    status: 'PENDING',
    paymentMethod,
    shippingLocationPath: null,
  }) as Order

let cartLines: readonly CartLine[]
let cartRefetch: () => void

const selectCodPayment = () => {
  const radio = screen
    .getAllByRole('radio')
    .find((input) => input.getAttribute('value') === 'COD')
  if (!radio) throw new Error('COD payment option was not rendered.')
  fireEvent.click(radio)
}

const LocationProbe = () => {
  const location = useLocation()
  return <output data-testid="location">{location.pathname}</output>
}

const checkoutTree = () => (
  <MemoryRouter initialEntries={['/dashboard/checkout']}>
    <Routes>
      <Route path="/dashboard/checkout" element={<AccountCheckout />} />
      <Route path="/dashboard/checkout/:orderId" element={<p>PayWay confirmation route</p>} />
      <Route path="/dashboard/orders/:id" element={<p>Order detail confirmation route</p>} />
    </Routes>
    <LocationProbe />
  </MemoryRouter>
)

const renderCheckout = () => render(checkoutTree())

const waitForQuote = async () => {
  await screen.findByText('Cotton tee')
  await screen.findByText('$105.00')
}

describe('authenticated checkout quote flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.sessionStorage.clear()
    cartLines = [line]
    cartRefetch = vi.fn()
    useCartActionsMock.mockReturnValue({
      cart: {
        id: line.cartId,
        userId: address.userId,
        items: cartLines as CartLine[],
        itemCount: 1,
        subtotal: '100.00',
        createdAt: line.createdAt,
        updatedAt: line.updatedAt,
      },
      lines: cartLines,
      itemCount: 1,
      isLoading: false,
      isRefreshing: false,
      error: undefined,
      refetch: cartRefetch,
      actionError: undefined,
      isPendingLine: () => false,
      isPendingVariant: () => false,
      isClearing: false,
      add: vi.fn(),
      setQuantity: vi.fn(),
      removeLine: vi.fn(),
      clear: vi.fn(),
      dismissActionError: vi.fn(),
    })
    useAddressActionsMock.mockReturnValue({
      addresses: [address],
      defaultAddress: address,
      isLoading: false,
      isRefreshing: false,
      error: undefined,
      refetch: vi.fn(),
      actionError: undefined,
      dismissActionError: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      makeDefault: vi.fn(),
      remove: vi.fn(),
      pendingIds: new Set(),
      isCreating: false,
    })
    fetchProvidersMock.mockResolvedValue(providers)
    createQuoteMock.mockImplementation(async (request) => makeQuote(request))
    placeOrderMock.mockImplementation(async (request) =>
      makeOrder(
        request.quoteId === 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
          ? 'ABA_PAYWAY'
          : 'COD',
      ),
    )
  })

  afterEach(() => {
    cleanup()
  })

  it('loads only returned providers and displays their server fees and COD support', async () => {
    renderCheckout()
    await waitForQuote()

    expect(fetchProvidersMock).toHaveBeenCalledOnce()
    expect(screen.getAllByText('Local delivery').length).toBeGreaterThan(0)
    expect(screen.getAllByText('$5.00').length).toBeGreaterThan(0)
    expect(screen.getByText('Cash on Delivery supported')).toBeTruthy()
    expect(screen.getByText('Cash on Delivery not supported')).toBeTruthy()
    expect(createQuoteMock).toHaveBeenCalledWith(
      {
        addressId: ADDRESS_ID,
        shippingProviderId: PROVIDER_A_ID,
        paymentMethod: 'ABA_PAYWAY',
      },
      expect.any(AbortSignal),
    )
  })

  it('surfaces provider loading failure and offers a retry', async () => {
    fetchProvidersMock.mockRejectedValueOnce(new ApiError('Network unavailable', { kind: 'network' }))
    renderCheckout()

    expect(await screen.findByText(/could not reach the studio/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
    expect(createQuoteMock).not.toHaveBeenCalled()
  })

  it('selects COD independently and requests a quote without a customer-selected area', async () => {
    renderCheckout()
    await waitForQuote()
    selectCodPayment()

    await waitFor(() => {
      expect(createQuoteMock).toHaveBeenLastCalledWith(
        {
          addressId: ADDRESS_ID,
          shippingProviderId: PROVIDER_A_ID,
          paymentMethod: 'COD',
        },
        expect.any(AbortSignal),
      )
    })
    expect(screen.getByText(/standardized location saved with your delivery address/)).toBeTruthy()
  })

  it('explains that a legacy Cambodia address needs a canonical province before COD eligibility can be checked', async () => {
    const legacyAddress: Address = {
      ...address,
      city: 'Phnom Penh',
      administrativeLocationPcode: null,
      administrativeLocationPath: null,
    }
    useAddressActionsMock.mockReturnValue({
      addresses: [legacyAddress],
      defaultAddress: legacyAddress,
      isLoading: false,
      isRefreshing: false,
      error: undefined,
      refetch: vi.fn(),
      actionError: undefined,
      dismissActionError: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      makeDefault: vi.fn(),
      remove: vi.fn(),
      pendingIds: new Set(),
      isCreating: false,
    })
    createQuoteMock.mockImplementation((request) =>
      request.paymentMethod === 'COD'
        ? Promise.reject(new ApiError('Cash on Delivery is unavailable for this address.', { kind: 'conflict' }))
        : Promise.resolve(makeQuote(request)),
    )
    renderCheckout()
    await waitForQuote()
    selectCodPayment()

    expect(await screen.findByText(/needs a canonical province or municipality/i)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Update delivery address' })).toBeTruthy()
    expect(createQuoteMock).toHaveBeenLastCalledWith(
      { addressId: ADDRESS_ID, shippingProviderId: PROVIDER_A_ID, paymentMethod: 'COD' },
      expect.any(AbortSignal),
    )
  })

  it('prevents COD checkout with a provider that does not support COD', async () => {
    renderCheckout()
    await waitForQuote()
    selectCodPayment()
    fireEvent.click(screen.getByLabelText(/Postal service/))

    expect(await screen.findByText(/does not support Cash on Delivery/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Place order' }).hasAttribute('disabled')).toBe(true)
    expect(createQuoteMock).not.toHaveBeenLastCalledWith(
      expect.objectContaining({
        shippingProviderId: PROVIDER_B_ID,
        paymentMethod: 'COD',
      }),
      expect.anything(),
    )
  })

  it('refreshes the quote after provider and cart quantity changes', async () => {
    const view = renderCheckout()
    await waitForQuote()
    fireEvent.click(screen.getByLabelText(/Postal service/))

    await waitFor(() => expect(screen.getByText('$119.00')).toBeTruthy())
    expect(createQuoteMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ shippingProviderId: PROVIDER_B_ID }),
      expect.any(AbortSignal),
    )

    cartLines = [{ ...line, quantity: 2, lineTotal: '200.00' }]
    useCartActionsMock.mockReturnValue({
      ...useCartActionsMock.mock.results[useCartActionsMock.mock.results.length - 1].value,
      lines: cartLines,
      cart: {
        ...useCartActionsMock.mock.results[useCartActionsMock.mock.results.length - 1].value.cart,
        items: cartLines as CartLine[],
        itemCount: 2,
        updatedAt: '2026-10-29T14:00:00.000Z',
      },
    })
    view.rerender(checkoutTree())

    await waitFor(() => expect(createQuoteMock).toHaveBeenCalledTimes(3))
    expect(createQuoteMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ shippingProviderId: PROVIDER_B_ID }),
      expect.any(AbortSignal),
    )
  })

  it('refreshes the quote when the selected address changes', async () => {
    const view = renderCheckout()
    await waitForQuote()
    const otherAddress: Address = {
      ...address,
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab',
      label: 'Work',
      isDefault: false,
    }
    const currentAddressActions =
      useAddressActionsMock.mock.results[useAddressActionsMock.mock.results.length - 1].value
    useAddressActionsMock.mockReturnValue({
      ...currentAddressActions,
      addresses: [address, otherAddress],
    })
    view.rerender(checkoutTree())
    fireEvent.click(screen.getByLabelText(/Work/))

    await waitFor(() => {
      expect(createQuoteMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ addressId: otherAddress.id }),
        expect.any(AbortSignal),
      )
    })
    expect(createQuoteMock).toHaveBeenCalledTimes(2)
  })

  it('does not let a stale quote response replace a newer selection quote', async () => {
    let resolveOld!: (quote: CheckoutQuote) => void
    const oldQuote = new Promise<CheckoutQuote>((resolve) => {
      resolveOld = resolve
    })
    createQuoteMock
      .mockImplementationOnce(() => oldQuote)
      .mockImplementationOnce(async (request) =>
        makeQuote(request, { quoteId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', totalAmount: '119.00' }),
      )

    renderCheckout()
    await waitFor(() => expect(createQuoteMock).toHaveBeenCalledOnce())
    fireEvent.click(screen.getByLabelText(/Postal service/))
    await screen.findByText('$119.00')

    await act(async () => {
      resolveOld(
        makeQuote(
          { addressId: ADDRESS_ID, shippingProviderId: PROVIDER_A_ID, paymentMethod: 'ABA_PAYWAY' },
          { quoteId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', totalAmount: '105.00' },
        ),
      )
    })

    expect(screen.getByText('$119.00')).toBeTruthy()
    expect(screen.queryByText('$105.00')).toBeNull()
  })

  it('refreshes an expired quote and shows the refreshed server total', async () => {
    let quoteCount = 0
    createQuoteMock.mockImplementation(async (request) => {
      quoteCount += 1
      return makeQuote(request, {
        quoteId:
          quoteCount === 1
            ? 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
            : 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        totalAmount: quoteCount === 1 ? '105.00' : '106.00',
        expiresAt: new Date(Date.now() + (quoteCount === 1 ? 25 : 60_000)).toISOString(),
      })
    })

    renderCheckout()
    await screen.findByText('Cotton tee')
    await waitFor(() => expect(createQuoteMock).toHaveBeenCalledTimes(2), { timeout: 2_000 })
    expect(await screen.findByText('$106.00')).toBeTruthy()
    expect(screen.getByText(/quote was refreshed/i)).toBeTruthy()
  })

  it('refreshes a rejected stale quote and uses a new idempotency key for the new quote', async () => {
    createQuoteMock
      .mockImplementationOnce(async (request) => makeQuote(request))
      .mockImplementationOnce(async (request) =>
        makeQuote(request, {
          quoteId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          totalAmount: '106.00',
        }),
      )
    placeOrderMock
      .mockRejectedValueOnce(new ApiError('Checkout quote has expired', { kind: 'conflict' }))
      .mockResolvedValueOnce(makeOrder('ABA_PAYWAY'))

    renderCheckout()
    await waitForQuote()
    fireEvent.click(screen.getByRole('button', { name: 'Place order' }))

    await screen.findByText(/quote is no longer valid/i)
    expect(await screen.findByText('$106.00')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Place order' }))
    await screen.findByText('PayWay confirmation route')

    expect(placeOrderMock).toHaveBeenCalledTimes(2)
    expect(placeOrderMock.mock.calls[0][0].quoteId).not.toBe(placeOrderMock.mock.calls[1][0].quoteId)
    expect(placeOrderMock.mock.calls[0][0].idempotencyKey).not.toBe(
      placeOrderMock.mock.calls[1][0].idempotencyKey,
    )
    expect(cartRefetch).toHaveBeenCalledTimes(2)
  })

  it('shows the existing address-management path when no saved address is available', async () => {
    useAddressActionsMock.mockReturnValue({
      addresses: [],
      defaultAddress: undefined,
      isLoading: false,
      isRefreshing: false,
      error: undefined,
      refetch: vi.fn(),
      actionError: undefined,
      dismissActionError: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      makeDefault: vi.fn(),
      remove: vi.fn(),
      pendingIds: new Set(),
      isCreating: false,
    })

    renderCheckout()
    expect(await screen.findByRole('link', { name: /Add an address/ })).toBeTruthy()
    expect(createQuoteMock).not.toHaveBeenCalled()
  })

  it('does not request a quote for an empty cart', async () => {
    cartLines = []
    useCartActionsMock.mockReturnValue({
      cart: undefined,
      lines: [],
      itemCount: 0,
      isLoading: false,
      isRefreshing: false,
      error: undefined,
      refetch: cartRefetch,
      actionError: undefined,
      isPendingLine: () => false,
      isPendingVariant: () => false,
      isClearing: false,
      add: vi.fn(),
      setQuantity: vi.fn(),
      removeLine: vi.fn(),
      clear: vi.fn(),
      dismissActionError: vi.fn(),
    })

    renderCheckout()
    expect(await screen.findByText('Your bag is empty')).toBeTruthy()
    expect(createQuoteMock).not.toHaveBeenCalled()
  })

  it('surfaces quote errors and recovers when the customer refreshes the quote', async () => {
    createQuoteMock
      .mockRejectedValueOnce(new ApiError('Quote service unavailable', { kind: 'unavailable' }))
      .mockImplementationOnce(async (request) => makeQuote(request))
    renderCheckout()

    expect(await screen.findByText(/quote service unavailable/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Refresh quote' }))
    expect(await screen.findByText('Cotton tee')).toBeTruthy()
    expect(screen.getByText('$105.00')).toBeTruthy()
  })

  it('submits the quote ID and a UUID key, then navigates ABA PayWay orders to payment', async () => {
    placeOrderMock.mockResolvedValueOnce(makeOrder('ABA_PAYWAY'))
    renderCheckout()
    await waitForQuote()
    fireEvent.click(screen.getByRole('button', { name: 'Place order' }))

    await screen.findByText('PayWay confirmation route')
    expect(placeOrderMock).toHaveBeenCalledOnce()
    const [request] = placeOrderMock.mock.calls[0]
    expect(request.quoteId).toBe('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
    expect(request.idempotencyKey).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
    expect(cartRefetch).toHaveBeenCalledOnce()
  })

  it('persists and retries the exact attempt after reload even if the cart has cleared', async () => {
    placeOrderMock
      .mockRejectedValueOnce(new ApiError('Connection lost', { kind: 'network' }))
      .mockResolvedValueOnce(makeOrder('ABA_PAYWAY'))
    renderCheckout()
    await waitForQuote()
    fireEvent.click(screen.getByRole('button', { name: 'Place order' }))

    await screen.findByRole('button', { name: 'Retry same checkout attempt' })
    const request = placeOrderMock.mock.calls[0][0]
    expect(window.sessionStorage.length).toBe(1)

    const previousCart = useCartActionsMock.mock.results[0]?.value
    if (!previousCart) throw new Error('Cart hook was not initialized.')
    useCartActionsMock.mockReturnValue({
      ...previousCart,
      cart: previousCart.cart
        ? { ...previousCart.cart, items: [], itemCount: 0, subtotal: '0.00' }
        : previousCart.cart,
      lines: [],
      itemCount: 0,
    })
    cleanup()
    renderCheckout()

    expect(await screen.findByText('Cotton tee')).toBeTruthy()
    expect(createQuoteMock).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: 'Retry same checkout attempt' }))
    await screen.findByText('PayWay confirmation route')

    expect(placeOrderMock).toHaveBeenCalledTimes(2)
    expect(placeOrderMock.mock.calls[1][0]).toEqual(request)
    expect(window.sessionStorage.length).toBe(0)
  })

  it('navigates COD orders to order details without entering the PayWay route', async () => {
    placeOrderMock.mockResolvedValueOnce(makeOrder('COD'))
    renderCheckout()
    await waitForQuote()
    selectCodPayment()
    await waitFor(() => expect(createQuoteMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ paymentMethod: 'COD' }),
      expect.any(AbortSignal),
    ))
    fireEvent.click(screen.getByRole('button', { name: 'Place order' }))

    await screen.findByText('Order detail confirmation route')
    expect(screen.getByTestId('location').textContent).toBe(`/dashboard/orders/${ORDER_ID}`)
  })

  it('refuses duplicate in-flight checkout submissions at the hook boundary', async () => {
    let resolveOrder!: (order: Order) => void
    placeOrderMock.mockImplementationOnce(
      () =>
        new Promise<Order>((resolve) => {
          resolveOrder = resolve
        }),
    )
    const request = {
      quoteId: '11111111-1111-4111-8111-111111111111',
      idempotencyKey: '22222222-2222-4222-8222-222222222222',
    }
    const { result } = renderHook(() => useCheckout())
    let firstSubmission!: ReturnType<typeof result.current.placeOrder>

    act(() => {
      firstSubmission = result.current.placeOrder(request)
    })
    let secondResult: Awaited<ReturnType<typeof result.current.placeOrder>> | undefined
    await act(async () => {
      secondResult = await result.current.placeOrder(request)
    })

    expect(secondResult).toEqual({ kind: 'busy' })
    expect(placeOrderMock).toHaveBeenCalledOnce()

    await act(async () => {
      resolveOrder(makeOrder('ABA_PAYWAY'))
      await firstSubmission
    })
  })
})
