import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowUpRight,
  Heart,
  LayoutGrid,
  MapPin,
  PanelLeft,
  Receipt,
  ShoppingBag,
  UserRound,
  X,
} from 'lucide-react'
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll'
import { displayName, useAuth } from '@/features/auth/useAuth'
import { useWishlistActions } from '@/features/wishlist/useWishlistActions'

const EASE = [0.16, 1, 0.3, 1] as const

/**
 * The account's navigation. Every entry is a screen that exists and reads real
 * data — there is no placeholder entry, because a disabled link is a promise the
 * phase does not keep.
 */
const NAV = [
  { label: 'Overview', to: '/dashboard', icon: LayoutGrid },
  { label: 'Orders', to: '/dashboard/orders', icon: Receipt },
  { label: 'Wishlist', to: '/dashboard/wishlist', icon: Heart },
  { label: 'Bag', to: '/dashboard/bag', icon: ShoppingBag },
  { label: 'Addresses', to: '/dashboard/addresses', icon: MapPin },
  { label: 'Checkout', to: '/dashboard/checkout', icon: ArrowUpRight },
  { label: 'Profile', to: '/dashboard/profile', icon: UserRound },
] as const

const Mark = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
    <rect x="1.6" y="1.6" width="20.8" height="20.8" stroke="currentColor" strokeWidth="1.4" />
    <path d="M6 12h12" stroke="currentColor" strokeWidth="1.4" />
  </svg>
)

/** Restores scroll on navigation, matching the storefront layout. */
const ScrollToTop = () => {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])

  return null
}

/**
 * Active state is a bone fill plus a short ink rule on the left — not a solid
 * ink pill. A filled block on every screen is a lot of black to carry around
 * when the rail already marks position clearly enough.
 */
const navLinkClasses = (isActive: boolean) =>
  [
    'group relative flex items-center gap-3 px-3 py-2.5 transition-colors duration-200',
    isActive
      ? 'bg-bone text-ink before:absolute before:top-2 before:bottom-2 before:left-0 before:w-0.5 before:bg-ink'
      : 'text-graphite hover:bg-bone/60 hover:text-ink',
  ].join(' ')

/**
 * The account shell — a 240px left rail, a sticky topbar carrying the active
 * route and the account's own identity, and a slide-in drawer below `lg`.
 *
 * Deliberately does not reuse the storefront layout: no nav bar, no footer and no
 * bag drawer. The bag in the storefront is a local prototype with no relationship
 * to the server cart this shell is built around, and putting both in the same
 * chrome would invite exactly the confusion the two are kept apart to avoid.
 *
 * There is no notification bell here. Nothing in the API can produce a
 * notification, so the control would be a button that does nothing.
 */
export function AccountLayout() {
  const { pathname } = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { user } = useAuth()

  useLockBodyScroll(mobileOpen)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const active =
    NAV.find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`)) ?? NAV[0]

  const wishlistCount = useWishlistActions().itemCount
  const badgeFor = (to: string) => (to === '/dashboard/wishlist' && wishlistCount > 0 ? wishlistCount : undefined)

  return (
    <div className="flex min-h-svh bg-canvas">
      <ScrollToTop />

      <a
        href="#main"
        className="label-micro sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:bg-ink focus:px-4 focus:py-3 focus:text-paper"
      >
        Skip to content
      </a>

      {/* Left rail — desktop */}
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col justify-between border-r border-line bg-paper lg:flex">
        <div className="flex min-h-0 flex-1 flex-col">
          <Link
            to="/"
            className="group flex h-16 shrink-0 items-center gap-2.5 border-b border-line px-5"
            aria-label="CTRL — back to storefront"
          >
            <Mark className="size-4 transition-transform duration-500 ease-editorial group-hover:rotate-90" />
            <span className="text-[15px] font-extrabold tracking-[-0.03em] uppercase">CTRL</span>
          </Link>

          <nav aria-label="Account" className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
            {NAV.map(({ label, to, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/dashboard'}
                className={({ isActive }) => navLinkClasses(isActive)}
              >
                <Icon size={16} strokeWidth={1.5} aria-hidden />
                <span className="text-[13px] font-medium">{label}</span>
                {badgeFor(to) !== undefined && (
                  <span className="ml-auto font-mono text-[11px] text-ash tabular-nums">
                    {badgeFor(to)}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="shrink-0 border-t border-line p-3">
          <Link
            to="/"
            className="group flex items-center justify-between gap-3 px-3 py-2.5 text-graphite transition-colors duration-200 hover:bg-bone/60 hover:text-ink"
          >
            <span className="text-[13px]">View storefront</span>
            <ArrowUpRight
              size={14}
              strokeWidth={1.5}
              aria-hidden
              className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className={`sticky top-0 z-70 border-b border-line backdrop-blur-xl transition-colors duration-200 ${
            scrolled ? 'bg-canvas/90' : 'bg-canvas'
          }`}
        >
          <div className="container-editorial flex h-16 items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
                className="grid size-11 shrink-0 place-items-center border border-line bg-paper text-ink transition-colors duration-200 hover:border-ink hover:bg-ink hover:text-paper lg:hidden"
              >
                <PanelLeft size={18} strokeWidth={1.5} />
              </button>

              <span className="truncate text-[13px] font-medium">{active.label}</span>
            </div>

            {/* The real provisional identity, not an invented initials avatar. */}
            <Link
              to="/dashboard/profile"
              className="flex min-w-0 items-center gap-2.5 border border-line bg-paper py-1.5 pr-3 pl-1.5 transition-colors duration-200 hover:border-ink"
            >
              <span
                aria-hidden
                className="grid size-8 shrink-0 place-items-center bg-ink font-mono text-[11px] text-paper"
              >
                {initials(user?.firstName, user?.lastName)}
              </span>
              <span className="hidden min-w-0 truncate text-[13px] text-ink sm:block">
                {displayName(user) || 'Your account'}
              </span>
            </Link>
          </div>
        </header>

        <main id="main" className="flex-1">
          <div className="container-editorial py-8 sm:py-10">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Slide-in navigation below lg */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="account-nav"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[90] bg-ink/35 backdrop-blur-[2px] lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.5, ease: EASE }}
              className="flex h-full w-[82vw] max-w-[300px] flex-col border-r border-line bg-paper"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-4">
                <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 px-1">
                  <Mark className="size-4" />
                  <span className="text-[15px] font-extrabold tracking-[-0.03em] uppercase">CTRL</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close navigation"
                  className="grid size-11 place-items-center"
                >
                  <X size={20} strokeWidth={1.4} />
                </button>
              </div>

              <nav aria-label="Account" className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
                {NAV.map(({ label, to, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/dashboard'}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) => navLinkClasses(isActive)}
                  >
                    <Icon size={16} strokeWidth={1.5} aria-hidden />
                    <span className="text-[13px] font-medium">{label}</span>
                    {badgeFor(to) !== undefined && (
                      <span className="ml-auto font-mono text-[11px] text-ash tabular-nums">
                        {badgeFor(to)}
                      </span>
                    )}
                  </NavLink>
                ))}
              </nav>

              <div className="shrink-0 border-t border-line p-3">
                <Link
                  to="/"
                  onClick={() => setMobileOpen(false)}
                  className="group flex items-center justify-between gap-3 px-3 py-2.5 text-graphite transition-colors duration-200 hover:bg-bone/60 hover:text-ink"
                >
                  <span className="text-[13px]">View storefront</span>
                  <ArrowUpRight
                    size={14}
                    strokeWidth={1.5}
                    aria-hidden
                    className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** `"Alex Morgan"` → `AM`. Falls back to a dash rather than an empty square. */
const initials = (first?: string, last?: string): string => {
  const letters = `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase()
  return letters.length === 2 ? letters : '—'
}
