import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { ArrowRight } from 'lucide-react'
import { Reveal, StaggerGroup, StaggerItem } from '@/components/ui/Reveal'
import { SmartImage } from '@/components/ui/SmartImage'
import { IMG } from '@/lib/images'

const PILLARS = [
  {
    index: '01',
    title: 'Considered Volume',
    body: 'Silhouettes drafted with room to move. Nothing skims where it should not.',
  },
  {
    index: '02',
    title: 'Honest Cloth',
    body: 'Long-staple cotton, shuttle-loom denim, traceable merino. Chosen to age, not expire.',
  },
  {
    index: '03',
    title: 'Quiet Construction',
    body: 'Hidden closures, clean plackets, no logos shouting for attention.',
  },
] as const

export function Manifesto() {
  const section = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: section,
    offset: ['start end', 'end start'],
  })
  const imageY = useTransform(scrollYProgress, [0, 1], ['-8%', '8%'])
  const imageScale = useTransform(scrollYProgress, [0, 0.5, 1], [1.12, 1, 1.12])

  return (
    <section ref={section} className="container-editorial py-20 sm:py-32">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        {/* Copy column */}
        <div className="lg:col-span-5">
          <Reveal>
            <div className="flex items-center gap-4">
              <span className="h-px w-8 bg-line" aria-hidden />
              <span className="label-micro text-graphite">The Manifesto</span>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <h2 className="type-display mt-8 text-[13vw] leading-[0.86] sm:text-[7.5vw] lg:text-[4.1rem]">
              Made for
              <br />
              the ones
              <br />
              who decide
            </h2>
          </Reveal>

          <Reveal delay={0.16}>
            <p className="mt-8 max-w-md text-sm leading-[1.85] text-graphite sm:text-[15px]">
              CTRL was built around a single refusal: clothing designed to be replaced. Every piece
              in the release is drafted to hold its line, its weight and its character long after
              the season turns over.
            </p>
          </Reveal>

          <Reveal delay={0.22}>
            <Link
              to="/about"
              className="group label-micro mt-9 inline-flex items-center gap-3 border-b border-ink pb-2"
            >
              Read the full manifesto
              <ArrowRight
                size={13}
                strokeWidth={1.5}
                className="transition-transform duration-500 ease-editorial group-hover:translate-x-1"
              />
            </Link>
          </Reveal>

          <StaggerGroup className="mt-12 flex flex-col gap-px border-t border-line bg-line sm:mt-16">
            {PILLARS.map((pillar) => (
              <StaggerItem key={pillar.index}>
                <div className="group flex items-start gap-5 bg-paper py-5 transition-colors duration-500 ease-editorial hover:bg-bone sm:gap-7 sm:py-6">
                  <span className="label-micro pt-1 text-ash">{pillar.index}</span>
                  <div>
                    <h3 className="text-[13px] font-bold tracking-[-0.01em] uppercase sm:text-sm">
                      {pillar.title}
                    </h3>
                    <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-graphite">
                      {pillar.body}
                    </p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>

        {/* Parallax plate column */}
        <div className="relative lg:col-span-7">
          <Reveal y={40} delay={0.1}>
            <div className="relative overflow-hidden bg-bone">
              <motion.div style={{ y: imageY, scale: imageScale }} className="aspect-4/5 w-full">
                <SmartImage
                  src={IMG.wide(5706275)}
                  alt="A rail of neutral-toned garments hanging against a plain wall"
                  position="object-center"
                  className="h-full w-full"
                />
              </motion.div>
              <div className="pointer-events-none absolute inset-0 border border-line" />
            </div>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="mt-4 flex items-start justify-between gap-6 border-t border-line pt-4">
              <p className="max-w-xs font-mono text-[10px] leading-relaxed tracking-[0.1em] text-graphite uppercase">
                Studio 04 — Rail study, natural light only
              </p>
              <span className="label-micro shrink-0 text-ash">Fig. 01</span>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
