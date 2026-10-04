import type { ReactNode } from 'react'

/**
 * The loading state for anything fetched.
 *
 * Skeletons rather than a spinner because every account page is a grid of known
 * shape, and a placeholder in the right place reads as "loading this" while a
 * centred spinner only says "something". Marked `aria-busy` with the status
 * hidden from assistive tech, so the alternative text is the error or empty state
 * rather than a repeated "loading".
 */

type SkeletonProps = {
  className?: string
}

export const Skeleton = ({ className = '' }: SkeletonProps) => (
  <div
    aria-hidden
    className={`animate-pulse bg-line-soft ${className}`}
  />
)

type SkeletonTextProps = {
  lines?: number
  className?: string
}

export const SkeletonText = ({ lines = 3, className = '' }: SkeletonTextProps) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: lines }, (_, index) => (
      <Skeleton
        key={index}
        // The last line is short, which reads as a paragraph rather than a block.
        className={`h-3 ${index === lines - 1 ? 'w-2/3' : 'w-full'}`}
      />
    ))}
  </div>
)

type SkeletonCardProps = {
  /** Skeleton rows to stand in for the real content. */
  rows?: number
  className?: string
}

export const SkeletonCard = ({ rows = 3, className = '' }: SkeletonCardProps) => (
  <div
    role="status"
    aria-busy="true"
    className={`border border-line bg-paper p-6 sm:p-8 ${className}`}
  >
    <span className="sr-only">Loading…</span>
    <Skeleton className="h-2.5 w-24" />
    <div className="mt-6 space-y-4">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-4">
          <Skeleton className="size-14 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className={`h-3 ${index % 2 === 0 ? 'w-3/5' : 'w-2/5'}`} />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  </div>
)

type SkeletonGridProps = {
  count?: number
  className?: string
  children?: ReactNode
}

export const SkeletonGrid = ({ count = 3, className = '' }: SkeletonGridProps) => (
  <>
    {Array.from({ length: count }, (_, index) => (
      <SkeletonCard key={index} className={className} />
    ))}
  </>
)
