import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, ShoppingBag, X } from 'lucide-react'
import { navLinks } from '@/data/navigation'
import { useAuth } from '@/features/auth/useAuth'
import { useCartActions } from '@/features/cart/useCartActions'
import { useUI } from '@/hooks/useUI'
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll'

const EASE = [0.16, 1, 0.3, 1] as const

/** The CTRL mark — a struck-through square, echoing the brand's restraint. */
const Mark = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
    <rect x="1.6" y="1.6" width="20.8" height="20.8" stroke="currentColor" strokeWidth="1.4" />
    <path d="M6 12h12" stroke="currentColor" strokeWidth="1.4" />
  </svg>
)

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const { isMenuOpen, openMenu } = useUI()
  // The bag is the server's cart, so the count moves the moment a quick add
  // lands and the link goes where those lines actually are.
  const { itemCount } = useCartActions()
  const { isAuthenticated, isInitializing, logout } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  useLockBodyScroll(isMenuOpen)

  /**
   * Signing out from a protected screen has to leave it, or the guard would
   * bounce the shopper to the sign-in form they have just walked away from.
   * From a public page there is nothing to leave, so the page stays put.
   */
  const signOut = () => {
    logout()
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
      navigate('/', { replace: true })
    }
  }

  // The home hero carries its own chrome, so the bar stays out of the way
  // until the page is scrolled — but it still surfaces for keyboard users.
  const isHome = pathname === '/'
  const docked = scrolled || !isHome

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-80 transition-all duration-600 ease-editorial focus-within:pointer-events-auto focus-within:opacity-100 ${
          docked
            ? 'border-b border-line bg-canvas/85 opacity-100 backdrop-blur-xl'
            : 'pointer-events-none border-b border-transparent opacity-0'
        }`}
      >
        <div className="container-editorial flex h-16 items-center justify-between gap-6 sm:h-20">
          {/* Wordmark */}
          <Link
            to="/"
            className="group flex items-center gap-2.5"
            aria-label="CTRL — home"
          >
            <Mark className="size-4 text-ink transition-transform duration-700 ease-editorial group-hover:rotate-90 sm:size-[18px]" />
            <span className="text-[15px] font-extrabold tracking-[-0.03em] uppercase sm:text-base">
              CTRL
            </span>
          </Link>

          {/* Desktop nav — centred, editorial, hairline underlines */}
          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-9 lg:flex">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className="label-micro link-wipe text-graphite transition-colors duration-400 ease-editorial hover:text-ink"
                data-active={pathname === link.to ? 'true' : undefined}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Right cluster */}
          <div className="flex items-center gap-1 sm:gap-4">
            <Link
              to="/about"
              className="label-micro link-wipe hidden text-graphite transition-colors duration-400 ease-editorial hover:text-ink md:inline-flex"
              data-active={pathname === '/about' ? 'true' : undefined}
            >
              Studio
            </Link>

            {/* The session, and the only doorway into the dashboard from here.
                Nothing is rendered while a stored token is still being checked:
                showing "Sign in" for the length of one request would read as
                having been signed out by the reload. */}
            {!isInitializing &&
              (isAuthenticated ? (
                <>
                  <Link
                    to="/dashboard"
                    className="label-micro link-wipe hidden text-graphite transition-colors duration-400 ease-editorial hover:text-ink sm:inline-flex"
                    data-active={pathname.startsWith('/dashboard') ? 'true' : undefined}
                  >
                    Account
                  </Link>
                  <button
                    type="button"
                    onClick={signOut}
                    className="label-micro link-wipe hidden text-graphite transition-colors duration-400 ease-editorial hover:text-ink sm:inline-flex"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="label-micro link-wipe hidden text-graphite transition-colors duration-400 ease-editorial hover:text-ink sm:inline-flex"
                  data-active={pathname === '/login' ? 'true' : undefined}
                >
                  Sign in
                </Link>
              ))}

            <Link
              to="/dashboard/bag"
              data-active={pathname.startsWith('/dashboard/bag') ? 'true' : undefined}
              className="group relative flex items-center gap-2 py-2 pl-3 text-ink"
              aria-label={`Your bag, ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
            >
              <ShoppingBag size={17} strokeWidth={1.4} className="transition-transform duration-500 ease-editorial group-hover:-translate-y-0.5" />
              <span className="label-micro tabular-nums">
                <span className="hidden sm:inline">Bag&nbsp;</span>
                {String(itemCount).padStart(2, '0')}
              </span>
              <span
                className={`pointer-events-none absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-ink transition-transform duration-500 ease-editorial group-hover:scale-x-100 ${
                  itemCount > 0 ? 'scale-x-100' : ''
                }`}
              />
            </Link>

            <button
              type="button"
              onClick={openMenu}
              aria-label="Open menu"
              className="grid size-9 place-items-center lg:hidden"
            >
              <Menu size={19} strokeWidth={1.4} />
            </button>
          </div>
        </div>
      </header>

      <MobileMenu />
    </>
  )
}

/** Full-bleed overlay menu — a page, not a dropdown. */
function MobileMenu() {
  const { isMenuOpen, closeMenu } = useUI()

  // Local toggle lives here so the header button can stay declarative.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeMenu()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeMenu])

  return (
    <AnimatePresence>
      {isMenuOpen && (
        <motion.div
          key="menu"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[85] bg-paper lg:hidden"
        >
          <div className="container-editorial flex h-16 items-center justify-between sm:h-20">
            <Link to="/" onClick={closeMenu} className="flex items-center gap-2.5">
              <Mark className="size-4" />
              <span className="text-[15px] font-extrabold tracking-[-0.03em] uppercase">CTRL</span>
            </Link>
            <button
              type="button"
              onClick={closeMenu}
              aria-label="Close menu"
              className="grid size-9 place-items-center"
            >
              <X size={20} strokeWidth={1.4} />
            </button>
          </div>

          <nav className="container-editorial flex flex-1 flex-col justify-center gap-2">
            {[...navLinks, { label: 'Bag', to: '/dashboard/bag' }, { label: 'Account', to: '/dashboard' }].map((link, index) => (
              <motion.div
                key={link.to}
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.06 * index, ease: EASE }}
              >
                <Link
                  to={link.to}
                  onClick={closeMenu}
                  className="type-display block border-b border-line py-4 text-[13vw] leading-[0.9] transition-colors duration-400 ease-editorial hover:text-graphite sm:text-[11vw]"
                >
                  {link.label}
                </Link>
              </motion.div>
            ))}
          </nav>

          <div className="container-editorial flex items-end justify-between gap-6 border-t border-line py-6">
            <p className="font-mono text-[10px] leading-relaxed tracking-[0.14em] text-graphite uppercase">
              June 2026
              <br />
              Release 01
            </p>
            <p className="text-right font-mono text-[10px] leading-relaxed tracking-[0.14em] text-ash uppercase">
              Designed for those
              <br />
              who never follow the crowd
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
