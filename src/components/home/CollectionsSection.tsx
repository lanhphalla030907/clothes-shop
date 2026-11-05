import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { Reveal } from '@/components/ui/Reveal'
import { SmartImage } from '@/components/ui/SmartImage'
import { useCollections } from '@/features/collections/useCollections'

/** The homepage receives at most three active rows from the API. */
export function CollectionsSection() {
  const resource = useCollections(3)
  const collections = resource.data ?? []

  if (!resource.isLoading && (resource.error !== undefined || collections.length === 0)) return null

  return (
    <section
      className="container-editorial py-12 sm:py-16"
      aria-labelledby="collections-heading"
    >
      {/* Header — split layout, compact, matches other sections */}
      <Reveal>
        <div className="flex flex-col gap-5 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-6 bg-line" aria-hidden />
              <span className="label-micro text-graphite">Curated edits</span>
            </div>
            <h2
              id="collections-heading"
              className="mt-3 text-xl font-semibold tracking-[-0.02em] text-ink sm:text-2xl"
            >
              Explore Our Collections
            </h2>
          </div>
          <p className="max-w-xs text-[13px] leading-relaxed text-graphite sm:text-right">
            Discover styles and collections curated for you.
          </p>
        </div>
      </Reveal>

      {/* 3 per row — always */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
        {resource.isLoading
          ? Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="aspect-[4/5] animate-pulse bg-bone" />
            ))
          : collections.map((collection, index) => (
              <Reveal key={collection.id} delay={Math.min(index * 0.06, 0.18)}>
                <Link
                  to={`/collections/${collection.slug}`}
                  className="group block focus-visible:outline-offset-4"
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-bone">
                    <SmartImage
                      src={collection.coverImage}
                      alt={collection.title}
                      priority={index === 0}
                      className="h-full w-full object-cover transition-transform duration-[1.4s] ease-editorial group-hover:scale-[1.05]"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/85 via-ink/25 to-transparent p-5 pt-24 text-paper">
                      <h3 className="text-lg font-semibold tracking-[-0.02em]">
                        {collection.title}
                      </h3>
                      {collection.description && (
                        <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-paper/80">
                          {collection.description}
                        </p>
                      )}
                      <span className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase">
                        Explore Collection
                        <ArrowUpRight
                          size={13}
                          strokeWidth={1.6}
                          className="transition-transform duration-400 ease-editorial group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        />
                      </span>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
      </div>
    </section>
  )
}