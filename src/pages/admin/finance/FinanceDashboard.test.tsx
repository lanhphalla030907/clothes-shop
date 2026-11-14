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
  CashReconciliationCurrency,
  CashReconciliationResponse,
  FinanceOverviewCurrency,
  FinanceOverviewResponse,
  ProductProfitItem,
  ProductProfitResponse,
  ProductRankingsResponse,
  RevenueTrendResponse,
} from '@/types/api'
import {
  fetchFinanceCashReconciliation,
  fetchFinanceOverview,
  fetchFinanceProducts,
  fetchFinanceRankings,
  fetchFinanceRevenueTrend,
} from '@/features/finance/api'
import FinanceDashboard from './FinanceDashboard'

vi.mock('@/features/finance/api', () => ({
  fetchFinanceOverview: vi.fn(),
  fetchFinanceRevenueTrend: vi.fn(),
  fetchFinanceProducts: vi.fn(),
  fetchFinanceRankings: vi.fn(),
  fetchFinanceCashReconciliation: vi.fn(),
}))

const overviewMock = vi.mocked(fetchFinanceOverview)
const trendMock = vi.mocked(fetchFinanceRevenueTrend)
const productsMock = vi.mocked(fetchFinanceProducts)
const rankingsMock = vi.mocked(fetchFinanceRankings)
const cashMock = vi.mocked(fetchFinanceCashReconciliation)

const range = {
  from: '2026-10-01',
  to: '2026-10-31',
  basis: 'delivered' as const,
  timezone: 'Asia/Phnom_Penh',
}

const usdOverview: FinanceOverviewCurrency = {
  currency: 'USD',
  orderCount: 5,
  grossSales: '1000.00',
  productDiscounts: '100.00',
  shippingDiscounts: '10.00',
  totalDiscounts: '110.00',
  shippingRevenue: '50.00',
  netProductRevenue: '900.00',
  netRevenue: '950.00',
  averageOrderValue: '190.00',
  cogs: '600.00',
  knownCostNetRevenue: '900.00',
  grossProfit: '300.00',
  grossMargin: '0.3333',
  costCoverage: '0.75',
  isProfitPartial: true,
  discountMismatchCount: 0,
  codOrderCount: 1,
  onlinePaidOrderCount: 4,
}

const khrOverview: FinanceOverviewCurrency = {
  currency: 'KHR',
  orderCount: 2,
  grossSales: '4000000.00',
  productDiscounts: '0.00',
  shippingDiscounts: '0.00',
  totalDiscounts: '0.00',
  shippingRevenue: '20000.00',
  netProductRevenue: '4000000.00',
  netRevenue: '4020000.00',
  averageOrderValue: '2010000.00',
  cogs: null,
  knownCostNetRevenue: '0.00',
  grossProfit: null,
  grossMargin: null,
  costCoverage: '0',
  isProfitPartial: true,
  discountMismatchCount: 0,
  codOrderCount: 2,
  onlinePaidOrderCount: 0,
}

const usdCash: CashReconciliationCurrency = {
  currency: 'USD',
  onlineCash: '250.00',
  codCash: '150.00',
  cashCollected: '400.00',
  orphanCash: '0.00',
  deferredCash: '20.00',
  codReceivable: '75.00',
  unpaidOnline: '120.00',
  accrualRevenue: '950.00',
  reconciliationVariance: '-550.00',
  counts: {
    onlinePaidOrders: 4,
    codCollectedOrders: 1,
    orphanCashOrders: 0,
    deferredCashOrders: 1,
    codReceivableOrders: 1,
    unpaidOnlineOrders: 2,
    deliveredOrders: 5,
  },
}

const khrCash: CashReconciliationCurrency = {
  ...usdCash,
  currency: 'KHR',
  onlineCash: '0.00',
  codCash: '4000000.00',
  cashCollected: '4000000.00',
  deferredCash: '0.00',
  codReceivable: '0.00',
  unpaidOnline: '0.00',
  accrualRevenue: '4020000.00',
  reconciliationVariance: '-20000.00',
}

const overviewResponse: FinanceOverviewResponse = {
  range,
  byCurrency: [usdOverview, khrOverview],
  cashByCurrency: [usdCash, khrCash],
}

const hoodie: ProductProfitItem = {
  productId: 'product-1',
  productName: 'Heavyweight Hoodie',
  variantId: 'variant-1',
  variantSku: 'HD-BLK-M',
  currency: 'USD',
  orderCount: 3,
  unitsSold: 4,
  grossRevenue: '400.00',
  productDiscounts: '20.00',
  netRevenue: '380.00',
  cogs: '240.00',
  knownCostNetRevenue: '380.00',
  grossProfit: '140.00',
  grossMargin: '0.3684',
  costCoverage: '1',
  isProfitPartial: false,
}

const mysteryTee: ProductProfitItem = {
  productId: 'product-2',
  productName: 'Mystery Tee',
  variantId: 'variant-2',
  variantSku: 'MT-WHT-L',
  currency: 'USD',
  orderCount: 1,
  unitsSold: 2,
  grossRevenue: '100.00',
  productDiscounts: '0.00',
  netRevenue: '100.00',
  cogs: null,
  knownCostNetRevenue: '0.00',
  grossProfit: null,
  grossMargin: null,
  costCoverage: '0',
  isProfitPartial: true,
}

const pageTwoTee: ProductProfitItem = {
  ...mysteryTee,
  productId: 'product-3',
  productName: 'Second Page Tee',
  variantId: 'variant-3',
  variantSku: 'SP-WHT-M',
}

const productResponse = (page = 1): ProductProfitResponse => ({
  range,
  items: page === 2 ? [pageTwoTee] : [hoodie, mysteryTee],
  pagination: { page, limit: 20, total: 21, totalPages: 2 },
})

const trendResponse: RevenueTrendResponse = {
  range,
  granularity: 'day',
  timezone: 'Asia/Phnom_Penh',
  series: [
    {
      currency: 'USD',
      buckets: [
        {
          period: '2026-10-01',
          orderCount: 1,
          grossSales: '1000.00',
          productDiscounts: '100.00',
          shippingDiscounts: '10.00',
          totalDiscounts: '110.00',
          shippingRevenue: '50.00',
          netProductRevenue: '900.00',
          netRevenue: '950.00',
          cogs: '600.00',
          knownCostNetRevenue: '900.00',
          grossProfit: '300.00',
          grossMargin: '0.3333',
          costCoverage: '1',
          isProfitPartial: false,
        },
      ],
    },
    {
      currency: 'KHR',
      buckets: [
        {
          period: '2026-10-01',
          orderCount: 1,
          grossSales: '4000000.00',
          productDiscounts: '0.00',
          shippingDiscounts: '0.00',
          totalDiscounts: '0.00',
          shippingRevenue: '20000.00',
          netProductRevenue: '4000000.00',
          netRevenue: '4020000.00',
          cogs: null,
          knownCostNetRevenue: '0.00',
          grossProfit: null,
          grossMargin: null,
          costCoverage: '0',
          isProfitPartial: true,
        },
      ],
    },
  ],
}

const rankingsResponse: ProductRankingsResponse = {
  range,
  metric: 'units',
  items: [
    {
      rank: 1,
      productId: 'product-1',
      productName: 'Heavyweight Hoodie',
      currency: 'USD',
      unitsSold: 4,
      netRevenue: '380.00',
      cogs: '240.00',
      grossProfit: '140.00',
      grossMargin: '0.3684',
      costCoverage: '1',
      isProfitPartial: false,
    },
    {
      rank: 2,
      productId: 'product-2',
      productName: 'Mystery Tee',
      currency: 'USD',
      unitsSold: 2,
      netRevenue: '100.00',
      cogs: null,
      grossProfit: null,
      grossMargin: null,
      costCoverage: '0',
      isProfitPartial: true,
    },
  ],
}

const cashResponse: CashReconciliationResponse = {
  range,
  byCurrency: [usdCash, khrCash],
}

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/admin/finance']}>
      <Routes>
        <Route path="/admin/finance" element={<FinanceDashboard />} />
      </Routes>
    </MemoryRouter>,
  )

beforeEach(() => {
  overviewMock.mockResolvedValue(overviewResponse)
  trendMock.mockResolvedValue(trendResponse)
  productsMock.mockImplementation((query) =>
    Promise.resolve(productResponse(query.page ?? 1)),
  )
  rankingsMock.mockResolvedValue(rankingsResponse)
  cashMock.mockResolvedValue(cashResponse)
})

afterEach(cleanup)

describe('FinanceDashboard', () => {
  it('renders currency-separated KPIs, partial profit, coverage and cash', async () => {
    renderPage()

    expect(await screen.findAllByText('Gross product sales')).toBeTruthy()
    expect(screen.getAllByText('Product discounts').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Net product revenue').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Shipping revenue').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Known-cost gross profit').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Partial profit').length).toBeGreaterThan(0)
    expect(screen.getByText('75.0%')).toBeTruthy()
    expect(screen.getByText('33.3%')).toBeTruthy()
    expect(screen.getAllByText(/1,000\.00/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/4,000,000\.00/).length).toBeGreaterThan(0)
    expect(
      screen.getByText(/Multiple currencies are present/),
    ).toBeTruthy()
    expect(
      screen.getAllByText(/Money received, not earned revenue/).length,
    ).toBeGreaterThan(0)
    expect(screen.getAllByText('Unknown').length).toBeGreaterThan(0)
  })

  it('shows an API error with a retry action', async () => {
    overviewMock.mockRejectedValueOnce(new Error('Finance unavailable'))
    renderPage()

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Something went wrong',
    )
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
  })

  it('shows a loading state before the overview resolves', () => {
    overviewMock.mockReturnValueOnce(
      new Promise<FinanceOverviewResponse>(() => undefined),
    )
    renderPage()

    expect(
      screen.getByRole('status', { name: 'Loading finance overview' }),
    ).toBeTruthy()
  })

  it('applies validated date filters to the overview request', async () => {
    renderPage()
    await screen.findAllByText('Gross product sales')

    fireEvent.change(screen.getByLabelText('Start date'), {
      target: { value: '2026-10-01' },
    })
    fireEvent.change(screen.getByLabelText('End date'), {
      target: { value: '2026-10-31' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Apply filters/i }))

    await waitFor(() =>
      expect(overviewMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          from: '2026-10-01',
          to: '2026-10-31',
        }),
        expect.anything(),
      ),
    )
  })

  it('requires a currency before drawing a multi-currency trend', async () => {
    renderPage()
    await screen.findAllByText('Gross product sales')
    fireEvent.click(screen.getByRole('button', { name: 'Revenue trend' }))

    expect(
      await screen.findByText(
        'The trend is available in more than one currency',
      ),
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'USD' }))

    expect(
      await screen.findByText('Revenue Trend'),
    ).toBeTruthy()
    expect(screen.getAllByText('Gross product sales').length).toBeGreaterThan(0)
    expect(
      screen.getByText(/Yearly buckets are not exposed/),
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Monthly' }))
    await waitFor(() =>
      expect(trendMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ granularity: 'month' }),
        expect.anything(),
      ),
    )
  })

  it('uses server pagination and sorting for products', async () => {
    renderPage()
    await screen.findAllByText('Gross product sales')
    fireEvent.click(screen.getByRole('button', { name: 'Products' }))

    expect((await screen.findAllByText('Heavyweight Hoodie')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Mystery Tee').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Cost unknown').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() =>
      expect(productsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 }),
        expect.anything(),
      ),
    )
    expect((await screen.findAllByText('Second Page Tee')).length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: /Units sold/i }))
    await waitFor(() =>
      expect(productsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ sortBy: 'units', sortOrder: 'desc' }),
        expect.anything(),
      ),
    )
  })

  it('switches ranking views and does not rank unknown-cost products as profit', async () => {
    renderPage()
    await screen.findAllByText('Gross product sales')
    fireEvent.click(screen.getByRole('button', { name: 'Rankings' }))

    expect((await screen.findAllByText('Heavyweight Hoodie')).length).toBeGreaterThan(0)
    expect(rankingsMock).toHaveBeenCalledWith(
      expect.objectContaining({ metric: 'units' }),
      expect.anything(),
    )

    fireEvent.click(screen.getByRole('tab', { name: 'Most profitable' }))
    await waitFor(() =>
      expect(rankingsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ metric: 'profit' }),
        expect.anything(),
      ),
    )
    expect(
      await screen.findByText('Not ranked — insufficient cost data'),
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('tab', { name: 'Lowest profit' }))
    await waitFor(() =>
      expect(productsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          sortBy: 'profit',
          sortOrder: 'asc',
          page: 1,
          limit: 10,
        }),
        expect.anything(),
      ),
    )
  })

  it('renders cash reconciliation values from the backend response', async () => {
    renderPage()
    await screen.findAllByText('Gross product sales')
    fireEvent.click(screen.getByRole('button', { name: 'Cash reconciliation' }))

    const cashRegion = await screen.findByRole('region', {
      name: 'Cash reconciliation',
    })
    const cash = within(cashRegion)

    expect(cash.getAllByText('Online cash collected').length).toBeGreaterThan(0)
    expect(cash.getAllByText('COD cash collected').length).toBeGreaterThan(0)
    expect(cash.getAllByText('Delivered but uncollected COD').length).toBeGreaterThan(0)
    expect(cash.getAllByText('Unpaid online orders').length).toBeGreaterThan(0)
    expect(cash.getAllByText(/400\.00/).length).toBeGreaterThan(0)
    expect(cash.getAllByText(/75\.00/).length).toBeGreaterThan(0)
    expect(cash.getAllByText(/120\.00/).length).toBeGreaterThan(0)
    expect(cash.getAllByText('Variance detected').length).toBeGreaterThan(0)
  })
})
