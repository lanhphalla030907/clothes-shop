import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type {
  AdminCustomerStats,
  AdminOrderListResponse,
  AdminOrderSummary,
  CashReconciliationCurrency,
  FinanceOverviewCurrency,
  FinanceOverviewResponse,
  Product,
  RevenueTrendBucket,
  RevenueTrendResponse,
} from '@/types/api'
import type { AdminBestSeller } from '@/features/adminProducts/api'
import {
  fetchFinanceOverview,
  fetchFinanceRevenueTrend,
} from '@/features/finance/api'
import {
  fetchOrderStatusCounts,
  fetchRecentOrders,
  fetchStockAlerts,
} from '@/features/adminDashboard/api'
import type { StockAlertsResponse } from '@/types/api'
import { fetchAdminCustomerStats } from '@/features/adminCustomers/api'
import {
  useAdminBestSellers,
  useAdminProducts,
} from '@/features/adminProducts/useAdminProducts'
import AdminDashboard from './AdminDashboard'

vi.mock('@/features/finance/api', () => ({
  fetchFinanceOverview: vi.fn(),
  fetchFinanceRevenueTrend: vi.fn(),
}))

vi.mock('@/features/adminDashboard/api', () => ({
  fetchOrderStatusCounts: vi.fn(),
  fetchRecentOrders: vi.fn(),
  fetchStockAlerts: vi.fn(),
}))

vi.mock('@/features/adminCustomers/api', () => ({
  fetchAdminCustomerStats: vi.fn(),
}))

vi.mock('@/features/adminProducts/useAdminProducts', () => ({
  useAdminProducts: vi.fn(),
  useAdminBestSellers: vi.fn(),
}))

const overviewMock = vi.mocked(fetchFinanceOverview)
const trendMock = vi.mocked(fetchFinanceRevenueTrend)
const orderCountsMock = vi.mocked(fetchOrderStatusCounts)
const recentOrdersMock = vi.mocked(fetchRecentOrders)
const stockAlertsMock = vi.mocked(fetchStockAlerts)
const customerStatsMock = vi.mocked(fetchAdminCustomerStats)
const productsHook = vi.mocked(useAdminProducts)
const bestSellersHook = vi.mocked(useAdminBestSellers)

const range = {
  from: '2026-10-15',
  to: '2026-11-13',
  basis: 'delivered' as const,
  timezone: 'Asia/Phnom_Penh',
}

const usdOverview: FinanceOverviewCurrency = {
  currency: 'USD',
  orderCount: 8,
  grossSales: '1000.00',
  productDiscounts: '100.00',
  shippingDiscounts: '10.00',
  totalDiscounts: '110.00',
  shippingRevenue: '50.00',
  netProductRevenue: '900.00',
  netRevenue: '950.00',
  averageOrderValue: '118.75',
  cogs: '600.00',
  knownCostNetRevenue: '900.00',
  grossProfit: '300.00',
  grossMargin: '0.3333',
  costCoverage: '0.75',
  isProfitPartial: true,
  discountMismatchCount: 0,
  codOrderCount: 2,
  onlinePaidOrderCount: 6,
}

const usdCash: CashReconciliationCurrency = {
  currency: 'USD',
  onlineCash: '250.00',
  codCash: '150.00',
  cashCollected: '400.00',
  orphanCash: '0.00',
  deferredCash: '0.00',
  codReceivable: '0.00',
  unpaidOnline: '0.00',
  accrualRevenue: '950.00',
  reconciliationVariance: '0.00',
  counts: {
    onlinePaidOrders: 4,
    codCollectedOrders: 2,
    orphanCashOrders: 0,
    deferredCashOrders: 0,
    codReceivableOrders: 0,
    unpaidOnlineOrders: 0,
    deliveredOrders: 8,
  },
}

const overviewResponse: FinanceOverviewResponse = {
  range,
  byCurrency: [usdOverview],
  cashByCurrency: [usdCash],
}

const bucket = (
  period: string,
  netRevenue: string,
  orderCount: number,
): RevenueTrendBucket => ({
  period,
  orderCount,
  grossSales: netRevenue,
  productDiscounts: '0.00',
  shippingDiscounts: '0.00',
  totalDiscounts: '0.00',
  shippingRevenue: '0.00',
  netProductRevenue: netRevenue,
  netRevenue,
  cogs: null,
  knownCostNetRevenue: '0.00',
  grossProfit: null,
  grossMargin: null,
  costCoverage: '0',
  isProfitPartial: true,
})

const trendResponse: RevenueTrendResponse = {
  range,
  granularity: 'day',
  timezone: 'Asia/Phnom_Penh',
  series: [
    {
      currency: 'USD',
      buckets: [
        bucket('2026-10-15', '400.00', 3),
        bucket('2026-10-16', '550.00', 5),
      ],
    },
  ],
}

const recentOrder: AdminOrderSummary = {
  id: 'order-1',
  orderNumber: 'ORD-1001',
  status: 'DELIVERED',
  customer: {
    id: 'customer-1',
    firstName: 'Sokha',
    lastName: 'Chan',
    email: 'sokha@example.com',
  },
  subtotal: '90.00',
  shippingFee: '10.00',
  discountAmount: '0.00',
  totalAmount: '100.00',
  currency: 'USD',
  itemCount: 2,
  lineCount: 1,
  shippingRecipientName: 'Sokha Chan',
  shippingCity: 'Phnom Penh',
  shippingLocationPath: null,
  shippingCountryCode: 'KH',
  payment: {
    id: 'payment-1',
    status: 'PAID',
    provider: 'ABA_PAYWAY',
    amount: '100.00',
    currency: 'USD',
    paidAt: '2026-11-12T03:00:00.000Z',
    createdAt: '2026-11-12T02:59:00.000Z',
  },
  hasPaidPayment: true,
  paymentMethod: 'ABA_PAYWAY',
  codCollection: null,
  createdAt: '2026-11-12T02:58:00.000Z',
  updatedAt: '2026-11-12T03:00:00.000Z',
}

const recentOrdersResponse: AdminOrderListResponse = {
  items: [recentOrder],
  pagination: { page: 1, limit: 7, total: 1, totalPages: 1 },
}

const stockAlerts: StockAlertsResponse = {
  summary: { inStock: 12, lowStock: 3, outOfStock: 2, total: 17 },
  items: [
    {
      variantId: 'variant-1',
      productId: 'product-1',
      productName: 'Heavyweight Hoodie',
      productImage: null,
      sku: 'HOD-BLK-M',
      color: 'Black',
      size: 'M',
      quantity: 8,
      reservedQuantity: 3,
      available: 5,
      status: 'LOW_STOCK',
    },
    {
      variantId: 'variant-2',
      productId: 'product-2',
      productName: 'Oversized Tee',
      productImage: null,
      sku: 'TEE-WHT-L',
      color: 'White',
      size: 'L',
      quantity: 4,
      reservedQuantity: 4,
      available: 0,
      status: 'OUT_OF_STOCK',
    },
  ],
}

const customerStats: AdminCustomerStats = {
  totalCustomers: 123,
  activeCustomers: 100,
  newCustomers: 10,
  customersWithOrders: 80,
  newCustomerWindowDays: 30,
}

const bestSeller: AdminBestSeller = {
  rank: 1,
  productId: 'product-1',
  name: 'Heavyweight Hoodie',
  image: null,
  unitsSold: 5,
  revenue: '500.00',
}

const resource = <T,>(data: T) => ({
  data,
  error: undefined,
  isLoading: false,
  isRefreshing: false,
  refetch: vi.fn(),
})

const orderCounts = {
  PENDING: 2,
  CONFIRMED: 3,
  PROCESSING: 4,
  SHIPPED: 5,
  DELIVERED: 6,
  CANCELLED: 7,
}

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </MemoryRouter>,
  )

beforeEach(() => {
  overviewMock.mockResolvedValue(overviewResponse)
  trendMock.mockResolvedValue(trendResponse)
  orderCountsMock.mockResolvedValue(orderCounts)
  recentOrdersMock.mockResolvedValue(recentOrdersResponse)
  stockAlertsMock.mockResolvedValue(stockAlerts)
  customerStatsMock.mockResolvedValue(customerStats)
  productsHook.mockReturnValue(resource<Product[]>([]))
  bestSellersHook.mockReturnValue(resource<AdminBestSeller[]>([bestSeller]))
})

afterEach(cleanup)

describe('AdminDashboard (store overview)', () => {
  it('renders the store KPIs, payment breakdown, statuses and recent activity', async () => {
    renderPage()

    expect(
      screen.getByRole('heading', { name: 'Store Overview' }),
    ).toBeTruthy()
    expect(
      screen.getByText(
        'Your store performance at a glance. Monitor sales, orders, payments, customers, and operations.',
      ),
    ).toBeTruthy()

    const kpis = await screen.findByRole('region', { name: 'Store summary' })
    const kpi = within(kpis)

    expect(kpi.getByText('Total revenue')).toBeTruthy()
    expect(kpi.getByText('Total orders')).toBeTruthy()
    expect(kpi.getByText('Total customers')).toBeTruthy()
    expect(kpi.getByText('Total products')).toBeTruthy()
    expect(kpi.getByText('Pending orders')).toBeTruthy()
    expect(kpi.getByText('Cash collected')).toBeTruthy()

    expect(kpi.getByText('$950.00')).toBeTruthy()
    expect(kpi.getByText('$400.00')).toBeTruthy()
    expect(kpi.getByText('123')).toBeTruthy()
    expect(kpi.getByText('27')).toBeTruthy()
    expect(kpi.getByText('2')).toBeTruthy()

    // Payment collection: only online cash and collected COD, on the server total.
    expect(await screen.findByText('62.5%')).toBeTruthy()
    expect(screen.getByText('37.5%')).toBeTruthy()
    expect(screen.getByText('$250.00')).toBeTruthy()
    expect(screen.getByText('$150.00')).toBeTruthy()

    // Status tiles link to the existing filtered order list.
    const pending = await screen.findByRole('link', { name: /Pending/ })
    expect(pending.getAttribute('href')).toBe('/admin/orders?status=PENDING')
    expect(within(pending).getByText('2')).toBeTruthy()

    const delivered = screen.getByRole('link', { name: /Delivered/ })
    expect(delivered.getAttribute('href')).toBe('/admin/orders?status=DELIVERED')
    expect(within(delivered).getByText('6')).toBeTruthy()
    expect(screen.getByText('27 total')).toBeTruthy()

    // Recent orders keep the real customer, amount and payment facts.
    expect((await screen.findAllByText('ORD-1001')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Sokha Chan').length).toBeGreaterThan(0)
    expect(screen.getAllByText('sokha@example.com').length).toBeGreaterThan(0)
    expect(screen.getAllByText('$100.00').length).toBeGreaterThan(0)

    // Stock alerts: full summary cards plus the default low + out table.
    const inStockCard = await screen.findByRole('group', {
      name: 'In stock variants',
    })
    expect(
      within(inStockCard).getByText('12'),
    ).toBeTruthy()
    expect(
      within(screen.getByRole('group', { name: 'Low stock variants' })).getByText(
        '3',
      ),
    ).toBeTruthy()
    expect(
      within(
        screen.getByRole('group', { name: 'Out of stock variants' }),
      ).getByText('2'),
    ).toBeTruthy()
    expect(await screen.findByText('HOD-BLK-M')).toBeTruthy()
    expect(screen.getByText('Oversized Tee')).toBeTruthy()
    expect(screen.getAllByText('Out of stock').length).toBeGreaterThan(0)
    expect(
      screen.getByRole('link', { name: /Manage stock/ }).getAttribute('href'),
    ).toBe('/admin/product-variants')

    // Best sellers still render alongside the stock panel.
    expect(
      (await screen.findAllByText('Heavyweight Hoodie')).length,
    ).toBeGreaterThan(0)
    expect(screen.getByText('5 units sold')).toBeTruthy()
    expect(
      screen
        .getByRole('link', { name: /Product dashboard/ })
        .getAttribute('href'),
    ).toBe('/admin/products/overview')
  })

  it('applies one custom reporting range to finance, trend and order counts', async () => {
    renderPage()
    await screen.findByRole('region', { name: 'Store summary' })

    fireEvent.click(screen.getByRole('button', { name: /Custom range/i }))
    fireEvent.change(screen.getByLabelText('Start date'), {
      target: { value: '2026-10-01' },
    })
    fireEvent.change(screen.getByLabelText('End date'), {
      target: { value: '2026-10-31' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Apply range' }))

    await waitFor(() =>
      expect(overviewMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          from: '2026-10-01',
          to: '2026-10-31',
          basis: 'delivered',
        }),
        expect.anything(),
      ),
    )
    expect(trendMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        from: '2026-10-01',
        to: '2026-10-31',
        granularity: 'day',
      }),
      expect.anything(),
    )
    expect(orderCountsMock).toHaveBeenLastCalledWith(
      {
        createdFrom: '2026-09-30T17:00:00.000Z',
        createdTo: '2026-10-31T16:59:59.999Z',
      },
      expect.anything(),
    )
  })

  it('shows an error with retry when the finance summary fails', async () => {
    overviewMock.mockRejectedValueOnce(new Error('Finance unavailable'))
    renderPage()

    expect(
      (await screen.findAllByText('Something went wrong')).length,
    ).toBeGreaterThan(0)
    expect(
      screen.getAllByRole('button', { name: 'Try again' }).length,
    ).toBeGreaterThan(0)
  })

  it('shows a loading state before the trend resolves', () => {
    trendMock.mockReturnValueOnce(
      new Promise<RevenueTrendResponse>(() => undefined),
    )
    renderPage()

    expect(
      screen.getByText('Loading sales and orders trend'),
    ).toBeTruthy()
  })
})
