import { useState, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { usePublicProducts } from '@/features/catalogue/usePublicProducts'
import { ProductFiltersSidebar, type FilterState } from '@/components/product/ProductFiltersSidebar'
import { MobileFilterDrawer } from '@/components/product/MobileFilterDrawer'
import { ProductFilterToolbar } from '@/components/product/ProductFilterToolbar'
import { ProductCard } from '@/components/product/ProductCard'
import { ProductGridSkeleton, ProductNotice } from '@/components/product/ProductStates'
import { Action } from '@/components/ui/Action'
import { Marquee } from '@/components/home/Marquee'
import { toUserMessage } from '@/lib/api/errors'
import type { PublicProductSortOption } from '@/types/productsFilter'

export default function ProductsPage() {
  const [params, setParams] = useSearchParams()
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  // Parse filters from URL search params
  const search = params.get('search') ?? ''
  const sortBy = (params.get('sortBy') as PublicProductSortOption) || 'newest'
  const page = Math.max(1, parseInt(params.get('page') || '1', 10) || 1)

  const filters: FilterState = useMemo(() => {
    const minPriceRaw = params.get('minPrice')
    const maxPriceRaw = params.get('maxPrice')
    const inStockRaw = params.get('inStock')

    return {
      category: params.get('category') ?? undefined,
      minPrice: minPriceRaw && !Number.isNaN(Number(minPriceRaw)) ? Number(minPriceRaw) : undefined,
      maxPrice: maxPriceRaw && !Number.isNaN(Number(maxPriceRaw)) ? Number(maxPriceRaw) : undefined,
      size: params.get('size') ?? undefined,
      color: params.get('color') ?? undefined,
      inStock: inStockRaw === 'true' ? true : inStockRaw === 'false' ? false : undefined,
    }
  }, [params])

  // Data fetching hook with abort controller & multi-criteria querying
  const {
    pieces,
    total,
    totalPages,
    filterOptions,
    isLoading,
    isFetching,
    error,
    refetch,
  } = usePublicProducts({
    search: search || undefined,
    category: filters.category,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    size: filters.size,
    color: filters.color,
    inStock: filters.inStock,
    sortBy,
    page,
    limit: 12,
  })

  // URL state modifiers
  const updateQuery = useCallback(
    (updates: Record<string, string | number | boolean | undefined | null>, resetPage = true) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (resetPage) {
            next.delete('page')
          }
          for (const [key, val] of Object.entries(updates)) {
            if (val === undefined || val === null || val === '') {
              next.delete(key)
            } else {
              next.set(key, String(val))
            }
          }
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const handleFilterChange = useCallback(
    (newFilters: Partial<FilterState>) => {
      updateQuery(newFilters, true)
    },
    [updateQuery],
  )

  const handleSearchChange = useCallback(
    (newSearch: string) => {
      updateQuery({ search: newSearch.trim() || undefined }, true)
    },
    [updateQuery],
  )

  const handleSortChange = useCallback(
    (newSort: PublicProductSortOption) => {
      updateQuery({ sortBy: newSort === 'newest' ? undefined : newSort }, true)
    },
    [updateQuery],
  )

  const handleRemoveFilter = useCallback(
    (key: keyof FilterState) => {
      updateQuery({ [key]: undefined }, true)
    },
    [updateQuery],
  )

  const handleClearAll = useCallback(() => {
    setParams({}, { replace: true })
  }, [setParams])

  const handlePageChange = useCallback(
    (newPage: number) => {
      if (newPage < 1 || (totalPages > 0 && newPage > totalPages)) return
      updateQuery({ page: newPage > 1 ? newPage : undefined }, false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [totalPages, updateQuery],
  )

  // Find category display name for active filter chip
  const activeCategoryName = useMemo(() => {
    if (!filters.category) return undefined
    const match = filterOptions.categories.find(
      (c) => c.slug === filters.category || c.id === filters.category,
    )
    return match?.name ?? filters.category
  }, [filters.category, filterOptions.categories])

  const hasAnyFilter = Boolean(
    search ||
      filters.category ||
      filters.minPrice !== undefined ||
      filters.maxPrice !== undefined ||
      filters.size ||
      filters.color ||
      filters.inStock !== undefined,
  )

  return (
    <>
      {/* Editorial Header */}
      <header className="container-editorial pt-28 pb-10 sm:pt-40 sm:pb-14">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-4"
        >
          <span className="h-px w-8 bg-line" aria-hidden />
          <span className="label-micro text-graphite">Full Catalogue — 2026</span>
        </motion.div>

        <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:items-end">
          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.95, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="type-display text-[12vw] leading-[0.84] sm:text-[9vw] lg:col-span-8 lg:text-[8rem]"
          >
            {activeCategoryName ?? 'All Products'}
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.95, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-4 lg:pb-3"
          >
            <p className="max-w-sm text-sm leading-[1.8] text-graphite sm:text-[15px]">
              Explore our complete catalogue of garments, footwear, and accessories. Refined cuts,
              timeless silhouettes, archival materials.
            </p>
            <p className="mt-4 font-mono text-[11px] tracking-[0.14em] text-graphite uppercase">
              {isLoading ? 'Updating…' : `${total} items indexed`} / Filter by cut, size & hue
            </p>
          </motion.div>
        </div>
      </header>

      <Marquee reverse duration={56} className="mb-10 sm:mb-14" />

      {/* Main Content Area */}
      <main className="container-editorial pb-24">
        {/* Toolbar: Search, Sort, Filter Drawer Trigger, Active Chips */}
        <ProductFilterToolbar
          search={search}
          onSearchChange={handleSearchChange}
          sortBy={sortBy}
          onSortChange={handleSortChange}
          totalCount={total}
          displayedCount={pieces.length}
          filters={filters}
          onRemoveFilter={handleRemoveFilter}
          onClearAll={handleClearAll}
          onOpenMobileFilters={() => setMobileDrawerOpen(true)}
          categoryName={activeCategoryName}
        />

        {/* Content Grid Layout: Desktop Sidebar (left) + Product Grid (right) */}
        <div className="mt-8 lg:grid lg:grid-cols-[250px_1fr] lg:gap-10 xl:gap-14">
          {/* Desktop Filter Sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-28">
              <ProductFiltersSidebar
                filterOptions={filterOptions}
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearAll={handleClearAll}
              />
            </div>
          </div>

          {/* Product Cards Column */}
          <div className="min-w-0">
            {/* Error State */}
            {error !== undefined && (
              <ProductNotice
                eyebrow="Catalogue query error"
                title="Could not load products"
                message={toUserMessage(error)}
                action={
                  <Action size="sm" onClick={refetch}>
                    Try again
                  </Action>
                }
              />
            )}

            {/* Loading Initial Skeleton */}
            {!error && isLoading && pieces.length === 0 && (
              <ProductGridSkeleton count={9} columns={3} />
            )}

            {/* Empty State */}
            {!error && !isLoading && pieces.length === 0 && (
              <section className="py-16 text-center">
                <div className="mx-auto max-w-md border border-line bg-paper p-8 sm:p-12">
                  <span className="label-micro text-ash">No exact matches</span>
                  <h2 className="type-display mt-4 text-3xl sm:text-4xl">No products found</h2>
                  <p className="mt-4 text-sm leading-relaxed text-graphite">
                    {hasAnyFilter
                      ? 'No items matched your current filter and search criteria. Try removing some filters or widening your price range.'
                      : 'No products are currently available in the catalogue.'}
                  </p>
                  {hasAnyFilter && (
                    <div className="mt-6 flex justify-center">
                      <Action size="sm" variant="solid" onClick={handleClearAll}>
                        Reset all filters
                      </Action>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Product Grid */}
            {!error && pieces.length > 0 && (
              <div className={`transition-opacity duration-300 ${isFetching ? 'opacity-60' : 'opacity-100'}`}>
                <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 sm:gap-y-14 lg:grid-cols-3">
                  {pieces.map((piece, index) => (
                    <ProductCard
                      key={piece.id}
                      piece={piece}
                      index={index}
                      priority={index < 4}
                    />
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <nav
                    aria-label="Pagination"
                    className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-line pt-8 sm:flex-row"
                  >
                    <p className="font-mono text-xs tracking-[0.1em] text-graphite uppercase">
                      Page <span className="font-bold text-ink">{page}</span> of{' '}
                      <span className="font-bold text-ink">{totalPages}</span>
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page <= 1}
                        className="flex h-10 items-center gap-1.5 border border-line bg-paper px-3 text-[11px] font-semibold tracking-[0.06em] text-ink uppercase transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Previous page"
                      >
                        <ChevronLeft size={14} />
                        <span>Previous</span>
                      </button>

                      {/* Numeric page buttons */}
                      <div className="hidden items-center gap-1 sm:flex">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                          .reduce<(number | 'ellipsis')[]>((acc, cur, idx, arr) => {
                            if (idx > 0 && cur - (arr[idx - 1] as number) > 1) {
                              acc.push('ellipsis')
                            }
                            acc.push(cur)
                            return acc
                          }, [])
                          .map((item, idx) => {
                            if (item === 'ellipsis') {
                              return (
                                <span
                                  key={`ellipsis-${idx}`}
                                  className="px-1 font-mono text-xs text-graphite"
                                >
                                  …
                                </span>
                              )
                            }
                            const isCurrent = item === page
                            return (
                              <button
                                key={item}
                                type="button"
                                onClick={() => handlePageChange(item)}
                                aria-current={isCurrent ? 'page' : undefined}
                                className={`grid size-10 place-items-center font-mono text-xs uppercase transition-colors border ${
                                  isCurrent
                                    ? 'border-ink bg-ink text-paper font-bold'
                                    : 'border-line bg-paper text-ink hover:border-ink'
                                }`}
                              >
                                {item}
                              </button>
                            )
                          })}
                      </div>

                      <button
                        type="button"
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page >= totalPages}
                        className="flex h-10 items-center gap-1.5 border border-line bg-paper px-3 text-[11px] font-semibold tracking-[0.06em] text-ink uppercase transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Next page"
                      >
                        <span>Next</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </nav>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile Slide-in Filter Drawer */}
      <MobileFilterDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        filterOptions={filterOptions}
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearAll={handleClearAll}
        totalResults={total}
      />

      {/* Footer release note */}
      <section className="container-editorial pb-12">
        <div className="flex flex-col gap-4 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md font-mono text-[11px] leading-relaxed tracking-[0.12em] text-graphite uppercase">
            Curated garments and bespoke accessories. All orders are inspected and dispatched directly
            from the studio.
          </p>
          <span className="label-micro text-graphite">Full Release 2026</span>
        </div>
      </section>
    </>
  )
}
