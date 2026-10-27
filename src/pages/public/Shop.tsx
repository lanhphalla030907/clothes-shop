import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ProductGrid } from '@/components/product/ProductGrid'
import { ProductGridSkeleton, ProductNotice } from '@/components/product/ProductStates'
import { Action } from '@/components/ui/Action'
import { Marquee } from '@/components/home/Marquee'
import { useCategories, useCollection } from '@/features/catalogue/useCatalogue'
import { toUserMessage } from '@/lib/api/errors'
import type { CategoryFilter } from '@/types'

/** The collection. Filter state lives in the URL so views are shareable. */
export default function Shop() {
  const [params, setParams] = useSearchParams()
  const collection = useCollection()
  const categoryResource = useCategories()

  const pieces = useMemo(() => collection.data ?? [], [collection.data])
  const categories = categoryResource.data

  // Only categories that actually hold something are offered, so the row can
  // never lead to a dead end.
  const categoryNames = useMemo(() => {
    const stocked = new Set(pieces.map((piece) => piece.category).filter(Boolean))
    return (categories ?? []).map((category) => category.name).filter((name) => stocked.has(name))
  }, [pieces, categories])

  // The URL carries the slug, because that is the stable name for a category;
  // the grid filters on the printed name, because that is all a card carries.
  const activeSlug = params.get('category')
  const active = categories?.find((category) => category.slug === activeSlug)

  const changeFilter = (filter: CategoryFilter) => {
    if (filter === 'All') {
      setParams({}, { replace: true })
      return
    }

    const match = categories?.find((category) => category.name === filter)
    if (match) setParams({ category: match.slug }, { replace: true })
  }

  return (
    <>
      {/* Page header */}
      <header className="container-editorial pt-28 pb-12 sm:pt-40 sm:pb-16">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-4"
        >
          <span className="h-px w-8 bg-line" aria-hidden />
          <span className="label-micro text-graphite">Release 01 — June 2026</span>
        </motion.div>

        <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:items-end">
          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.95, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="type-display text-[15vw] leading-[0.82] sm:text-[10vw] lg:col-span-8 lg:text-[9rem]"
          >
            {active?.name ?? 'The Collection'}
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.95, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-4 lg:pb-3"
          >
            <p className="max-w-sm text-sm leading-[1.8] text-graphite sm:text-[15px]">
              Essentials for the new era. Ten pieces, drafted once and archived when the run
              ends.
            </p>
            <p className="mt-5 font-mono text-[10px] tracking-[0.14em] text-ash uppercase">
              {collection.isLoading ? 'Loading' : pieces.length} pieces / Free shipping over $500
            </p>
          </motion.div>
        </div>
      </header>

      <Marquee reverse duration={54} className="mb-14 sm:mb-20" />

      {collection.error !== undefined && (
        <ProductNotice
          eyebrow="The catalogue did not load"
          title="Nothing to show"
          message={toUserMessage(collection.error)}
          action={
            <Action size="sm" onClick={collection.refetch}>
              Try again
            </Action>
          }
        />
      )}

      {!collection.error && collection.isLoading && (
        <div className="container-editorial">
          <ProductGridSkeleton />
        </div>
      )}

      {!collection.error && !collection.isLoading && pieces.length === 0 && (
        <ProductNotice
          eyebrow={active ? active.name : 'The collection'}
          title="Nothing here yet"
          message={
            active
              ? 'No pieces are published in this category. The rest of the collection is still open.'
              : 'The studio has not published anything yet. The next release is being drafted.'
          }
        />
      )}

      {!collection.error && !collection.isLoading && pieces.length > 0 && (
        <ProductGrid
          pieces={pieces}
          categories={categoryNames}
          filterable
          activeFilter={active?.name}
          onFilterChange={changeFilter}
          columns={3}
        />
      )}

      {/* Closing note */}
      <section className="container-editorial pt-20 pb-4 sm:pt-28">
        <div className="flex flex-col gap-4 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md font-mono text-[10px] leading-relaxed tracking-[0.12em] text-ash uppercase">
            Every piece is cut in limited numbers. Once a run closes it moves to the archive.
          </p>
          <span className="label-micro text-graphite">End of release</span>
        </div>
      </section>
    </>
  )
}
