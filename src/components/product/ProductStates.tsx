import type { ReactNode } from 'react'
import { SmartImage } from '@/components/ui/SmartImage'
import { Action } from '@/components/ui/Action'

/**
 * The catalogue's loading, empty and failure states, in the storefront's voice.
 *
 * Same rules as the rest of the store: a skeleton where the content will be, one
 * statement and one thing to do next when there is nothing to show, and a real
 * failure never dressed up as an empty shelf.
 */

/**
 * A product plate.
 *
 * A product with no image yet gets the bone field and its name set into it —
 * the same quiet placeholder `SmartImage` falls back to, so a catalogue still
 * being photographed reads as *unphotographed* rather than *broken*.
 */
export const Plate = ({
  src,
  alt,
  className = '',
  priority = false,
}: {
  src: string | undefined
  alt: string
  className?: string
  priority?: boolean
}) => {
  if (src) return <SmartImage src={src} alt={alt} className={className} priority={priority} />

  return (
    <span
      aria-label={alt}
      className={`grid h-full w-full place-items-center bg-bone px-6 text-center ${className}`}
    >
      <span className="label-micro text-ash">{alt}</span>
    </span>
  )
}

type NoticeProps = {
  eyebrow: string
  title: string
  message: string
  action?: ReactNode
}

/** Empty, failed and not-found share one shape: a claim, a reason, a next step. */
export const ProductNotice = ({ eyebrow, title, message, action }: NoticeProps) => (
  <section className="container-editorial py-20 sm:py-28">
    <div className="border-t border-line pt-10 sm:pt-14">
      <span className="label-micro text-ash">{eyebrow}</span>
      <h2 className="type-display mt-6 text-[13vw] leading-[0.86] sm:text-[4.5rem]">{title}</h2>
      <p className="mt-6 max-w-md text-sm leading-[1.85] text-graphite sm:text-[15px]">{message}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        {action ?? (
          <Action to="/shop" size="sm" withArrow>
            The collection
          </Action>
        )}
      </div>
    </div>
  </section>
)

type ProductGridSkeletonProps = {
  count?: number
  columns?: 2 | 3 | 4
  className?: string
}

const columnClass: Record<NonNullable<ProductGridSkeletonProps['columns']>, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
}

/** The collection's own shape, filled in with placeholders. */
export const ProductGridSkeleton = ({ count = 6, columns = 3, className = '' }: ProductGridSkeletonProps) => (
  <div
    role="status"
    aria-busy="true"
    className={`grid animate-pulse gap-x-4 gap-y-12 sm:gap-x-6 sm:gap-y-16 ${columnClass[columns]} ${className}`}
  >
    <span className="sr-only">Loading the collection…</span>
    {Array.from({ length: count }, (_, index) => (
      <div key={index}>
        <div className="aspect-4/5 w-full bg-bone" />
        <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-line pt-3">
          <div className="w-full space-y-2">
            <div className="h-3 w-3/5 bg-bone" />
            <div className="h-2.5 w-2/5 bg-bone" />
          </div>
        </div>
      </div>
    ))}
  </div>
)

/** The product page's gallery and column, held open while the reads are in. */
export const ProductDetailSkeleton = () => (
  <div role="status" aria-busy="true" className="container-editorial grid gap-10 pb-20 sm:pt-12 lg:grid-cols-12 lg:gap-14 lg:pb-32">
    <span className="sr-only">Loading this piece…</span>
    <div className="lg:col-span-7">
      <div className="aspect-4/5 w-full animate-pulse bg-bone sm:aspect-4/3 lg:aspect-4/5" />
      <div className="mt-3 grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="aspect-4/5 animate-pulse bg-bone" />
        ))}
      </div>
    </div>
    <div className="space-y-5 lg:col-span-5">
      <div className="h-2.5 w-32 animate-pulse bg-bone" />
      <div className="h-16 w-3/4 animate-pulse bg-bone" />
      <div className="h-5 w-24 animate-pulse bg-bone" />
      <div className="h-3 w-full animate-pulse bg-bone" />
      <div className="h-3 w-5/6 animate-pulse bg-bone" />
      <div className="h-24 w-full animate-pulse bg-bone" />
    </div>
  </div>
)
