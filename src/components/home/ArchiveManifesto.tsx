import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { fetchActiveNextDrop } from '@/features/next-drops/api'

export function ArchiveManifesto() {
  const resource = useAsyncResource((signal) => fetchActiveNextDrop(signal), [])
  const drop = resource.data

  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    if (drop === undefined || drop.launchAt === null) {
      setTimeLeft({ hours: 0, minutes: 0, seconds: 0 })
      return
    }

    const targetDate = new Date(drop.launchAt).getTime()
    if (Number.isNaN(targetDate)) return

    const interval = setInterval(() => {
      const now = new Date().getTime()
      const distance = targetDate - now

      if (distance < 0) {
        clearInterval(interval)
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 })
        return
      }

      setTimeLeft({
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [drop])

  if (drop === undefined) return null

  const coupon = drop.promotion?.code ?? null
  const buttonLabel = drop.buttonText?.trim() || 'Get Access'

  return (
    <section className="w-full bg-canvas border-y border-line">
      <div className="container-editorial">
        <div className="flex flex-col lg:flex-row items-center justify-between divide-y lg:divide-y-0 lg:divide-x divide-line">
          <div className="w-full lg:w-1/3 py-6 lg:py-8 lg:pr-8 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="h-2 w-2 rounded-full bg-[var(--ctrl-red)] animate-pulse" />
                <span className="text-[11px] font-mono tracking-widest uppercase text-graphite/70 font-semibold">Next Drop</span>
              </div>
              <h2 className="type-display text-3xl sm:text-4xl lg:text-5xl leading-[0.9]">
                {drop.title} <span className="font-serif italic text-[var(--ctrl-red)]">Archive.</span>
              </h2>
              {coupon !== null && (
                <p className="mt-2 text-[10px] font-mono tracking-widest uppercase text-graphite/60">
                  Code: {coupon}
                </p>
              )}
            </div>
            <span className="lg:hidden text-[10px] font-mono uppercase text-graphite/60 border border-line px-2 py-1">
              Members Only
            </span>
          </div>

          <div className="w-full lg:w-1/3 py-6 lg:py-8 lg:px-12 flex items-center justify-center lg:justify-start gap-4 sm:gap-6">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl lg:text-5xl font-mono font-light text-ink tracking-tighter tabular-nums">
                {String(timeLeft.hours).padStart(2, '0')}
              </span>
              <span className="text-[10px] font-mono text-graphite/60 uppercase tracking-widest">Hrs</span>
            </div>
            <span className="text-2xl text-line pb-1">:</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl lg:text-5xl font-mono font-light text-ink tracking-tighter tabular-nums">
                {String(timeLeft.minutes).padStart(2, '0')}
              </span>
              <span className="text-[10px] font-mono text-graphite/60 uppercase tracking-widest">Min</span>
            </div>
            <span className="text-2xl text-line pb-1">:</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl lg:text-5xl font-mono font-light text-[var(--ctrl-red)] tracking-tighter tabular-nums">
                {String(timeLeft.seconds).padStart(2, '0')}
              </span>
              <span className="text-[10px] font-mono text-graphite/60 uppercase tracking-widest">Sec</span>
            </div>
          </div>

          <div className="w-full lg:w-1/3 py-6 lg:py-8 lg:pl-8 flex flex-row items-center justify-between gap-4">
            <p className="hidden xl:block text-[10px] font-mono tracking-widest uppercase text-graphite/50 leading-relaxed">
              {drop.collection?.title ?? 'Featured collection'}
            </p>
            <Link
              to={drop.buttonUrl}
              className="group flex w-full lg:w-auto items-center justify-center border-2 border-ink bg-transparent px-6 py-3.5 text-[12px] font-mono font-bold tracking-widest uppercase text-ink transition-colors duration-300 hover:bg-ink hover:text-canvas"
            >
              {buttonLabel}
              <span className="ml-2 transform transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
