import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Reveal } from '@/components/ui/Reveal'
import { SmartImage } from '@/components/ui/SmartImage'
import { IMG } from '@/lib/images'

const STATS = [
  { value: '10', label: 'Pieces in release' },
  { value: '480', label: 'GSM heavyweight cotton' },
  { value: '06', label: 'Mills we work with' },
  { value: '∞', label: 'Seasons in rotation' },
] as const

/**
 * Full-bleed brand statement. The copy tracks scroll while the image drifts,
 * creating parallax without scroll-jacking.
 */
export function Statement() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const imageY = useTransform(scrollYProgress, [0, 1], ['-12%', '12%'])
  const textX = useTransform(scrollYProgress, [0, 1], ['0%', '-6%'])

  return (
    <section ref={ref} className="relative overflow-hidden bg-ink text-paper">
      <div className="container-editorial relative py-24 sm:py-36">
        <div className="pointer-events-none absolute inset-0 opacity-[0.16]">
          <motion.div style={{ y: imageY }} className="absolute inset-0 -top-[12%] h-[124%]">
            <SmartImage
              src={IMG.wide(38269422)}
              alt=""
              className="h-full w-full"
            />
          </motion.div>
          <div className="absolute inset-0 bg-ink/70" />
        </div>

        <Reveal>
          <div className="relative flex items-center gap-4">
            <span className="h-px w-8 bg-paper/40" aria-hidden />
            <span className="label-micro text-paper/60">Position</span>
          </div>
        </Reveal>

        <motion.h2
          style={{ x: textX }}
          className="type-display relative mt-10 text-[13vw] leading-[0.85] sm:text-[8.5vw] lg:text-[7.2rem]"
        >
          <Reveal as="span" className="block" delay={0.05}>
            We do not
          </Reveal>
          <Reveal as="span" className="block text-paper/35" delay={0.12}>
            follow seasons.
          </Reveal>
          <Reveal as="span" className="block" delay={0.19}>
            We set them.
          </Reveal>
        </motion.h2>

        <div className="relative mt-16 grid gap-10 border-t border-paper/15 pt-10 sm:grid-cols-2 sm:gap-16 lg:grid-cols-4">
          {STATS.map((stat, index) => (
            <Reveal key={stat.label} delay={index * 0.06}>
              <p className="type-display text-[13vw] leading-none sm:text-[3.6vw]">{stat.value}</p>
              <p className="mt-3 font-mono text-[10px] tracking-[0.14em] text-paper/55 uppercase">
                {stat.label}
              </p>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <Link
            to="/about"
            className="group relative mt-14 inline-flex items-center gap-3 border-b border-paper/50 pb-2 label-micro transition-colors duration-500 ease-editorial hover:border-paper"
          >
            Inside the studio
            <ArrowUpRight
              size={13}
              strokeWidth={1.5}
              className="transition-transform duration-500 ease-editorial group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </Link>
        </Reveal>
      </div>
    </section>
  )
}
