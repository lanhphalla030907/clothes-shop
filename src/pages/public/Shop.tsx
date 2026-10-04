import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ProductGrid } from '@/components/product/ProductGrid'
import { Marquee } from '@/components/home/Marquee'
import { products, categories } from '@/data/products'
import type { CategoryFilter } from '@/types'

const isFilter = (value: string | null): value is CategoryFilter =>
  value === 'All' || (categories as string[]).includes(value ?? '')

/** The collection. Filter state lives in the URL so views are shareable. */
export default function Shop() {
  const [params, setParams] = useSearchParams()
  const raw = params.get('category')
  const active: CategoryFilter = isFilter(raw) ? raw : 'All'

  const heading = useMemo(
    () => (active === 'All' ? 'The Collection' : active),
    [active],
  )

  const changeFilter = (filter: CategoryFilter) => {
    if (filter === 'All') setParams({}, { replace: true })
    else setParams({ category: filter }, { replace: true })
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
            {heading}
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
              {products.length} pieces / Free shipping over $500
            </p>
          </motion.div>
        </div>
      </header>

      <Marquee reverse duration={54} className="mb-14 sm:mb-20" />

      <ProductGrid
        products={products}
        filterable
        activeFilter={active}
        onFilterChange={changeFilter}
        columns={3}
      />

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
