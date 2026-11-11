import { useCallback, useEffect, useState } from 'react'
import {
  LayoutDashboard,
  Package,
  Trophy,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { fetchFinanceOverview } from '@/features/finance/api'
import { CashReconciliationSection } from '@/features/finance/components/CashReconciliationSection'
import { FinanceFilters } from '@/features/finance/components/FinanceFilters'
import { FinanceOverviewSection } from '@/features/finance/components/FinanceOverviewSection'
import { ProductProfitSection } from '@/features/finance/components/ProductProfitSection'
import { ProductRankingsSection } from '@/features/finance/components/ProductRankingsSection'
import { RevenueTrendSection } from '@/features/finance/components/RevenueTrendSection'
import { useFinanceFilters } from '@/features/finance/hooks/useFinanceFilters'
import {
  FINANCE_SECTIONS,
  isFinanceSection,
  type FinanceSection,
} from '@/features/finance/utils'

const SECTION_ICONS: Record<FinanceSection, LucideIcon> = {
  overview: LayoutDashboard,
  trend: TrendingUp,
  products: Package,
  rankings: Trophy,
  cash: Wallet,
}
export default function FinanceDashboard() {
  const { params, setParams, filters, applyFilters, resetFilters, setCurrency } =
    useFinanceFilters()

  const overview = useAsyncResource(
    (signal) => fetchFinanceOverview(filters, signal),
    [filters],
  )

  const [knownCurrencies, setKnownCurrencies] = useState<readonly string[]>([])
  const registerCurrencies = useCallback(
    (currencies: readonly string[]) => {
      setKnownCurrencies((current) => {
        const next = new Set(current)
        for (const currency of currencies) {
          if (currency) next.add(currency.toUpperCase())
        }
        if (filters.currency) next.add(filters.currency)
        const sorted = Array.from(next).sort()
        return sorted.length === current.length &&
          sorted.every((currency, index) => currency === current[index])
          ? current
          : sorted
      })
    },
    [filters.currency],
  )

  useEffect(() => {
    if (!overview.data) return
    const currencies = [
      ...overview.data.byCurrency.map((row) => row.currency),
      ...overview.data.cashByCurrency.map((row) => row.currency),
    ]
    // Only register if currencies actually changed
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Register currencies from API response; registerCurrencies uses functional update
    registerCurrencies(currencies)
  }, [overview.data, registerCurrencies])

  const viewParam = params.get('view')
  const activeSection: FinanceSection = isFinanceSection(viewParam)
    ? viewParam
    : 'overview'

  const [visited, setVisited] = useState<ReadonlySet<FinanceSection>>(
    () => new Set([activeSection]),
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Track visited sections; functional update prevents cascading renders
    setVisited((current) => {
      if (current.has(activeSection)) return current
      const next = new Set(current)
      next.add(activeSection)
      return next
    })
  }, [activeSection])

  const changeSection = (section: FinanceSection) => {
    const updated = new URLSearchParams(params)
    if (section === 'overview') updated.delete('view')
    else updated.set('view', section)
    setParams(updated, { replace: true })
  }

  return (
    <div className="space-y-7">
      <AdminPageHeader
        eyebrow="Finance"
        title="Finance & profit"
        description="Revenue, known-cost profit and cash movement in the reporting timezone. Amounts are separated by currency and are never converted or combined."
      />

      <FinanceFilters
        filters={filters}
        currencyOptions={knownCurrencies}
        range={overview.data?.range}
        onApply={applyFilters}
        onReset={resetFilters}
      />

      <nav
        aria-label="Finance sections"
        className="flex flex-wrap gap-1.5 border-b border-line pb-3"
      >
        {FINANCE_SECTIONS.map((section) => {
          const Icon = SECTION_ICONS[section.value]
          const active = activeSection === section.value
          return (
            <button
              key={section.value}
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => changeSection(section.value)}
              className={`inline-flex min-h-9 items-center gap-2 rounded-lg border px-3.5 text-[12px] font-medium transition-all duration-200 ${
                active
                  ? 'border-ink bg-ink text-paper shadow-sm'
                  : 'border-transparent text-graphite hover:border-line hover:bg-bone hover:text-ink'
              }`}
            >
              <Icon size={15} strokeWidth={1.8} aria-hidden />
              {section.label}
            </button>
          )
        })}
      </nav>

      <div>
        {visited.has('overview') && (
          <div hidden={activeSection !== 'overview'}>
            <FinanceOverviewSection
              overview={overview.data}
              isLoading={overview.isLoading}
              isRefreshing={overview.isRefreshing}
              error={overview.error}
              onRetry={overview.refetch}
              onOpenCash={() => changeSection('cash')}
              onCurrencies={registerCurrencies}
            />
          </div>
        )}

        {visited.has('trend') && (
          <div hidden={activeSection !== 'trend'}>
            <RevenueTrendSection
              filters={filters}
              params={params}
              setParams={setParams}
              onCurrencyChange={setCurrency}
              onCurrencies={registerCurrencies}
            />
          </div>
        )}

        {visited.has('products') && (
          <div hidden={activeSection !== 'products'}>
            <ProductProfitSection
              filters={filters}
              params={params}
              setParams={setParams}
              onCurrencies={registerCurrencies}
            />
          </div>
        )}

        {visited.has('rankings') && (
          <div hidden={activeSection !== 'rankings'}>
            <ProductRankingsSection
              filters={filters}
              params={params}
              setParams={setParams}
              onCurrencies={registerCurrencies}
            />
          </div>
        )}

        {visited.has('cash') && (
          <div hidden={activeSection !== 'cash'}>
            <CashReconciliationSection
              filters={filters}
              onCurrencies={registerCurrencies}
            />
          </div>
        )}
      </div>
    </div>
  )
}
