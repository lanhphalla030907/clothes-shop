import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

export function ArchiveManifesto() {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const targetDate = new Date().getTime() + 3 * 24 * 60 * 60 * 1000

    const interval = setInterval(() => {
      const now = new Date().getTime()
      const distance = targetDate - now

      if (distance < 0) {
        clearInterval(interval)
        return
      }

      setTimeLeft({
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <section className="w-full bg-canvas border-y border-line">
      <div className="container-editorial">
        
        {/* Tight Horizontal Layout */}
        <div className="flex flex-col lg:flex-row items-center justify-between divide-y lg:divide-y-0 lg:divide-x divide-line">
          
          {/* Block 1: The Alert */}
          <div className="w-full lg:w-1/3 py-6 lg:py-8 lg:pr-8 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="h-2 w-2 rounded-full bg-[var(--ctrl-red)] animate-pulse" />
                <span className="text-[11px] font-mono tracking-widest uppercase text-graphite/70 font-semibold">Next Drop</span>
              </div>
              <h2 className="type-display text-3xl sm:text-4xl lg:text-5xl leading-[0.9]">
                Winter <span className="font-serif italic text-[var(--ctrl-red)]">Archive.</span>
              </h2>
            </div>
            {/* Mobile only: Tiny "Members Only" tag */}
            <span className="lg:hidden text-[10px] font-mono uppercase text-graphite/60 border border-line px-2 py-1">
              Members Only
            </span>
          </div>

          {/* Block 2: The Minimalist Timer */}
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

          {/* Block 3: Action & Info */}
          <div className="w-full lg:w-1/3 py-6 lg:py-8 lg:pl-8 flex flex-row items-center justify-between gap-4">
            <p className="hidden xl:block text-[10px] font-mono tracking-widest uppercase text-graphite/50 leading-relaxed">
              Stored on<br />studio server
            </p>
            <Link 
              to="/register"
              className="group flex w-full lg:w-auto items-center justify-center border-2 border-ink bg-transparent px-6 py-3.5 text-[12px] font-mono font-bold tracking-widest uppercase text-ink transition-colors duration-300 hover:bg-ink hover:text-canvas"
            >
              Get Access
              <span className="ml-2 transform transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
          </div>

        </div>
      </div>
    </section>
  )
}