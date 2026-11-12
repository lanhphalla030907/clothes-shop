import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { IMG } from '@/lib/images'

// Using IMG.wide from your existing library to ensure images load correctly.
// In a real scenario, replace these with specific brand lifestyle images.
const HERO_IMAGE = IMG.wide(5706273)
const STORY_IMAGE = IMG.wide(5706274)
const QUALITY_IMAGE = IMG.wide(5706275)

// Official shop logo from public directory
const LOGO_SRC = '/logo.png'

export default function About() {

  return (
    <div className="bg-canvas text-ink font-sans selection:bg-[var(--ctrl-red)] selection:text-white">
      
      {/* SECTION 1: Hero — Brand Introduction */}
      <section className="relative w-full max-w-7xl mx-auto pt-24 pb-20 px-6 lg:px-12 flex flex-col lg:flex-row items-center">
        <div className="w-full lg:w-1/2 relative z-10 mb-12 lg:mb-0">
          {/* Official Shop Logo */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <img 
              src={LOGO_SRC} 
              alt="Shop Logo"
              className="w-full max-w-[280px] sm:max-w-[320px] lg:max-w-[360px] h-auto object-contain"
            />
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="flex items-center gap-4 mb-8"
          >
            <span className="h-px w-8 bg-[var(--ctrl-red)]" aria-hidden />
            <span className="label-micro text-graphite">The Brand</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }}
            className="type-display text-[15vw] sm:text-[8vw] lg:text-[6.5rem] leading-[0.9] tracking-tighter mb-8"
          >
            More Than<br />
            <span className="font-serif italic text-[var(--ctrl-red)]">Fashion.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }}
            className="text-[15px] leading-[1.85] text-graphite max-w-md mb-10"
          >
            CTRL is a premium studio dedicated to helping you achieve a healthier, stronger, and more permanent wardrobe through high-quality materials and deliberate construction.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.4 }}
          >
            <Link to="/shop" className="inline-flex items-center justify-center bg-ink text-canvas px-8 py-4 text-[11px] font-mono tracking-widest uppercase hover:bg-[var(--ctrl-red)] transition-colors duration-300">
              Explore Our Collection
            </Link>
          </motion.div>
        </div>

        {/* Hero Image Treatment */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.2 }}
          className="w-full lg:w-1/2 relative flex justify-end"
        >
          <div className="absolute bottom-0 left-0 right-16 h-[80%] bg-bone rounded-2xl -z-10 hidden lg:block" />
          <div className="w-full max-w-[500px] rounded-2xl overflow-hidden bg-bone border border-line shadow-sm">
            <img 
              src={HERO_IMAGE} 
              alt="Premium editorial fashion photography" 
              className="w-full h-auto object-cover aspect-[4/5]"
            />
          </div>
        </motion.div>
      </section>

      {/* SECTION 2: Our Story */}
      <section className="max-w-5xl mx-auto px-6 py-20 lg:py-28 border-t border-line">
        <div className="grid md:grid-cols-[1fr_1.5fr] gap-12 lg:gap-20 items-start">
          
          <motion.div 
            initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
          >
            <div className="rounded-2xl overflow-hidden border border-line bg-bone">
              <img 
                src={STORY_IMAGE} 
                alt="Studio craftsmanship and detail" 
                className="w-full h-auto object-cover aspect-[4/5]"
              />
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
            className="pt-2"
          >
            <div className="flex items-center gap-4 mb-4">
              <span className="text-[var(--ctrl-red)] font-mono font-medium text-sm">01</span>
              <span className="text-graphite/50 text-[10px] font-bold tracking-[0.2em] uppercase">Our Story</span>
            </div>
            
            <h2 className="type-display text-3xl sm:text-4xl mb-6">Born from intention.</h2>
            
            <div className="space-y-4 text-[14.5px] text-graphite leading-[1.85]">
              <p>
                <span className="float-left text-[4.5rem] leading-[0.75] font-serif italic text-[var(--ctrl-red)] pr-3 pt-2">
                  C
                </span>
                TRL was founded on the belief that a healthy, beautiful wardrobe begins with exceptional care. Every piece we create is thoughtfully developed using premium materials and innovative construction to deliver a luxurious experience. 
                {/* Placeholder: Replace with your actual brand origin story if available. */}
              </p>
              <p>
                Our vision is to build more than a clothing brand — we aim to inspire confidence, self-care, and permanence in every individual who chooses CTRL.
              </p>
              <p>
                Thank you for trusting us to be part of your journey. Your support motivates us to continue pursuing excellence and creating garments that meet the highest standards of quality.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* SECTION 3: Our Philosophy */}
      <section className="bg-bone py-24 px-6 border-y border-line">
        <div className="max-w-5xl mx-auto">
          <motion.div 
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="label-micro text-[var(--ctrl-red)] mb-4 block">Our Philosophy</span>
            <h2 className="type-display text-3xl sm:text-4xl">Three Pillars</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-12 text-center md:text-left">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
              <h3 className="text-xl font-semibold mb-4 text-ink">Quality</h3>
              <p className="text-[14.5px] text-graphite leading-relaxed">
                Focus on quality and thoughtful product selection. We prioritize enduring materials over seasonal trends.
              </p>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
              <h3 className="text-xl font-semibold mb-4 text-ink">Style</h3>
              <p className="text-[14.5px] text-graphite leading-relaxed">
                Timeless style with modern expression. Our designs are crafted to remain relevant beyond the current season.
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}>
              <h3 className="text-xl font-semibold mb-4 text-ink">Confidence</h3>
              <p className="text-[14.5px] text-graphite leading-relaxed">
                Clothing that helps people express themselves. We build garments that make you feel as good as you look.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 4: Our Approach to Quality */}
      <section className="max-w-5xl mx-auto px-6 py-24 lg:py-32">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          >
            <span className="label-micro text-[var(--ctrl-red)] mb-4 block">Our Approach</span>
            <h2 className="type-display text-3xl sm:text-4xl mb-6">Attention to detail.</h2>
            <div className="space-y-4 text-[14.5px] text-graphite leading-[1.85]">
              <p>
                {/* Placeholder: Add specific, verifiable details about your product selection and design process. */}
                We believe that the difference is in the details. From the initial sketch to the final stitch, our process is driven by a commitment to thoughtful design and practicality.
              </p>
              <p>
                We select materials not just for their appearance, but for their comfort, durability, and how they feel against the skin. Each piece is designed to be worn, lived in, and loved for years.
              </p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
          >
            <div className="rounded-2xl overflow-hidden border border-line bg-bone">
              <img 
                src={QUALITY_IMAGE} 
                alt="Detail shot of premium fabric and construction" 
                className="w-full h-auto object-cover aspect-square"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* SECTION 5: Brand Experience */}
      <section className="bg-ink text-canvas py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div 
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="label-micro text-[var(--ctrl-red)] mb-4 block">The Experience</span>
            <h2 className="type-display text-3xl sm:text-4xl">Seamless from start to finish.</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-12 border-t border-canvas/20 pt-12">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
              <h3 className="text-lg font-semibold mb-2">Easy Shopping</h3>
              <p className="text-[14px] text-canvas/60 leading-relaxed">
                A clean, intuitive storefront that makes finding your next piece simple.
              </p>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
              <h3 className="text-lg font-semibold mb-2">Reliable Delivery</h3>
              <p className="text-[14px] text-canvas/60 leading-relaxed">
                Tracked shipping to ensure your order arrives safely and on time.
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}>
              <h3 className="text-lg font-semibold mb-2">Customer Support</h3>
              <p className="text-[14px] text-canvas/60 leading-relaxed">
                A dedicated team available to help with any questions or concerns.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 6: Final CTA */}
      <section className="max-w-4xl mx-auto px-6 py-32 lg:py-40 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        >
          <h2 className="type-display text-4xl sm:text-6xl mb-6">
            Discover Your <span className="font-serif italic text-[var(--ctrl-red)]">Style.</span>
          </h2>
          <p className="text-[15px] text-graphite leading-relaxed mb-10 max-w-md mx-auto">
            Explore pieces designed to complement your everyday style.
          </p>
          <Link to="/shop" className="inline-flex items-center justify-center bg-ink text-canvas px-10 py-4 text-[11px] font-mono tracking-widest uppercase hover:bg-[var(--ctrl-red)] transition-colors duration-300">
            Shop Collection
          </Link>
        </motion.div>
      </section>

    </div>
  )
}