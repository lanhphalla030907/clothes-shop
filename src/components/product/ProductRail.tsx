import { useRef } from 'react'
import type { ReactNode } from 'react'
import { FloatingProduct } from './FloatingProduct'
import type { CataloguePiece } from '@/types'

interface ProductRailProps {
  pieces: CataloguePiece[]
  /** Shown as the section heading. */
  label?: string
  /** Holds the strip's shape open while the catalogue is being read. */
  isLoading?: boolean
  /** Optional action rendered on the right of the header (e.g. "View All"). */
  action?: ReactNode
  className?: string
}

const RailSkeleton = () => (
  <div
    role="status"
    aria-busy="true"
    className="flex w-[62vw] max-w-[300px] shrink-0 gap-4 sm:w-[38vw] sm:max-w-[330px] lg:w-[290px]"
  >
    <span className="sr-only">Loading the collection…</span>
    <div className="aspect-[3/4] w-full animate-pulse bg-bone" />
  </div>
)

export function ProductRail({
  pieces,
  label,
  isLoading = false,
  action = null,
  className = '',
}: ProductRailProps) {
  const ref = useRef<HTMLDivElement>(null)

  return (
    <section className={className} aria-label={label ?? 'Product showcase'}>
      {/* Header with optional action on the right */}
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
          {action}
        </div>
      </div>

      <div className="container-editorial mt-6 sm:mt-8">
        <div
          ref={ref}
          className="no-scrollbar flex gap-4 overflow-x-auto overscroll-x-contain pb-2 sm:gap-6"
        >
          {pieces.map((piece, index) => (
            <div key={piece.id} className="snap-start">
              <FloatingProduct piece={piece} index={index} />
            </div>
          ))}

          {isLoading && pieces.length === 0 && (
            <>
              <RailSkeleton />
              <RailSkeleton />
              <RailSkeleton />
              <RailSkeleton />
            </>
          )}

          <div className="w-1 shrink-0 sm:w-6" aria-hidden />
        </div>
      </div>
    </section>
  )
}