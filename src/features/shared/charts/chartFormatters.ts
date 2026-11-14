import { formatMoney } from '@/lib/money'
import { formatCount, formatCompactMoney, formatPeriodLabel, formatPeriodFullLabel } from '@/features/finance/utils'
import type { FinanceTrendGranularity } from '@/types/api'

function toMoneyString(value: number): string {
  return value.toFixed(2)
}

export function formatRevenueTooltipValue(value: number, currency: string): string {
  return formatMoney(toMoneyString(value), currency)
}

export function formatOrdersTooltipValue(value: number): string {
  return formatCount(value)
}

export function formatRevenueAxisValue(value: number, currency: string): string {
  return formatCompactMoney(value, currency)
}

export function formatOrdersAxisValue(value: number): string {
  return formatCount(value)
}

export function formatPeriodAxisLabel(period: string, granularity: FinanceTrendGranularity): string {
  return formatPeriodLabel(period, granularity)
}

export function formatPeriodTooltipLabel(period: string, granularity: FinanceTrendGranularity): string {
  return formatPeriodFullLabel(period, granularity)
}

export const CHART_COLORS = {
  revenue: 'var(--color-finance-net)',
  orders: 'var(--color-finance-profit)',
  grossSales: 'var(--color-finance-revenue)',
  productDiscounts: 'var(--color-finance-discount)',
  netProductRevenue: 'var(--color-finance-net)',
  shippingRevenue: 'var(--color-finance-shipping)',
  cogs: 'var(--color-finance-cogs)',
  grossProfit: 'var(--color-finance-profit)',
  online: 'var(--color-finance-net)',
  cod: 'var(--color-finance-shipping)',
} as const

export const CHART_METRIC_LABELS: Record<string, string> = {
  revenue: 'Revenue',
  orders: 'Orders',
  grossSales: 'Gross product sales',
  productDiscounts: 'Product discounts',
  netProductRevenue: 'Net product revenue',
  shippingRevenue: 'Shipping revenue',
  cogs: 'COGS',
  grossProfit: 'Known-cost gross profit',
  online: 'ABA PayWay',
  cod: 'COD',
}