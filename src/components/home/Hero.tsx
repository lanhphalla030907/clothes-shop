import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { featuredProducts } from '@/data/products'
import { HangingGarment } from './HangingGarment'

const EASE = [0.16, 1, 0.3, 1] as const

const Spark = () => (
  <motion.svg
    viewBox="0 0 34 22"
    fill="currentColor"
    aria-hidden
    className="w-7 text-black"
    initial={{ opacity: 0, scale: 0.7 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.9, delay: 0.34, ease: EASE }}
  >
    <path d="M15 1c.6 5.6 2.4 7.4 8 8-5.6.6-7.4 2.4-8 8-.6-5.6-2.4-7.4-8-8 5.6-.6 7.4-2.4 8-8Z" />
    <path d="M28 4c.3 2.5 1.3 3.5 3.8 3.8-2.5.3-3.5 1.3-3.8 3.8-.3-2.5-1.3-3.5-3.8-3.8 2.5-.3 3.5-1.3 3.8-3.8Z" />
    <path d="M4.5 7c.2 1.7.9 2.4 2.6 2.6-1.7.2-2.4.9-2.6 2.6-.2-1.7-.9-2.4-2.6-2.6 1.7-.2 2.4-.9 2.6-2.6Z" />
  </motion.svg>
)

/** Fixed corner label — small, bold, uppercase. */
function Corner({
  children,
  className = '',
  delay = 0.18,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.p
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay, ease: EASE }}
      className={`pointer-events-none absolute z-30 text-sm font-bold tracking-[0.08em] text-black uppercase ${className}`}
    >
      {children}
    </motion.p>
  )
}
export function Hero() {
  const prefersReduced = useReducedMotion()

  return (
    <section className="relative flex h-screen flex-col justify-between overflow-hidden bg-[#e3e3e1] p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#dadada] via-[#e3e3e1] to-[#cfcfcd]"
      />
      <div
        aria-hidden
        data-hero-rail
        className="pointer-events-none absolute top-[48%] left-0 right-0 z-10 h-[7px] -translate-y-1/2"
      >
        {/* shadow the bar casts on the wall, directly below it */}
        <div className="absolute inset-x-0 top-full h-4 bg-gradient-to-b from-black/12 to-transparent" />

        {/* the bar itself */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-neutral-300 via-neutral-400 to-neutral-500" />
        {/* specular highlight along the top of the tube */}
        <div className="absolute inset-x-[2px] top-0 h-px rounded-full bg-white/55" />
        {/* darker underside */}
        <div className="absolute inset-x-[2px] bottom-0 h-px rounded-full bg-black/20" />

        {/* end caps + wall brackets */}
        <div className="absolute -top-px -left-[3px] h-[9px] w-[9px] rounded-full bg-gradient-to-b from-neutral-300 to-neutral-500" />
        <div className="absolute -top-px -right-[3px] h-[9px] w-[9px] rounded-full bg-gradient-to-b from-neutral-300 to-neutral-500" />
        <div className="absolute top-1/2 -left-1 h-6 w-2 -translate-y-1/2 rounded-[2px] bg-neutral-500" />
        <div className="absolute top-1/2 -right-1 h-6 w-2 -translate-y-1/2 rounded-[2px] bg-neutral-500" />
      </div>

      {/* ── Corners ─────────────────────────────────────────────────── */}
      <Corner className="top-8 left-8">Limited Release</Corner>
      <Corner className="top-8 right-8">June 2026</Corner>
      <Corner className="bottom-8 left-8" delay={0.95}>
        Never Basic
      </Corner>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.12, ease: EASE }}
        className="absolute right-8 bottom-8 z-30"
      >
        <Link to="/shop" className="group block text-right">
          <span className="block text-sm font-bold tracking-[0.08em] text-black uppercase transition-opacity duration-400 group-hover:opacity-55">
            Shop Now
          </span>
        </Link>
      </motion.div>

      {/* ── Headline ────────────────────────────────────────────────── */}
      <div className="relative z-30 flex flex-col items-center pt-16 text-center">
        <Spark />

        <motion.h1
          initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: '38%' }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.15, delay: 0.42, ease: EASE }}
          className="mt-3 text-[2.25rem] tracking-wider font-extrabold whitespace-nowrap text-black uppercase md:text-9xl"
        >
          THE NEW ERA
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.95, delay: 0.72, ease: EASE }}
          className="mt-4 max-w-[34ch] leading-relaxed text-balance text-neutral-600"
        >
         A new chapter of elevated essentials and statement silhouettes.
        </motion.p>
      </div>

      {/* ── Garments, hung off the rail ─────────────────────────────── */}
      <div className="pointer-events-none absolute inset-x-0 top-[48%] z-20 overflow-x-auto pb-8 md:overflow-visible md:pb-0">
        <div className="no-scrollbar relative z-20 mx-auto grid w-full max-w-6xl min-w-[720px] grid-cols-4 items-start gap-8 px-8 md:min-w-0">
          {featuredProducts.map((product, index) => (
            <HangingGarment key={product.id} product={product} index={index} />
          ))}
        </div>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.05 }}
        className="pointer-events-none absolute bottom-20 left-1/2 z-30 w-[min(90%,44ch)] -translate-x-1/2 text-center text-[11px] leading-relaxed tracking-[0.04em] text-neutral-500 uppercase md:bottom-8"
      >
        Designed for those who never follow the crowd.
      </motion.p>
    </section>
  )
}
