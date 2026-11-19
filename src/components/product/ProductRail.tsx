import { useRef, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { ProductCard } from './ProductCard'
import type { CataloguePiece } from '@/types'

interface ProductRailProps {
  pieces: CataloguePiece[]
  label?: string
  isLoading?: boolean
  action?: ReactNode
  className?: string
}

const RailArrow = ({
  direction,
  onClick,
  disabled,
}: {
  direction: 1 | -1
  onClick: () => void
  disabled: boolean
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={direction === 1 ? 'Next products' : 'Previous products'}
    className="grid size-9 place-items-center border border-line text-ink transition-colors duration-400 ease-editorial hover:bg-ink hover:text-paper disabled:pointer-events-none disabled:opacity-25 sm:size-10"
  >
    {direction === 1 ? <ArrowRight size={15} strokeWidth={1.5} /> : <ArrowLeft size={15} strokeWidth={1.5} />}
  </button>
)

export function ProductRail({
  pieces,
  label,
  isLoading,
  action = null,
  className = '',
}: ProductRailProps) {
  void isLoading
  const trackRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(0)

  const layoutFor = useCallback(() => {
    if (typeof window === 'undefined') return { perPage: 5, gap: 24 }
    const width = window.innerWidth
    if (width >= 1024) return { perPage: 5, gap: 24 } // lg
    if (width >= 768) return { perPage: 4, gap: 24 }  // md
    if (width >= 640) return { perPage: 3, gap: 20 }  // sm
    return { perPage: 2, gap: 16 }                    // mobile
  }, [])

  const totalPages = Math.max(1, Math.ceil(pieces.length / layoutFor().perPage))

  const goToPage = useCallback((nextPage: number) => {
    const el = trackRef.current
    if (!el) return
    const { perPage, gap } = layoutFor()
    const firstCard = el.querySelector<HTMLElement>('[data-card]')
    if (!firstCard) return
    const cardWidth = firstCard.offsetWidth
    el.scrollTo({ left: nextPage * perPage * (cardWidth + gap), behavior: 'smooth' })
    setPage(nextPage)
  }, [layoutFor])

  const next = () => { if (page < totalPages - 1) goToPage(page + 1) }
  const prev = () => { if (page > 0) goToPage(page - 1) }

  return (
    <section className={className} aria-label={label ?? 'Product showcase'}>
      <div className="container-editorial">
        <div className="flex items-end justify-between gap-6 border-b border-line pb-5">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-6 bg-line" aria-hidden />
              <span className="label-micro text-graphite">The Edit</span>
            </div>
            <h2 className="mt-3 text-xl font-semibold tracking-[-0.02em] text-ink sm:text-2xl">
              {label ?? 'The Rail'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            {action}
            {pieces.length > 0 && (
              <div className="flex items-center gap-2">
                <RailArrow direction={-1} onClick={prev} disabled={page === 0} />
                <RailArrow direction={1} onClick={next} disabled={page >= totalPages - 1} />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container-editorial mt-6 sm:mt-8">
        <div
          ref={trackRef}
          className="grid grid-flow-col grid-rows-1 auto-cols-[calc((100%-1rem)/2)] gap-4 overflow-x-auto scroll-smooth pb-2 sm:auto-cols-[calc((100%-2.5rem)/3)] sm:gap-5 md:auto-cols-[calc((100%-4.5rem)/4)] md:gap-6 lg:auto-cols-[calc((100%-6rem)/5)] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory"
        >
          {pieces.map((piece, index) => (
            <div key={piece.id} data-card className="snap-start min-w-0">
              <ProductCard piece={piece} index={index} priority={index < 4} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
