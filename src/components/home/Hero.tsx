import { useEffect, useRef } from 'react'
import { motion, useAnimationFrame, useReducedMotion } from 'framer-motion'

/* ================================================================== */
/* PRODUCTS                                                            */
/* ================================================================== */
type Product = { id: string; name: string; image: string }

const products: Product[] = [
  { id: 'p1', name: 'Butterfly Oversized Tshirt', image: '/garments/image2.png' },
  { id: 'p2', name: 'Ghost Oversized Tshirt', image: '/garments/image4.png' },
  { id: 'p3', name: 'Skull Oversized Tshirt', image: '/garments/image5.png' },
  { id: 'p4', name: 'Fearless Oversized Tshirt', image: '/garments/image.png' },
  { id: 'p5', name: 'Soul Oversized Tshirt', image: '/garments/image3.png' },
]

const RAIL_ITEMS = [...products, ...products, ...products]

const EASE = [0.16, 1, 0.3, 1] as const
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

/* ================================================================== */
/* Fonts + CSS                                                         */
/* ================================================================== */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wght@400;500;600;700&family=Permanent+Marker&display=swap');
.tux-hero{--ink:#000;--paper:#fff;font-family:'Archivo',ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;color:var(--ink)}
.tux-display{font-family:'Anton','Bebas Neue',Impact,'Arial Narrow',sans-serif;font-weight:400;text-transform:uppercase;letter-spacing:-0.005em}
.tux-logo{font-family:'Permanent Marker','Brush Script MT',cursive}
@keyframes tux-drift{0%,100%{transform:translateX(0)}50%{transform:translateX(20px)}}
.tux-cloud{animation:tux-drift var(--d,20s) ease-in-out infinite}
@media (prefers-reduced-motion:reduce){.tux-cloud{animation:none}}
`

/* ================================================================== */
/* Cloud Background                                                    */
/* ================================================================== */
function CloudBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <svg className="tux-cloud absolute top-[20%] left-[-10%] w-[600px] text-gray-100 blur-2xl opacity-60" style={{ '--d': '25s' } as React.CSSProperties} viewBox="0 0 100 50">
        <path d="M10 40 Q 20 20 40 30 Q 50 10 70 25 Q 90 15 100 35 Q 110 50 90 50 L 20 50 Q 0 50 10 40 Z" fill="currentColor" />
      </svg>
      <svg className="tux-cloud absolute top-[35%] right-[-10%] w-[700px] text-gray-100 blur-2xl opacity-50" style={{ '--d': '30s', animationDirection: 'reverse' } as React.CSSProperties} viewBox="0 0 100 50">
        <path d="M10 40 Q 20 20 40 30 Q 50 10 70 25 Q 90 15 100 35 Q 110 50 90 50 L 20 50 Q 0 50 10 40 Z" fill="currentColor" />
      </svg>
    </div>
  )
}

/* ================================================================== */
/* NEW DESIGN: Giant Background Typography                             */
/* ================================================================== */
function BackgroundTypography() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[5vh] z-10 flex w-full items-center justify-center overflow-hidden">
      <motion.h2 
        className="tux-display whitespace-nowrap text-[25vw] leading-none text-black opacity-[0.03] select-none"
        initial={{ y: 50 }}
        animate={{ y: 0 }}
        transition={{ duration: 1.5, ease: EASE }}
      >
        LOMOR
      </motion.h2>
    </div>
  )
}

/* ================================================================== */
/* Tee rail (កោងចុះក្រោម និងធំជាងមុនបន្តិច)                              */
/* ================================================================== */
function TeeRail({ reduced, kickRef }: { reduced: boolean | null; kickRef: React.MutableRefObject<(d: 1 | -1) => void> }) {
  const wrap = useRef<HTMLDivElement>(null)
  const els = useRef<(HTMLAnchorElement | null)[]>([])
  const offset = useRef(0)
  const velocity = useRef(0)
  const dir = useRef<1 | -1>(-1)
  const dragging = useRef(false)
  const hovering = useRef(false)
  const lastX = useRef(0)
  const lastT = useRef(0)
  const moved = useRef(0)

  kickRef.current = (d) => {
    dir.current = d
    velocity.current = d * 1500
  }

  useAnimationFrame((time, delta) => {
    const box = wrap.current
    const first = els.current[0]
    if (!box || !first) return
    const dt = Math.min(delta, 50) / 1000
    const w = box.clientWidth
    
    const isMobile = w < 640
    const isTablet = w >= 640 && w < 1024
    
    const itemW = first.offsetWidth || (isMobile ? 120 : (isTablet ? 180 : 240))
    
    const baseSpeed = isMobile ? 30 : (isTablet ? 40 : 50)
    const base = reduced ? 0 : dir.current * (hovering.current ? 14 : baseSpeed)
    
    if (!dragging.current) {
      velocity.current += (base - velocity.current) * Math.min(1, dt * 2)
      offset.current += velocity.current * dt
    }

    const gapMultiplier = isMobile ? 1.0 : (isTablet ? 0.95 : 0.9)
    const gap = itemW * gapMultiplier
    const total = gap * RAIL_ITEMS.length
    
    RAIL_ITEMS.forEach((_, i) => {
      const el = els.current[i]
      if (!el) return
      
      let x = (((i * gap + offset.current) % total) + total) % total
      x -= total / 2
      
      const nx = Math.min(1.2, Math.abs(x) / (w / 2))
      
      const scale = isMobile 
        ? 0.9 + 0.1 * Math.pow(nx, 1.5) 
        : 0.8 + 0.3 * Math.pow(nx, 1.5)
        
      // បន្ថយ curveDepth នៅលើទូរស័ព្ទ ដើម្បីកុំឲ្យវាធ្លាក់ចុះទាបពេក
      const curveDepth = isMobile ? 30 : 120; 
      const yOffset = Math.pow(nx, 2) * curveDepth; 

      const bob = reduced ? 0 : Math.sin(time / 1000 + i * 1.7) * (isMobile ? 4 : 6)
      const rot = (x / w) * (isMobile ? 10 : 18)
      
      el.style.transform = `translate3d(${x}px, ${yOffset + bob}px, 0) translate(-50%, -50%) rotate(${rot}deg) scale(${scale})`
      el.style.zIndex = String(Math.round(scale * 20))
      el.style.opacity = nx > 1.05 ? '0' : '1'
    })
  })

  const down = (e: React.PointerEvent) => {
    dragging.current = true
    moved.current = 0
    lastX.current = e.clientX
    lastT.current = performance.now()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const move = (e: React.PointerEvent) => {
    if (!dragging.current) return
    const now = performance.now()
    const dx = e.clientX - lastX.current
    offset.current += dx
    velocity.current = (dx / Math.max(1, now - lastT.current)) * 1000
    if (Math.abs(velocity.current) > 40) dir.current = velocity.current > 0 ? 1 : -1
    moved.current += Math.abs(dx)
    lastX.current = e.clientX
    lastT.current = now
  }
  const up = () => {
    dragging.current = false
    velocity.current = clamp(velocity.current, -2600, 2600)
  }

  return (
    <div
      ref={wrap}
      role="group"
      aria-roledescription="carousel"
      aria-label="New arrivals."
      tabIndex={0}
      className="relative h-full cursor-grab select-none outline-none active:cursor-grabbing"
      style={{ touchAction: 'pan-y' }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onPointerEnter={(e) => (hovering.current = e.pointerType === 'mouse')}
      onPointerLeave={() => (hovering.current = false)}
      onWheel={(e) => {
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) offset.current -= e.deltaX
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') kickRef.current(1)
        if (e.key === 'ArrowRight') kickRef.current(-1)
      }}
    >
      {RAIL_ITEMS.map((p, i) => {
        const copy = i >= products.length
        return (
          <a
            key={i}
            ref={(el) => {
              els.current[i] = el
            }}
            href={`/product/${p.id}`}
            draggable={false}
            tabIndex={-1}
            aria-hidden={copy || undefined}
            aria-label={copy ? undefined : p.name}
            onClick={(e) => {
              if (moved.current > 6) e.preventDefault()
            }}
            className="absolute left-1/2 top-1/2 block w-[38vw] sm:w-[clamp(12rem,22vw,18rem)] will-change-transform"
          >
            <img
              ref={(img) => {
                if (img?.complete) img.classList.remove('opacity-0')
              }}
              src={p.image}
              alt=""
              draggable={false}
              decoding="async"
              onLoad={(e) => e.currentTarget.classList.remove('opacity-0')}
              className="h-auto w-full select-none opacity-0 drop-shadow-[0_15px_15px_rgba(0,0,0,0.15)] transition-opacity duration-700"
            />
          </a>
        )
      })}
    </div>
  )
}

/* ================================================================== */
/* Hero                                                                */
/* ================================================================== */
export function Hero() {
  const reduced = useReducedMotion()
  const kickRef = useRef<(d: 1 | -1) => void>(() => {})
  const words = ['FEARLESS', 'SOUL']

  return (
    <section className="tux-hero relative isolate flex h-svh min-h-[40rem] flex-col overflow-hidden bg-white">
      <style>{CSS}</style>

      <CloudBackground />
      <BackgroundTypography />

      <header className="relative z-40 flex items-center justify-between px-[clamp(1.25rem,4vw,3.5rem)] pt-[clamp(1rem,2.4vw,2rem)]">
        <motion.a
          href="/"
          aria-label="LOMOR home"
          className="tux-logo inline-block -rotate-6 select-none text-[2rem] leading-none sm:text-[2.4rem]"
          initial={reduced ? false : { opacity: 0, rotate: -14, y: -10 }}
          animate={{ opacity: 1, rotate: -6, y: 0 }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          LOMOR
        </motion.a>
        <motion.nav
          aria-label="Primary"
          className="flex gap-5 text-[0.82rem] font-semibold sm:gap-9 sm:text-[0.95rem]"
          initial={reduced ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: EASE }}
        >
          {[
            ['New & Featured', 'New', '/new'],
            ['Men', 'Men', '/men'],
            ['Women', 'Women', '/women'],
          ].map(([long, short, href]) => (
            <a key={href} href={href} className="underline-offset-[6px] decoration-2 hover:underline focus-visible:underline focus-visible:outline-none">
              <span className="hidden sm:inline">{long}</span>
              <span className="sm:hidden">{short}</span>
            </a>
          ))}
        </motion.nav>
      </header>

      <h1 className="tux-display relative z-30 mt-[6svh] flex flex-col items-center text-center text-[14vw] leading-[0.86] sm:flex-row sm:justify-center sm:gap-[0.22em] sm:text-[8vw] 2xl:text-[9rem]">
        {words.map((word, wi) => (
          <span key={word} className="flex">
            {word.split('').map((ch, ci) => (
              <span key={ci} className="block overflow-hidden pb-[0.03em]">
                <motion.span
                  className="block"
                  initial={reduced ? false : { y: '110%' }}
                  animate={{ y: 0 }}
                  transition={{ duration: 1.1, delay: 0.2 + (wi * 8 + ci) * 0.05, ease: EASE }}
                >
                  {ch}
                </motion.span>
              </span>
            ))}
          </span>
        ))}
      </h1>

      <motion.div
        className="relative z-30 mt-4 flex flex-col items-center gap-5 px-6 text-center"
        initial={reduced ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 1.1, ease: EASE }}
      >
        <p className="max-w-md text-[clamp(0.85rem,1.2vw,1.05rem)] font-medium leading-relaxed tracking-wide text-black/70">
          Wear your story. Oversized tees crafted for the fearless &amp; the free — made to move with you.
        </p>
        <a
          href="/new"
          className="group relative inline-flex items-center gap-2 rounded-full bg-black px-8 py-3.5 text-[0.85rem] font-semibold uppercase tracking-[0.12em] text-white transition-all duration-300 hover:scale-[1.03] hover:bg-black/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black active:scale-[0.98]"
        >
          Shop the Collection
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </a>
      </motion.div>

      {/* 
        កែសម្រួល៖ 
        - ប្តូរ flex-1 ទៅជា flex-none នៅលើទូរស័ព្ទ (ដើម្បីកុំឲ្យវាទាញទំហំធំ)
        - បង្កើនកម្ពស់អប្បបរមា (min-h) ដើម្បីឲ្យមានកន្លែងដាក់សម្លៀកបំពាក់
        - បន្ថយ mb (margin bottom) ដើម្បីឲ្យវាមិនទាបពេក
      */}
      <motion.div
        className="relative z-20 flex-none mt-2 h-[35vh] min-h-[220px] sm:flex-1 sm:mt-6 sm:mb-[12svh] sm:h-auto sm:min-h-0"
        initial={reduced ? false : { opacity: 0, y: 50, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1.3, delay: 0.6, ease: EASE }}
      >
        <TeeRail reduced={reduced} kickRef={kickRef} />
      </motion.div>

      <motion.p
        aria-hidden
        className="tux-display pointer-events-none absolute bottom-[4svh] left-1/2 z-30 text-[clamp(1.5rem,4vw,3.5rem)] leading-none text-white"
        style={{ WebkitTextStroke: '2px #000', paintOrder: 'stroke fill', x: '-50%' }}
        initial={reduced ? false : { opacity: 0, y: 30, rotate: -14 }}
        animate={{ opacity: 1, y: 0, rotate: -8 }}
        transition={{ duration: 1, delay: 1.3, ease: EASE }}
      >
        Originals
      </motion.p>
    </section>
  )
}

export default Hero