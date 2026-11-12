import { useState } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import type { ProductFilterOptions } from '@/types/productsFilter'

export interface FilterState {
  category?: string
  minPrice?: number
  maxPrice?: number
  size?: string
  color?: string
  inStock?: boolean
}

interface ProductFiltersSidebarProps {
  filterOptions: ProductFilterOptions
  filters: FilterState
  onFilterChange: (newFilters: Partial<FilterState>) => void
  onClearAll: () => void
  className?: string
}

const COMMON_COLOR_MAP: Record<string, string> = {
  black: '#000000',
  white: '#ffffff',
  grey: '#808080',
  gray: '#808080',
  'heather grey': '#9aa0a6',
  'heather gray': '#9aa0a6',
  charcoal: '#36454f',
  navy: '#000080',
  blue: '#2563eb',
  red: '#dc2626',
  green: '#16a34a',
  olive: '#556b2f',
  cream: '#fffdd0',
  beige: '#f5f5dc',
  brown: '#8b4513',
  khaki: '#c3b091',
  sand: '#c2b280',
  tan: '#d2b48c',
  onyx: '#0f0f0f',
  orange: '#ea580c',
  yellow: '#ca8a04',
  pink: '#db2777',
  purple: '#9333ea',
}

function getColorHex(colorName: string): string | undefined {
  const trimmed = colorName.trim().toLowerCase()
  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed)) {
    return trimmed
  }
  return COMMON_COLOR_MAP[trimmed]
}

export function ProductFiltersSidebar({
  filterOptions,
  filters,
  onFilterChange,
  onClearAll,
  className = '',
}: ProductFiltersSidebarProps) {
  const [minPriceInput, setMinPriceInput] = useState<string>(
    filters.minPrice !== undefined ? String(filters.minPrice) : '',
  )
  const [maxPriceInput, setMaxPriceInput] = useState<string>(
    filters.maxPrice !== undefined ? String(filters.maxPrice) : '',
  )
  const [priceError, setPriceError] = useState<string | null>(null)
  const [lastMinPrice, setLastMinPrice] = useState(filters.minPrice)
  const [lastMaxPrice, setLastMaxPrice] = useState(filters.maxPrice)

  if (filters.minPrice !== lastMinPrice || filters.maxPrice !== lastMaxPrice) {
    setLastMinPrice(filters.minPrice)
    setLastMaxPrice(filters.maxPrice)
    setMinPriceInput(filters.minPrice !== undefined ? String(filters.minPrice) : '')
    setMaxPriceInput(filters.maxPrice !== undefined ? String(filters.maxPrice) : '')
  }

  const handlePriceApply = () => {
    const min = minPriceInput.trim() !== '' ? Number(minPriceInput) : undefined
    const max = maxPriceInput.trim() !== '' ? Number(maxPriceInput) : undefined

    if (min !== undefined && (Number.isNaN(min) || min < 0)) {
      setPriceError('Min price must be 0 or greater')
      return
    }
    if (max !== undefined && (Number.isNaN(max) || max < 0)) {
      setPriceError('Max price must be 0 or greater')
      return
    }
    if (min !== undefined && max !== undefined && min > max) {
      setPriceError('Min price must be less than or equal to max price')
      return
    }

    setPriceError(null)
    onFilterChange({ minPrice: min, maxPrice: max })
  }

  const hasActiveFilters = Boolean(
    filters.category ||
      filters.minPrice !== undefined ||
      filters.maxPrice !== undefined ||
      filters.size ||
      filters.color ||
      filters.inStock !== undefined,
  )

  return (
    <aside className={`flex flex-col gap-8 text-ink ${className}`} aria-label="Filters">
      {/* Sidebar Top Header */}
      <div className="flex items-center justify-between border-b border-line pb-4">
        <h2 className="label-micro text-[13px] font-bold tracking-[0.14em] uppercase text-ink">
          Filters
        </h2>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearAll}
            className="group flex items-center gap-1.5 font-mono text-[11px] tracking-[0.08em] text-graphite hover:text-ink transition-colors uppercase"
          >
            <RotateCcw size={12} className="transition-transform group-hover:-rotate-90" />
            Reset all
          </button>
        )}
      </div>

      {/* 1. Category Filter */}
      {filterOptions.categories.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="label-micro font-bold text-graphite uppercase">Category</p>
          <div className="flex flex-col gap-2">
            {filterOptions.categories.map((cat) => {
              const isChecked = filters.category === cat.slug || filters.category === cat.id
              return (
                <label
                  key={cat.id}
                  className="group flex cursor-pointer items-center justify-between py-1 text-sm transition-colors hover:text-ink"
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        onFilterChange({ category: isChecked ? undefined : cat.slug })
                      }}
                      className="sr-only"
                    />
                    <span
                      aria-hidden
                      className={`grid size-4 place-items-center border transition-colors ${
                        isChecked
                          ? 'border-ink bg-ink text-paper'
                          : 'border-line bg-paper group-hover:border-ink'
                      }`}
                    >
                      {isChecked && <Check size={11} strokeWidth={2.5} />}
                    </span>
                    <span
                      className={`text-[13px] transition-colors ${
                        isChecked ? 'font-semibold text-ink' : 'text-graphite group-hover:text-ink'
                      }`}
                    >
                      {cat.name}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] tabular-nums text-graphite/70">
                    {cat.count}
                  </span>
                </label>
              )
            })}
          </div>
        </div>
      )}

      {/* 2. Price Range Filter */}
      <div className="flex flex-col gap-3 border-t border-line/60 pt-6">
        <div className="flex items-baseline justify-between">
          <p className="label-micro font-bold text-graphite uppercase">Price Range ($)</p>
          {filterOptions.priceRange.max > 0 && (
            <span className="font-mono text-[11px] text-graphite/70">
              ${Math.floor(filterOptions.priceRange.min)} – ${Math.ceil(filterOptions.priceRange.max)}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="min-price-input" className="sr-only">
              Minimum Price
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-2.5 font-mono text-xs text-graphite">$</span>
              <input
                id="min-price-input"
                type="number"
                min="0"
                placeholder="Min"
                value={minPriceInput}
                onChange={(e) => {
                  setMinPriceInput(e.target.value)
                  setPriceError(null)
                }}
                onKeyDown={(e) => e.key === 'Enter' && handlePriceApply()}
                className="w-full border border-line bg-paper pl-6 pr-2 py-1.5 font-mono text-[13px] text-ink placeholder:text-graphite/50 focus:border-ink focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label htmlFor="max-price-input" className="sr-only">
              Maximum Price
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-2.5 font-mono text-xs text-graphite">$</span>
              <input
                id="max-price-input"
                type="number"
                min="0"
                placeholder="Max"
                value={maxPriceInput}
                onChange={(e) => {
                  setMaxPriceInput(e.target.value)
                  setPriceError(null)
                }}
                onKeyDown={(e) => e.key === 'Enter' && handlePriceApply()}
                className="w-full border border-line bg-paper pl-6 pr-2 py-1.5 font-mono text-[13px] text-ink placeholder:text-graphite/50 focus:border-ink focus:outline-none"
              />
            </div>
          </div>
        </div>

        {priceError && (
          <p className="font-mono text-[11px] text-warning" role="alert">
            {priceError}
          </p>
        )}

        <button
          type="button"
          onClick={handlePriceApply}
          className="mt-1 flex h-8 items-center justify-center border border-line bg-bone text-[11px] font-semibold tracking-[0.08em] text-ink uppercase transition-colors hover:border-ink hover:bg-ink hover:text-paper"
        >
          Apply Price
        </button>
      </div>

      {/* 3. Size Filter */}
      {filterOptions.sizes.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-line/60 pt-6">
          <div className="flex items-baseline justify-between">
            <p className="label-micro font-bold text-graphite uppercase">Size</p>
            {filters.size && (
              <button
                type="button"
                onClick={() => onFilterChange({ size: undefined })}
                className="font-mono text-[10px] text-graphite hover:text-ink uppercase underline"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {filterOptions.sizes.map((s) => {
              const isSelected = filters.size?.toLowerCase() === s.toLowerCase()
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => onFilterChange({ size: isSelected ? undefined : s })}
                  aria-pressed={isSelected}
                  className={`min-w-9 h-8 px-2 font-mono text-[11px] tracking-[0.06em] uppercase transition-all duration-200 border ${
                    isSelected
                      ? 'border-ink bg-ink text-paper font-bold'
                      : 'border-line bg-paper text-ink hover:border-ink'
                  }`}
                >
                  {s}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* 4. Color Filter */}
      {filterOptions.colors.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-line/60 pt-6">
          <div className="flex items-baseline justify-between">
            <p className="label-micro font-bold text-graphite uppercase">Color</p>
            {filters.color && (
              <button
                type="button"
                onClick={() => onFilterChange({ color: undefined })}
                className="font-mono text-[10px] text-graphite hover:text-ink uppercase underline"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {filterOptions.colors.map((c) => {
              const isSelected = filters.color?.toLowerCase() === c.toLowerCase()
              const hex = getColorHex(c)
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => onFilterChange({ color: isSelected ? undefined : c })}
                  title={c}
                  aria-label={`Filter by color ${c}`}
                  aria-pressed={isSelected}
                  className={`group flex items-center gap-1.5 border px-2.5 py-1 text-[11px] font-mono tracking-[0.04em] uppercase transition-all ${
                    isSelected
                      ? 'border-ink bg-ink text-paper font-semibold'
                      : 'border-line bg-paper text-ink hover:border-ink'
                  }`}
                >
                  {hex ? (
                    <span
                      aria-hidden
                      className="size-3 shrink-0 rounded-full border border-black/10"
                      style={{ backgroundColor: hex }}
                    />
                  ) : (
                    <span aria-hidden className="size-2 shrink-0 rounded-full bg-graphite" />
                  )}
                  <span>{c}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* 5. Availability Filter */}
      <div className="flex flex-col gap-3 border-t border-line/60 pt-6">
        <p className="label-micro font-bold text-graphite uppercase">Availability</p>
        <div className="flex flex-col gap-2">
          <label className="group flex cursor-pointer items-center gap-2.5 py-1">
            <input
              type="checkbox"
              checked={filters.inStock === true}
              onChange={() => {
                onFilterChange({ inStock: filters.inStock === true ? undefined : true })
              }}
              className="sr-only"
            />
            <span
              aria-hidden
              className={`grid size-4 place-items-center border transition-colors ${
                filters.inStock === true
                  ? 'border-ink bg-ink text-paper'
                  : 'border-line bg-paper group-hover:border-ink'
              }`}
            >
              {filters.inStock === true && <Check size={11} strokeWidth={2.5} />}
            </span>
            <span
              className={`text-[13px] transition-colors ${
                filters.inStock === true ? 'font-semibold text-ink' : 'text-graphite group-hover:text-ink'
              }`}
            >
              In Stock only
            </span>
          </label>

          <label className="group flex cursor-pointer items-center gap-2.5 py-1">
            <input
              type="checkbox"
              checked={filters.inStock === false}
              onChange={() => {
                onFilterChange({ inStock: filters.inStock === false ? undefined : false })
              }}
              className="sr-only"
            />
            <span
              aria-hidden
              className={`grid size-4 place-items-center border transition-colors ${
                filters.inStock === false
                  ? 'border-ink bg-ink text-paper'
                  : 'border-line bg-paper group-hover:border-ink'
              }`}
            >
              {filters.inStock === false && <Check size={11} strokeWidth={2.5} />}
            </span>
            <span
              className={`text-[13px] transition-colors ${
                filters.inStock === false ? 'font-semibold text-ink' : 'text-graphite group-hover:text-ink'
              }`}
            >
              Out of Stock only
            </span>
          </label>
        </div>
      </div>
    </aside>
  )
}
