import { Hero } from '@/components/home/Hero'
import { Marquee } from '@/components/home/Marquee'
import { Manifesto } from '@/components/home/Manifesto'
import { EditorialGrid } from '@/components/home/EditorialGrid'
import { Statement } from '@/components/home/Statement'
import { ProductRail } from '@/components/product/ProductRail'
import { Reveal } from '@/components/ui/Reveal'
import { Action } from '@/components/ui/Action'
import { products, featuredProducts } from '@/data/products'

export default function Home() {
  const railProducts = [...featuredProducts, ...products.filter((p) => !p.featured)].slice(0, 8)

  return (
    <>
      <Hero />

      <div id="rail" className="scroll-mt-24">
        <Marquee />
        <ProductRail products={railProducts} label="The Rail — Release 01" className="py-16 sm:py-24" />
      </div>

      <Manifesto />
      <Statement />
      <EditorialGrid />

      {/* Closing call to action */}
      <section className="container-editorial py-20 sm:py-28">
        <Reveal>
          <div className="flex flex-col items-start gap-8 border-t border-line pt-12 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="type-display max-w-2xl text-[13vw] leading-[0.86] sm:text-[7vw]">
              Never
              <br />
              basic
            </h2>
            <div className="flex flex-col items-start gap-4 sm:items-end">
              <p className="max-w-xs text-sm leading-relaxed text-graphite sm:text-right">
                Ten pieces. One release. Once it is gone, it is archived — not restocked.
              </p>
              <Action to="/shop" variant="solid" size="lg" withArrow>
                Shop the collection
              </Action>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  )
}
