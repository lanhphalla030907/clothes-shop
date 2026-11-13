import { useCallback, useEffect, useRef, useState } from 'react'
import type { TouchEvent, TransitionEvent } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useReducedMotion } from 'framer-motion'
import { Reveal } from '@/components/ui/Reveal'
import { SmartImage } from '@/components/ui/SmartImage'
import { Skeleton } from '@/components/account/Skeleton'
import { useActivePosters } from '@/features/posters/usePosters'

const AUTOPLAY_MS = 5500
const SWIPE_THRESHOLD = 40

export function PosterCarousel() {
  const posters = useActivePosters()
  const list = (posters.data ?? []).filter((poster) => poster.isActive)
  const count = list.length
  const prefersReduced = useReducedMotion()

  const [position, setPosition] = useState(1)
  const [instant, setInstant] = useState(false)
  const [paused, setPaused] = useState(false)
  const touchStartX = useRef<number | null>(null)

  const extended =
    count > 1 ? [list[count - 1], ...list, list[0]] : list
  const maxPosition = count > 1 ? count + 1 : 0
  const trackPosition =
    count <= 1 ? 0 : Math.min(Math.max(position, 0), maxPosition)

  const current =
    count === 0
      ? 0
      : count === 1
        ? 0
        : trackPosition === 0
          ? count - 1
          : trackPosition === maxPosition
            ? 0
            : trackPosition - 1

  const next = useCallback(() => {
    setPosition((value) => Math.min(value + 1, maxPosition))
  }, [maxPosition])

  const previous = useCallback(() => {
    setPosition((value) => Math.max(value - 1, 0))
  }, [])

  useEffect(() => {
    if (count < 2 || paused || prefersReduced) return undefined

    const timer = window.setInterval(next, AUTOPLAY_MS)
    return () => window.clearInterval(timer)
  }, [count, paused, prefersReduced, next, position])

  useEffect(() => {
    if (!instant) return undefined
    const frame = window.requestAnimationFrame(() => setInstant(false))
    return () => window.cancelAnimationFrame(frame)
  }, [instant])

  const handleTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.propertyName !== 'transform') {
      return
    }

    if (trackPosition === 0) {
      setInstant(true)
      setPosition(count)
    } else if (trackPosition === maxPosition && count > 1) {
      setInstant(true)
      setPosition(1)
    }
  }

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null
  }

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStartX.current
    touchStartX.current = null
    if (start === null || count < 2) return

    const end = event.changedTouches[0]?.clientX
    if (end === undefined) return

    const delta = end - start
    if (delta <= -SWIPE_THRESHOLD) next()
    else if (delta >= SWIPE_THRESHOLD) previous()
  }

  if (posters.isLoading) {
    return (
      <section
        className="container-editorial py-16 sm:py-20"
        aria-busy="true"
        aria-label="Featured promotions"
      >
        <span className="sr-only">Loading featured promotions</span>
        <div className="flex items-end justify-between border-b border-line pb-5">
          <div>
            <Skeleton className="h-2.5 w-24" />
            <Skeleton className="mt-3 h-5 w-40" />
          </div>
        </div>
        <Skeleton className="mt-8 aspect-[16/10] w-full bg-bone sm:mt-10 sm:aspect-[16/7] lg:aspect-[16/5]" />
      </section>
    )
  }

  if (count === 0) return null

  const active = list[current]
  const activeTitle = active?.title?.trim() ?? ''

  return (
    <section className="container-editorial py-20">
      <Reveal>
        <div className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-6 bg-line" aria-hidden />
              <span className="label-micro text-graphite">Featured</span>
            </div>
            <h2 className="mt-3 text-xl font-semibold tracking-[-0.02em] text-ink sm:text-2xl">
              Featured Promotions
            </h2>
            <p className="mt-1.5 max-w-md text-[13px] leading-relaxed text-graphite">
              Explore our featured promotions and exclusive offers.
            </p>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="relative mt-8 sm:mt-10">
          <div
            role="region"
            aria-roledescription="carousel"
            aria-label="Featured promotions"
            data-testid="poster-carousel"
            className="group relative aspect-[16/10] overflow-hidden bg-[#f4f4f4] sm:aspect-[16/7] lg:aspect-[16/5]"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div
              data-testid="poster-carousel-viewport"
              aria-live={paused ? 'polite' : 'off'}
              className="flex h-full touch-pan-y"
              onTransitionEnd={handleTransitionEnd}
              style={{
                transform: `translate3d(-${trackPosition * 100}%, 0, 0)`,
                transition:
                  instant || prefersReduced
                    ? 'none'
                    : 'transform 700ms var(--ease-editorial)',
              }}
            >
              {extended.map((poster, index) => {
                const isClone =
                  count > 1 && (index === 0 || index === extended.length - 1)

                return (
                  <div
                    key={`${poster.id}-${index}`}
                    role={isClone ? undefined : 'group'}
                    aria-roledescription={isClone ? undefined : 'slide'}
                    aria-label={
                      isClone ? undefined : `${index + 1} of ${count}`
                    }
                    aria-hidden={isClone ? true : undefined}
                    className="relative h-full w-full shrink-0"
                  >
                    {/* 
                      THE FIX: 
                      Changed back to object-cover to fill the space.
                      Added object-center to ensure the models are in the middle, not cut off.
                    */}
                    <SmartImage
                      src={poster.imageUrl}
                      alt={
                        isClone
                          ? ''
                          : (poster.title ?? `Campaign poster ${index + 1}`)
                      }
                      priority={index === 1}
                      className="h-full w-full object-cover object-center"
                    />
                  </div>
                )
              })}
            </div>

            {activeTitle !== '' && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 via-ink/15 to-transparent px-5 pt-20 pb-14 sm:px-8 sm:pt-28 sm:pb-16">
                <p className="max-w-2xl text-[clamp(1.35rem,3vw,2.75rem)] leading-[1.05] font-semibold tracking-[-0.03em] text-paper">
                  {activeTitle}
                </p>
              </div>
            )}

            {count > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous poster"
                  onClick={previous}
                  className="absolute top-1/2 left-3 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-paper/90 text-ink backdrop-blur-sm transition-colors duration-300 hover:bg-ink hover:text-paper sm:left-4 sm:size-12"
                >
                  <ChevronLeft size={20} strokeWidth={1.6} aria-hidden />
                </button>

                <button
                  type="button"
                  aria-label="Next poster"
                  onClick={next}
                  className="absolute top-1/2 right-3 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-paper/90 text-ink backdrop-blur-sm transition-colors duration-300 hover:bg-ink hover:text-paper sm:right-4 sm:size-12"
                >
                  <ChevronRight size={20} strokeWidth={1.6} aria-hidden />
                </button>

                <div className="absolute right-4 bottom-4 flex items-center gap-1.5 rounded-full bg-ink/35 px-2 py-1.5 backdrop-blur-sm sm:right-5 sm:bottom-5">
                  {list.map((poster, index) => (
                    <button
                      key={poster.id}
                      type="button"
                      aria-label={`Show poster ${index + 1}`}
                      aria-current={index === current ? 'true' : undefined}
                      onClick={() => {
                        setInstant(false)
                        setPosition(index + 1)
                      }}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        index === current
                          ? 'w-7 bg-paper'
                          : 'w-1.5 bg-paper/50 hover:bg-paper/80'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </Reveal>
    </section>
  )
}