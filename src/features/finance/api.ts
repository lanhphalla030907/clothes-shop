import { apiGetOne } from '@/lib/api/client'
import { API } from '@/lib/api/config'
import type {
  CashReconciliationQuery,
  CashReconciliationResponse,
  FinanceDateRangeQuery,
  FinanceOverviewResponse,
  FinanceQuery,
  ProductProfitQuery,
  ProductProfitResponse,
  ProductRankingsResponse,
  RankingsQuery,
  RevenueTrendQuery,
  RevenueTrendResponse,
} from '@/types/api'

/**
 * Typed calls to the read-only admin finance API.
 *
 * The backend validates its query objects strictly, so this module sends only
 * the parameters each endpoint documents. In particular, `basis` is omitted
 * from cash reconciliation, which measures cash by when it moved and does not
 * accept a recognition basis.
 */

const rangeQuery = (query: FinanceDateRangeQuery) => ({
  from: query.from,
  to: query.to,
  currency: query.currency,
})

export const fetchFinanceOverview = (
  query: FinanceQuery,
  signal?: AbortSignal,
): Promise<FinanceOverviewResponse> =>
  apiGetOne<FinanceOverviewResponse>(`${API.adminFinance}/overview`, {
    signal,
    query: { ...rangeQuery(query), basis: query.basis },
  })

export const fetchFinanceRevenueTrend = (
  query: RevenueTrendQuery,
  signal?: AbortSignal,
): Promise<RevenueTrendResponse> =>
  apiGetOne<RevenueTrendResponse>(`${API.adminFinance}/revenue-trend`, {
    signal,
    query: {
      ...rangeQuery(query),
      basis: query.basis,
      granularity: query.granularity,
    },
  })

export const fetchFinanceProducts = (
  query: ProductProfitQuery,
  signal?: AbortSignal,
): Promise<ProductProfitResponse> =>
  apiGetOne<ProductProfitResponse>(`${API.adminFinance}/products`, {
    signal,
    query: {
      ...rangeQuery(query),
      basis: query.basis,
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    },
  })

export const fetchFinanceRankings = (
  query: RankingsQuery,
  signal?: AbortSignal,
): Promise<ProductRankingsResponse> =>
  apiGetOne<ProductRankingsResponse>(`${API.adminFinance}/rankings`, {
    signal,
    query: {
      ...rangeQuery(query),
      basis: query.basis,
      metric: query.metric,
      limit: query.limit,
    },
  })

export const fetchFinanceCashReconciliation = (
  query: CashReconciliationQuery,
  signal?: AbortSignal,
): Promise<CashReconciliationResponse> =>
  apiGetOne<CashReconciliationResponse>(
    `${API.adminFinance}/cash-reconciliation`,
    {
      signal,
      // No `basis`: the endpoint does not accept it.
      query: rangeQuery(query),
    },
  )
