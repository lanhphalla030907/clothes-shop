import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { Reveal } from '@/components/ui/Reveal'
import { SmartImage } from '@/components/ui/SmartImage'
import { IMG } from '@/lib/images'

const EDITS = [
  {
    id: 'look-01',
    label: 'Look 01',
    title: 'Monochrome Volume',
    body: 'Heavy tee under the double-breasted blazer. Proportion doing the talking.',
    image: IMG.wide(14920934),
    span: 'lg:col-span-7',
    ratio: 'aspect-4/3',
  },
  {
    id: 'look-02',
    label: 'Look 02',
    title: 'Denim, Unwashed',
    body: 'The wide fall, held high at the waist. Rigid cotton, softened by wear.',
    image: IMG.wide(16729456),
    span: 'lg:col-span-5',
    ratio: 'aspect-4/5',
  },
  {
    id: 'look-03',
    label: 'Look 03',
    title: 'Quiet Structure',
    body: 'A cap, a knit, nothing else. The restraint is the styling.',
    image: IMG.wide(30095407),
    span: 'lg:col-span-5',
    ratio: 'aspect-4/5',
  },
  {
    id: 'look-04',
    label: 'Look 04',
    title: 'Off Duty',
    body: 'Cargo in the studio. Utility, stripped of its noise.',
    image: IMG.wide(35043249),
    span: 'lg:col-span-7',
    ratio: 'aspect-4/3',
  },
] as const

/** Asymmetric editorial grid — the collection shown as looks, not SKUs. */
export function EditorialGrid() {
  return (
    <section className="container-editorial py-20 sm:py-28">
      <Reveal>
        <div className="flex flex-col gap-6 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-4">
              <span className="h-px w-8 bg-line" aria-hidden />
              <span className="label-micro text-graphite">The Edit</span>
            </div>
            <h2 className="type-display mt-6 text-[13vw] leading-[0.86] sm:text-[7vw]">
              Four ways
              <br />
              to wear it
            </h2>
          </div>
          <Link
            to="/shop"
            className="group label-micro inline-flex items-center gap-3 self-start border-b border-ink pb-2 sm:self-auto"
          >
            View all pieces
            <ArrowUpRight
              size={13}
              strokeWidth={1.5}
              className="transition-transform duration-500 ease-editorial group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </Reveal>

      <div className="mt-10 grid gap-x-5 gap-y-12 sm:mt-14 sm:gap-x-6 sm:gap-y-16 lg:grid-cols-12">
        {EDITS.map((edit, index) => (
          <Reveal key={edit.id} as="article" className={edit.span} delay={(index % 2) * 0.08}>
            <Link to="/shop" className="group/edit block">
              <div className={`relative overflow-hidden bg-bone ${edit.ratio}`}>
                <SmartImage
                  src={edit.image}
                  alt={edit.title}
                  className="h-full w-full transition-transform duration-[1.5s] ease-editorial group-hover/edit:scale-[1.05]"
                />
                <div className="pointer-events-none absolute inset-0 border border-transparent transition-colors duration-500 ease-editorial group-hover/edit:border-ink/20" />
                <span className="label-micro absolute top-3 left-3 bg-paper/85 px-2 py-1.5 text-ink backdrop-blur-sm">
                  {edit.label}
                </span>
              </div>
              <div className="mt-4 flex items-start justify-between gap-5 border-t border-line pt-3">
                <div>
                  <h3 className="text-[13px] font-bold tracking-[-0.01em] uppercase sm:text-sm">
                    {edit.title}
                  </h3>
                  <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-graphite">
                    {edit.body}
                  </p>
                </div>
                <ArrowUpRight
                  size={15}
                  strokeWidth={1.4}
                  className="mt-0.5 shrink-0 text-ash transition-all duration-500 ease-editorial group-hover/edit:-translate-y-0.5 group-hover/edit:translate-x-0.5 group-hover/edit:text-ink"
                />
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
