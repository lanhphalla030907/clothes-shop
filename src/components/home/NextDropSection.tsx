import { useEffect, useState } from 'react'
import { Clock, TicketPercent } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { Reveal } from '@/components/ui/Reveal'
import { fetchActiveNextDrop } from '@/features/next-drops/api'
import type { NextDrop } from '@/types/api'

type Countdown = { days: number; hours: number; minutes: number; seconds: number }

const toCountdown = (launchAt: string | null): Countdown | null => {
  if (launchAt === null) return null
  const target = new Date(launchAt).getTime()
  if (Number.isNaN(target)) return null
  const remaining = target - Date.now()
  if (remaining <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  const days = Math.floor(remaining / 86_400_000)
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000)
  const minutes = Math.floor((remaining % 3_600_000) / 60_000)
  const seconds = Math.floor((remaining % 60_000) / 1_000)
  return { days, hours, minutes, seconds }
}

const isZero = (value: Countdown) =>
  value.days === 0 && value.hours === 0 && value.minutes === 0 && value.seconds === 0

const pad = (value: number): string => String(value).padStart(2, '0')

export function NextDropSection() {
  const [drop, setDrop] = useState<NextDrop | null>(null)
  const [tick, setTick] = useState(0)
  const [error, setError] = useState<unknown>(undefined)

  useEffect(() => {
    let cancelled = false
    fetchActiveNextDrop()
      .then((result) => {
        if (cancelled) return
        setDrop(result)
      })
      .catch((cause) => {
        if (cancelled) return
        setError(cause)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (drop === null) return
    const timer = setInterval(() => setTick((current) => current + 1), 1000)
    return () => clearInterval(timer)
  }, [drop])

  const countdown = drop === null ? null : toCountdown(drop.launchAt)
  const live = countdown !== null && isZero(countdown)
  void tick

  if (error !== undefined || drop === null) return null

  const coupon = drop.promotion?.code ?? null
  const buttonLabel = drop.buttonText?.trim() || 'Get Access'

  return (
    <section
      className="container-editorial py-16 sm:py-20 bg-ink text-paper"
      aria-labelledby="next-drop-heading"
    >
      <Reveal>
        <div className="flex flex-col items-center gap-4 text-center border-b-2 border-line/30 pb-8">
          <div className="flex items-center gap-2">
            <Clock size={14} strokeWidth={1.6} className="text-paper/60" aria-hidden />
            <span className="label-micro text-paper/50 uppercase tracking-[0.12em] font-semibold">
              Next Drop
            </span>
          </div>
          <h2
            id="next-drop-heading"
            className="mt-2 type-display text-[10vw] leading-[0.85] sm:text-[5vw] font-extrabold tracking-tighter"
          >
            {drop.title}
          </h2>
          {coupon !== null && (
            <p className="mt-1 text-[14px] font-mono text-paper/70 tracking-wider">
              <TicketPercent size={13} strokeWidth={1.6} className="mr-1.5 text-paper" aria-hidden />
              {coupon}
            </p>
          )}
        </div>

        <div className="mt-8 flex flex-col items-center justify-center gap-6 sm:flex-row sm:gap-10">
          {countdown === null ? (
            <p className="text-[13px] text-paper/50">Preparing…</p>
          ) : live ? (
            <div className="flex items-center gap-2 text-paper/80">
              <span className="font-semibold">Live now</span>
            </div>
          ) : (
            <div className="flex gap-3">
              <CountdownField label="Days" value={countdown.days} />
              <CountdownField label="Hours" value={countdown.hours} />
              <CountdownField label="Min" value={countdown.minutes} />
              <CountdownField label="Sec" value={countdown.seconds} />
            </div>
          )}
        </div>

        <div className="mt-10">
          <Action
            to={drop.buttonUrl}
            variant="solid"
            size="lg"
            withArrow
            className="text-paper hover:bg-paper hover:text-ink"
          >
            {buttonLabel}
          </Action>
        </div>
      </Reveal>
    </section>
  )
}

function CountdownField({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[2vw] sm:text-2xl font-mono font-bold tabular-nums text-paper">
        {pad(value)}
      </span>
      <span className="text-[11px] font-semibold tracking-[0.1em] uppercase text-paper/40">
        {label}
      </span>
    </div>
  )
}
