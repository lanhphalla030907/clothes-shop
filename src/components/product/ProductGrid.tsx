import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ProductCard } from './ProductCard'
import { padIndex } from '@/lib/format'
import type { CataloguePiece, CategoryFilter } from '@/types'

interface ProductGridProps {
  pieces: CataloguePiece[]
  /** Names to offer in the filter row, in the order the catalogue lists them. */
  categories: string[]
  /** Enables the category filter row. */
  filterable?: boolean
  /** Optional externally controlled filter (used by the shop page URL). */
  activeFilter?: CategoryFilter
  onFilterChange?: (filter: CategoryFilter) => void
  columns?: 2 | 3 | 4
}

const columnClass: Record<NonNullable<ProductGridProps['columns']>, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
}

/**
 * Editorial catalogue grid with an underline filter row. Layouts reflow by
 * column count rather than shrinking the desktop arrangement.
 */
export function ProductGrid({
  pieces,
  categories,
  filterable = false,
  activeFilter,
  onFilterChange,
  columns = 3,
}: ProductGridProps) {
  const [internalFilter, setInternalFilter] = useState<CategoryFilter>('All')
  const current = activeFilter ?? internalFilter

  const visible = useMemo(
    () => (current === 'All' ? pieces : pieces.filter((piece) => piece.category === current)),
    [current, pieces],
  )

  const select = (filter: CategoryFilter) => {
    if (onFilterChange) onFilterChange(filter)
    else setInternalFilter(filter)
  }

  return (
    <div>
      {filterable && (
        <div className="container-editorial mb-10 sm:mb-14">
          <div className="no-scrollbar -mx-5 flex gap-6 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:gap-8 sm:px-0">
            {(['All', ...categories] as CategoryFilter[]).map((filter) => {
              const isActive = current === filter
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => select(filter)}
                  aria-pressed={isActive}
                  className="label-micro group relative shrink-0 pb-2 transition-colors duration-400 ease-editorial"
                >
                  <span className={isActive ? 'text-ink' : 'text-ash group-hover:text-graphite'}>
                    {filter}
                  </span>
                  <span
                    className={`absolute inset-x-0 bottom-0 h-px origin-left bg-ink transition-transform duration-500 ease-editorial ${
                      isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                    }`}
                  />
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="container-editorial">
        <motion.div layout className={`grid gap-x-4 gap-y-12 sm:gap-x-6 sm:gap-y-16 ${columnClass[columns]}`}>
          <AnimatePresence mode="popLayout">
            {visible.map((piece, index) => (
              <ProductCard key={piece.id} piece={piece} index={index} priority={index < 3} />
            ))}
          </AnimatePresence>
        </motion.div>

        {visible.length === 0 && (
          <p className="py-24 text-center font-mono text-[11px] tracking-[0.16em] text-ash uppercase">
            Nothing in this category yet
          </p>
        )}
      </div>

      {visible.length > 0 && (
        <p className="container-editorial mt-14 font-mono text-[10px] tracking-[0.16em] text-ash uppercase">
          Showing {padIndex(0)}—{padIndex(visible.length - 1)} / {padIndex(pieces.length)}
        </p>
      )}
    </div>
  )
}
