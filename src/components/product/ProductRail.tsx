import { useRef, useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { FloatingProduct } from './FloatingProduct'
import { useDragScroll } from '@/hooks/useDragScroll'
import type { CataloguePiece } from '@/types'

interface ProductRailProps {
  pieces: CataloguePiece[]
  /** Shown in the small caption that sits above the rail. */
  label?: string
  /** Holds the strip's shape open while the catalogue is being read. */
  isLoading?: boolean
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
    aria-label={direction === 1 ? 'Scroll forward' : 'Scroll back'}
    className="grid size-10 place-items-center border border-line text-ink transition-colors duration-400 ease-editorial hover:bg-ink hover:text-paper disabled:pointer-events-none disabled:opacity-25 sm:size-11"
  >
    {direction === 1 ? <ArrowRight size={15} strokeWidth={1.5} /> : <ArrowLeft size={15} strokeWidth={1.5} />}
  </button>
)

/** Placeholder plates, so the strip does not collapse while the pieces load. */
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

/**
 * Draggable product showcase. Native scroll gives touch its momentum and
 * snap points; the hook layers mouse dragging on top.
 */
export function ProductRail({ pieces, label, isLoading = false, className = '' }: ProductRailProps) {
  const { ref, props, scrollByPage } = useDragScroll()
  const [edges, setEdges] = useState({ start: true, end: false })
  const frame = useRef(0)

  const syncEdges = useCallback(() => {
    const el = ref.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setEdges({ start: el.scrollLeft <= 2, end: el.scrollLeft >= max - 2 })
  }, [ref])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    syncEdges()
    const onScroll = () => {
      cancelAnimationFrame(frame.current)
      frame.current = requestAnimationFrame(syncEdges)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', syncEdges)

    return () => {
      cancelAnimationFrame(frame.current)
      el.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', syncEdges)
    }
  }, [ref, syncEdges])

  return (
    <section className={className} aria-label={label ?? 'Product showcase'}>
      <div className="container-editorial flex items-end justify-between gap-6 pb-6 sm:pb-8">
        <div className="flex items-center gap-4">
          <span className="h-px w-8 bg-line" aria-hidden />
          <span className="label-micro text-graphite">{label ?? 'The Rail'}</span>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <RailArrow direction={-1} onClick={() => scrollByPage(-1)} disabled={edges.start} />
          <RailArrow direction={1} onClick={() => scrollByPage(1)} disabled={edges.end} />
        </div>
      </div>

      <motion.div
        ref={ref}
        {...props}
        className="no-scrollbar flex cursor-grab gap-4 overflow-x-auto overscroll-x-contain px-5 pb-2 sm:gap-6 sm:px-8 lg:px-14 xl:px-14"
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
      </motion.div>

      <p className="container-editorial mt-4 font-mono text-[9px] tracking-[0.16em] text-ash uppercase sm:mt-5">
        Drag to explore — or swipe on touch
      </p>
    </section>
  )
}
