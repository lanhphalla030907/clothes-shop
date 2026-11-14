import { FinanceRevenueTrendChart } from '@/features/shared/charts'
import type {
  FinanceRangeResponse,
  FinanceTrendGranularity,
  RevenueTrendBucket,
} from '@/types/api'

interface RevenueTrendChartProps {
  buckets: readonly RevenueTrendBucket[]
  currency: string
  granularity: FinanceTrendGranularity
  range?: FinanceRangeResponse
  timezone?: string
}

export function RevenueTrendChart({
  buckets,
  currency,
  granularity,
}: RevenueTrendChartProps) {
  return (
    <FinanceRevenueTrendChart
      buckets={buckets}
      currency={currency}
      granularity={granularity}
      height={340}
    />
  )
}