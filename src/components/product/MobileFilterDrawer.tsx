import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, SlidersHorizontal } from 'lucide-react'
import { ProductFiltersSidebar, type FilterState } from './ProductFiltersSidebar'
import type { ProductFilterOptions } from '@/types/productsFilter'
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll'

interface MobileFilterDrawerProps {
  isOpen: boolean
  onClose: () => void
  filterOptions: ProductFilterOptions
  filters: FilterState
  onFilterChange: (newFilters: Partial<FilterState>) => void
  onClearAll: () => void
  totalResults: number
}

export function MobileFilterDrawer({
  isOpen,
  onClose,
  filterOptions,
  filters,
  onFilterChange,
  onClearAll,
  totalResults,
}: MobileFilterDrawerProps) {
  useLockBodyScroll(isOpen)

  useEffect(() => {
    if (!isOpen) return undefined
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-90 lg:hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="absolute inset-0 bg-ink/40 backdrop-blur-xs"
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label="Product Filters"
            className="absolute inset-y-0 left-0 flex w-full max-w-xs sm:max-w-sm flex-col bg-paper shadow-2xl"
          >
            {/* Header */}
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-5">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={16} className="text-ink" />
                <span className="text-[14px] font-bold tracking-[0.08em] uppercase text-ink">
                  Filters
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close filters"
                className="grid size-10 place-items-center text-ink transition-colors hover:bg-bone"
              >
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-6">
              <ProductFiltersSidebar
                filterOptions={filterOptions}
                filters={filters}
                onFilterChange={onFilterChange}
                onClearAll={onClearAll}
              />
            </div>

            {/* Footer Buttons */}
            <div className="shrink-0 border-t border-line bg-bone/50 p-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onClearAll}
                className="flex h-11 items-center justify-center border border-line bg-paper text-[12px] font-semibold tracking-[0.08em] uppercase text-graphite hover:text-ink transition-colors"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex h-11 items-center justify-center bg-ink text-[12px] font-semibold tracking-[0.08em] uppercase text-paper hover:bg-ink-soft transition-colors"
              >
                View ({totalResults})
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
