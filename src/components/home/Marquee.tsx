const WORDS = [
  'Limited Release',
  'Never Basic',
  'New Era',
  'Elevated Essentials',
  'Statement Silhouettes',
] as const

interface MarqueeProps {
  className?: string
  reverse?: boolean
  duration?: number
}

/** Endless hairline ticker — the connective tissue between sections. */
export function Marquee({ className = '', reverse = false, duration = 42 }: MarqueeProps) {
  const track = [...WORDS, ...WORDS]

  return (
    <div
      className={`relative flex overflow-hidden border-y border-line py-5 ${className}`}
      aria-hidden
    >
      <div
        className="animate-marquee flex w-max shrink-0 items-center gap-10 pr-10 will-change-transform"
        style={{
          animationDuration: `${duration}s`,
          animationDirection: reverse ? 'reverse' : 'normal',
        }}
      >
        {track.map((word, index) => (
          <span key={`${word}-${index}`} className="flex items-center gap-10">
            <span className="type-display text-[5.5vw] leading-none whitespace-nowrap text-ink/85 sm:text-[3.2vw]">
              {word}
            </span>
            <span className="size-1 shrink-0 rotate-45 bg-ink" />
          </span>
        ))}
      </div>
    </div>
  )
}
