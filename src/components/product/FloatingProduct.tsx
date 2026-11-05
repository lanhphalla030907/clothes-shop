import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { Plate } from './ProductStates'
import { STORE_CURRENCY } from '@/lib/api/config'
import { formatMoney } from '@/lib/money'
import type { CataloguePiece } from '@/types'

interface FloatingProductProps {
  piece: CataloguePiece
  /** Position in the rail — kept for API compatibility. */
  index: number
  /** `hero` overlaps the display type; `rail` sits in the showcase strip. */
  variant?: 'hero' | 'rail'
}

/**
 * A garment suspended on an invisible rail. Static — no float, no hover lift.
 * Every card is the same size so tops and bottoms line up in the rail.
 */
export function FloatingProduct({ piece, index, variant = 'rail' }: FloatingProductProps) {
  const isHero = variant === 'hero'

  return (
    <div
      className={
        isHero
          ? 'w-full'
          : 'w-[62vw] max-w-[300px] shrink-0 sm:w-[38vw] sm:max-w-[330px] lg:w-[290px]'
      }
    >
      <div className="group/piece relative">
        {/* Hanger hook — the visual cue that these pieces are suspended */}
        <div className="pointer-events-none absolute top-0 left-1/2 z-20 -translate-x-1/2 -translate-y-full">
          <svg width="14" height="30" viewBox="0 0 14 30" fill="none" aria-hidden>
            <path
              d="M7 6.5a3.2 3.2 0 1 1 2.4-5.36"
              stroke="currentColor"
              strokeWidth="1"
              className="text-graphite"
            />
            <path d="M7 6.5V30" stroke="currentColor" strokeWidth="1" className="text-graphite" />
          </svg>
        </div>

        <Link
          to={`/product/${piece.id}`}
          className="block pt-6"
          aria-label={`${piece.name} — ${formatMoney(piece.price, STORE_CURRENCY)}`}
        >
          <div className="relative aspect-[3/4] w-full overflow-hidden border border-line bg-paper shadow-[0_1px_2px_rgba(11,11,11,0.04)] transition-shadow duration-700 ease-editorial group-hover/piece:shadow-[0_28px_60px_-24px_rgba(11,11,11,0.35)]">
            <Plate
              src={piece.images[0]}
              alt={piece.name}
              className="h-full w-full object-cover transition-transform duration-[1.4s] ease-editorial group-hover/piece:scale-[1.07]"
            />

            {/* Scrim keeps the caption legible over any photo */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink/45 via-ink/10 to-transparent opacity-0 transition-opacity duration-700 ease-editorial group-hover/piece:opacity-100" />

            <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-3 p-3.5 opacity-0 transition-all duration-500 ease-editorial group-hover/piece:translate-y-0 group-hover/piece:opacity-100 sm:p-4">
              <div className="flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold tracking-[0.02em] text-paper uppercase sm:text-xs">
                    {piece.name}
                  </p>
                  <p className="mt-0.5 font-mono text-[9px] tracking-[0.16em] text-paper/70 uppercase">
                    {piece.category}
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-1 font-mono text-[11px] text-paper tabular-nums">
                  {formatMoney(piece.price, STORE_CURRENCY)}
                  <ArrowUpRight size={12} strokeWidth={1.5} />
                </span>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}