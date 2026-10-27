import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { Reveal, StaggerGroup, StaggerItem } from '@/components/ui/Reveal'
import { SmartImage } from '@/components/ui/SmartImage'
import { Action } from '@/components/ui/Action'
import { IMG } from '@/lib/images'
import { STORE_CURRENCY } from '@/lib/api/config'
import { formatMoney } from '@/lib/money'
import { useCollection } from '@/features/catalogue/useCatalogue'

const PRINCIPLES = [
  {
    index: '01',
    title: 'Cut once',
    body: 'Patterns are drafted, sampled and redrafted before a single metre is cut. When a run closes, the pattern is archived — not reissued at a different price.',
  },
  {
    index: '02',
    title: 'Named cloth',
    body: 'Every fabric is listed by weight, weave and mill. No vague descriptors, no seasonal rebrands hiding a cheaper substitution.',
  },
  {
    index: '03',
    title: 'Quiet hardware',
    body: 'Matte metal, tonal thread, hidden closures. The details should reward a closer look, not announce themselves across a room.',
  },
  {
    index: '04',
    title: 'Held to a number',
    body: 'Each piece is produced in a fixed run. Once the count is reached, the release closes and the piece moves to the archive.',
  },
] as const

export default function About() {
  const collection = useCollection()
  const pieces = collection.data ?? []

  // Two figures the catalogue can actually support: what is published, and what
  // it costs to enter. A studio claim like "six mills" would be copy, not data.
  const stats: { value: string; label: string }[] = [
    { value: collection.isLoading ? '—' : String(pieces.length).padStart(2, '0'), label: 'Pieces in release 01' },
    {
      value: collection.isLoading
        ? '—'
        : pieces.length > 0
          ? formatMoney(String(Math.min(...pieces.map((piece) => Number(piece.price)))), STORE_CURRENCY)
          : '—',
      label: 'Entry price, full collection',
    },
    {
      value: collection.isLoading ? '—' : String(new Set(pieces.map((piece) => piece.categoryId)).size).padStart(2, '0'),
      label: 'Departments in the catalogue',
    },
  ]

  return (
    <>
      <header className="container-editorial pt-28 pb-14 sm:pt-40 sm:pb-20">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-4"
        >
          <span className="h-px w-8 bg-line" aria-hidden />
          <span className="label-micro text-graphite">The studio</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 34 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="type-display mt-8 text-[15vw] leading-[0.82] sm:text-[10vw] lg:text-[9rem]"
        >
          Never
          <br />
          basic
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.95, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 max-w-xl text-sm leading-[1.85] text-graphite sm:text-base"
        >
          CTRL is a small studio making a deliberately small number of things. We started because
          the industry had optimised for replacement, and we wanted to build a wardrobe that
          rewards the second, third and fourth wear instead of the first impression.
        </motion.p>
      </header>

      <Reveal>
        <div className="container-editorial">
          <div className="relative overflow-hidden bg-bone">
            <div className="aspect-4/3 w-full sm:aspect-16/9">
              <SmartImage
                src={IMG.wide(5706273)}
                alt="Neutral garments arranged on a rail in a softly lit studio"
                className="h-full w-full"
                priority
              />
            </div>
            <div className="pointer-events-none absolute inset-0 border border-line" />
          </div>
          <div className="mt-4 flex items-start justify-between gap-6 border-t border-line pt-4">
            <p className="max-w-xs font-mono text-[10px] leading-relaxed tracking-[0.1em] text-graphite uppercase">
              Studio 04 — Rail study, natural light only
            </p>
            <span className="label-micro shrink-0 text-ash">Fig. 02</span>
          </div>
        </div>
      </Reveal>

      <section className="container-editorial py-20 sm:py-28">
        <Reveal>
          <div className="flex items-center gap-4">
            <span className="h-px w-8 bg-line" aria-hidden />
            <span className="label-micro text-graphite">How we work</span>
          </div>
        </Reveal>

        <StaggerGroup className="mt-10 grid gap-x-6 gap-y-px border-t border-line bg-line sm:grid-cols-2">
          {PRINCIPLES.map((principle) => (
            <StaggerItem key={principle.index}>
              <article className="group h-full bg-paper py-8 sm:py-10">
                <div className="flex items-baseline gap-5">
                  <span className="label-micro text-ash">{principle.index}</span>
                  <div>
                    <h2 className="type-display text-[7vw] leading-none sm:text-[2.6rem]">
                      {principle.title}
                    </h2>
                    <p className="mt-5 max-w-sm text-[13px] leading-[1.85] text-graphite sm:text-sm">
                      {principle.body}
                    </p>
                  </div>
                </div>
              </article>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </section>

      {/* Numbers */}
      <section className="border-y border-line">
        <div className="container-editorial grid gap-px sm:grid-cols-3">
          {stats.map((stat, index) => (
            <Reveal key={stat.label} delay={index * 0.06} className="py-10 sm:py-14">
              <p className="type-display text-[16vw] leading-none sm:text-[4.5rem]">{stat.value}</p>
              <p className="mt-4 font-mono text-[10px] tracking-[0.14em] text-graphite uppercase">
                {stat.label}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Closing */}
      <section className="container-editorial py-20 sm:py-32">
        <Reveal>
          <div className="grid gap-10 lg:grid-cols-12">
            <h2 className="type-display text-[12vw] leading-[0.86] sm:text-[7vw] lg:col-span-7">
              Wear it
              <br />
              until it
              <br />
              tells on
              <br />
              you
            </h2>
            <div className="flex flex-col items-start gap-6 lg:col-span-5 lg:justify-end">
              <p className="max-w-sm text-sm leading-[1.85] text-graphite sm:text-[15px]">
                A garment that gives up after three wears was never yours. Everything in the
                release is drafted to break in — to soften at the cuff, to fade at the knee, to
                take on the shape of how you actually move.
              </p>
              <Action to="/shop" size="lg" withArrow>
                Shop release 01
              </Action>
              <Link
                to="/shop"
                className="group label-micro inline-flex items-center gap-2 border-b border-ink pb-2"
              >
                Every piece
                <ArrowUpRight
                  size={13}
                  strokeWidth={1.5}
                  className="transition-transform duration-500 ease-editorial group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  )
}
