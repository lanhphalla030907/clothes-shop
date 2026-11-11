import { useEffect, useState } from 'react'
import { Search, X, SlidersHorizontal, ArrowUpDown } from 'lucide-react'
import type { PublicProductSortOption } from '@/types/productsFilter'
import type { FilterState } from './ProductFiltersSidebar'

interface ProductFilterToolbarProps {
  search: string
  onSearchChange: (search: string) => void
  sortBy: PublicProductSortOption
  onSortChange: (sortBy: PublicProductSortOption) => void
  totalCount: number
  displayedCount: number
  filters: FilterState
  onRemoveFilter: (key: keyof FilterState) => void
  onClearAll: () => void
  onOpenMobileFilters: () => void
  categoryName?: string
}

const SORT_LABELS: Record<PublicProductSortOption, string> = {
  newest: 'Newest Arrivals',
  price_asc: 'Price: Low to High',
  price_desc: 'Price: High to Low',
  best_selling: 'Best Selling',
}

export function ProductFilterToolbar({
  search,
  onSearchChange,
  sortBy,
  onSortChange,
  totalCount,
  displayedCount,
  filters,
  onRemoveFilter,
  onClearAll,
  onOpenMobileFilters,
  categoryName,
}: ProductFilterToolbarProps) {
  const [searchInput, setSearchInput] = useState(search)

  // Sync internal search input if external search prop changes
  useEffect(() => {
    setSearchInput(search)
  }, [search])

  // Debounce search update to parent
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchInput !== search) {
        onSearchChange(searchInput)
      }
    }, 300)

    return () => clearTimeout(handler)
  }, [searchInput, search, onSearchChange])

  // Active filter count for mobile badge
  const activeFilterCount = [
    filters.category,
    filters.minPrice !== undefined || filters.maxPrice !== undefined ? true : undefined,
    filters.size,
    filters.color,
    filters.inStock !== undefined ? true : undefined,
    search ? true : undefined,
  ].filter(Boolean).length

  return (
    <div className="flex flex-col gap-4 border-b border-line pb-5">
      {/* Upper row: Search, Filter toggle (mobile), Sort, Count */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <label htmlFor="products-search-input" className="sr-only">
            Search products
          </label>
          <Search
            size={16}
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-graphite"
          />
          <input
            id="products-search-input"
            type="text"
            placeholder="Search piece, color, cut..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full border border-line bg-paper py-2.5 pl-9 pr-8 text-[13px] text-ink placeholder:text-graphite/50 transition-colors focus:border-ink focus:outline-none"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('')
                onSearchChange('')
              }}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-graphite hover:text-ink transition-colors"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Right Controls: Mobile Filter Button & Sort Dropdown */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Filter Trigger Button */}
          <button
            type="button"
            data-testid="mobile-filters-trigger"
            aria-label="Open mobile filters"
            onClick={onOpenMobileFilters}
            className="flex h-10 items-center gap-2 border border-line bg-paper px-3 text-[12px] font-semibold tracking-[0.06em] text-ink uppercase transition-colors hover:border-ink lg:hidden"
          >
            <SlidersHorizontal size={14} />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="grid size-5 place-items-center bg-ink font-mono text-[10px] text-paper">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Sort Dropdown */}
          <div className="relative flex items-center">
            <label htmlFor="products-sort-select" className="sr-only">
              Sort by
            </label>
            <div className="pointer-events-none absolute left-3 text-graphite">
              <ArrowUpDown size={13} />
            </div>
            <select
              id="products-sort-select"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as PublicProductSortOption)}
              className="h-10 cursor-pointer appearance-none border border-line bg-paper pl-8 pr-8 text-[12px] font-semibold tracking-[0.04em] text-ink uppercase transition-colors hover:border-ink focus:border-ink focus:outline-none"
            >
              {Object.entries(SORT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <span
              aria-hidden
              className="pointer-events-none absolute right-3 text-graphite text-[10px]"
            >
              ▼
            </span>
          </div>
        </div>
      </div>

      {/* Lower row: Result count and Active filter chips */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <p className="font-mono text-[11px] tracking-[0.1em] text-graphite uppercase">
          {totalCount === 0
            ? '0 pieces'
            : displayedCount === totalCount
            ? `All ${totalCount} pieces`
            : `Showing ${displayedCount} of ${totalCount} pieces`}
        </p>

        {/* Active Filter Chips */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {search && (
              <span className="inline-flex items-center gap-1 border border-line bg-bone px-2 py-0.5 font-mono text-[11px] text-ink uppercase">
                Search: "{search}"
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('')
                    onSearchChange('')
                  }}
                  aria-label="Remove search filter"
                  className="hover:text-warning"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {filters.category && (
              <span className="inline-flex items-center gap-1 border border-line bg-bone px-2 py-0.5 font-mono text-[11px] text-ink uppercase">
                Category: {categoryName || filters.category}
                <button
                  type="button"
                  onClick={() => onRemoveFilter('category')}
                  aria-label="Remove category filter"
                  className="hover:text-warning"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {(filters.minPrice !== undefined || filters.maxPrice !== undefined) && (
              <span className="inline-flex items-center gap-1 border border-line bg-bone px-2 py-0.5 font-mono text-[11px] text-ink uppercase">
                Price: ${filters.minPrice ?? 0}–${filters.maxPrice ?? '∞'}
                <button
                  type="button"
                  onClick={() => {
                    onRemoveFilter('minPrice')
                    onRemoveFilter('maxPrice')
                  }}
                  aria-label="Remove price filter"
                  className="hover:text-warning"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {filters.size && (
              <span className="inline-flex items-center gap-1 border border-line bg-bone px-2 py-0.5 font-mono text-[11px] text-ink uppercase">
                Size: {filters.size}
                <button
                  type="button"
                  onClick={() => onRemoveFilter('size')}
                  aria-label="Remove size filter"
                  className="hover:text-warning"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {filters.color && (
              <span className="inline-flex items-center gap-1 border border-line bg-bone px-2 py-0.5 font-mono text-[11px] text-ink uppercase">
                Color: {filters.color}
                <button
                  type="button"
                  onClick={() => onRemoveFilter('color')}
                  aria-label="Remove color filter"
                  className="hover:text-warning"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {filters.inStock !== undefined && (
              <span className="inline-flex items-center gap-1 border border-line bg-bone px-2 py-0.5 font-mono text-[11px] text-ink uppercase">
                {filters.inStock ? 'In Stock' : 'Out of Stock'}
                <button
                  type="button"
                  onClick={() => onRemoveFilter('inStock')}
                  aria-label="Remove availability filter"
                  className="hover:text-warning"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={onClearAll}
              className="font-mono text-[11px] text-graphite hover:text-ink underline ml-1 uppercase"
            >
              Clear all
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
