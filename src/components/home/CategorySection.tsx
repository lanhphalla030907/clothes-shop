import { useRef, useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Reveal } from '@/components/ui/Reveal'
import { SmartImage } from '@/components/ui/SmartImage'
import { Skeleton, SkeletonText } from '@/components/account/Skeleton'
import { useCategories } from '@/features/catalogue/useCatalogue'

export function CategorySection() {
  const categories = useCategories()
  const list = categories.data ?? []
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateScrollState()
    el.addEventListener('scroll', updateScrollState, { passive: true })
    const resizeObserver = new ResizeObserver(updateScrollState)
    resizeObserver.observe(el)
    return () => {
      el.removeEventListener('scroll', updateScrollState)
      resizeObserver.disconnect()
    }
  }, [updateScrollState, list.length])

  const scrollBy = (direction: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    // Scroll by ~one card width so it feels natural
    const firstCard = el.firstElementChild as HTMLElement | null
    const amount = firstCard ? firstCard.offsetWidth + 16 : el.clientWidth * 0.8
    el.scrollBy({ left: direction === 'right' ? amount : -amount, behavior: 'smooth' })
  }

  const scrollButtonClass =
    'flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-line bg-paper text-ink transition-colors duration-300 hover:bg-ink hover:text-paper disabled:opacity-30 disabled:pointer-events-none'

  // Shared card width: 2 on mobile, 3 on sm, 4 on md, 5 on lg
  const cardWidthClass =
    'w-[calc((100%-1*1rem)/2)] sm:w-[calc((100%-2*1.25rem)/3)] md:w-[calc((100%-3*1.5rem)/4)] lg:w-[calc((100%-4*1.5rem)/5)] shrink-0 snap-start'

  if (categories.isLoading) {
    return (
      <section className="container-editorial py-20 sm:py-28">
        <Reveal>
          <div className="flex flex-col gap-6 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-4">
                <span className="h-px w-8 bg-line" aria-hidden />
                <span className="label-micro text-graphite">The Categories</span>
              </div>
              <h2 className="type-display mt-6 text-[13vw] leading-[0.86] sm:text-[7vw]">
                Shop by
                <br />
                category
              </h2>
            </div>
          </div>
        </Reveal>

        <div className="mt-10 flex gap-4 sm:mt-14 sm:gap-5 md:gap-6 overflow-hidden">
          {[0, 1, 2, 3, 4].map((index) => (
            <div key={index} className={cardWidthClass}>
              <div className="relative aspect-[4/5] overflow-hidden bg-bone rounded-sm">
                <Skeleton className="h-full w-full aspect-[4/5]" />
                <SkeletonText lines={2} className="mt-4" />
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  const active = list.filter((category) => category.isActive)

  if (active.length === 0) {
    return null
  }

  const needsScroll = active.length > 5

  return (
    <section className="container-editorial pt-20">
      <Reveal>
        <div className="flex flex-col gap-6 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-4">
              <span className="h-px w-8 bg-line" aria-hidden />
              <span className="label-micro text-graphite">The Categories</span>
            </div>
            <h2 className="type-display mt-6 text-[13vw] leading-[0.86] sm:text-[7vw]">
              Shop by
              <br />
              category
            </h2>
          </div>
          <div className="flex items-center justify-between gap-4 self-stretch sm:self-auto sm:justify-end">
            {/* Arrows — visible on ALL breakpoints now */}
            {needsScroll && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Scroll categories left"
                  className={scrollButtonClass}
                  onClick={() => scrollBy('left')}
                  disabled={!canScrollLeft}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label="Scroll categories right"
                  className={scrollButtonClass}
                  onClick={() => scrollBy('right')}
                  disabled={!canScrollRight}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            )}
            <Link
              to="/shop"
              className="group label-micro inline-flex items-center gap-3 border-b border-ink pb-2"
            >
              Browse all
            </Link>
          </div>
        </div>
      </Reveal>

      <div className="relative mt-10 sm:mt-14">
        <div
          ref={scrollRef}
          className="flex gap-4 sm:gap-5 md:gap-6 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory scroll-px-4 sm:scroll-px-6"
        >
          {active.map((category, index) => (
            <div key={category.id} className={cardWidthClass}>
              <Reveal delay={index * 0.08}>
                <Link
                  to={`/shop?category=${category.slug}`}
                  className="group/category block"
                >
                  <div
                    className={`relative aspect-[4/5] overflow-hidden bg-bone rounded-sm group-hover/category:scale-[1.02] transition-transform duration-500 ease-editorial`}
                  >
                    {category.imageUrl !== null && category.imageUrl !== undefined ? (
                      <SmartImage
                        src={category.imageUrl}
                        alt={category.altText ?? category.name}
                        className="h-full w-full object-cover group-hover/category:scale-[1.05] transition-transform duration-[1.5s] ease-editorial"
                        priority={index < 3}
                      />
                    ) : (
                      <div className="h-full w-full flex flex-col items-center justify-center text-center p-4">
                        <span className="text-[10px] tracking-[0.2em] uppercase text-ash font-mono mb-2">
                          No image
                        </span>
                        <span className="text-[13px] font-medium text-ink">
                          {category.name}
                        </span>
                      </div>
                    )}
                  </div>
                  <h3 className="mt-3 text-[13px] font-semibold tracking-[-0.01em] text-ink">
                    {category.name}
                  </h3>
                </Link>
              </Reveal>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}