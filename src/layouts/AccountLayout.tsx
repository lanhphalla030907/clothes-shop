import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, LogOut, Menu, Store, X } from 'lucide-react'
import { accountNavigation } from '@/data/accountNavigation'
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll'
import { useAuth } from '@/features/auth/useAuth'
import { useCartActions } from '@/features/cart/useCartActions'
import { useWishlistActions } from '@/features/wishlist/useWishlistActions'

const EASE = [0.16, 1, 0.3, 1] as const

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
    'group relative flex min-h-11 items-center gap-2.5 px-3 text-[13.5px] font-medium transition-colors duration-200',
    isActive
      ? 'bg-bone text-ink before:absolute before:top-2 before:bottom-2 before:left-0 before:w-0.5 before:bg-ink'
      : 'text-graphite hover:bg-bone/60 hover:text-ink',
  ].join(' ')

/** The signed-in identity card repeated in the rail and the mobile drawer. */
const IdentityCard = ({
  firstName,
  lastName,
  email,
  onNavigate,
}: {
  firstName?: string
  lastName?: string
  email?: string
  onNavigate?: () => void
}) => (
  <Link
    to="/dashboard/profile"
    onClick={onNavigate}
    className="group flex items-center gap-3 px-2 py-2 transition-colors duration-200 hover:bg-bone"
  >
    <span
      aria-hidden
      className="grid size-9 shrink-0 place-items-center bg-ink font-mono text-[11px] tracking-wide text-paper"
    >
      {initials(firstName, lastName)}
    </span>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-[13.5px] font-semibold text-ink">
        {`${firstName ?? ''} ${lastName ?? ''}`.trim() || 'Your account'}
      </span>
      {email && <span className="mt-0.5 block truncate text-[12px] text-graphite">{email}</span>}
    </span>
    <ArrowUpRight
      size={14}
      strokeWidth={1.6}
      aria-hidden
      className="shrink-0 text-ash transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
    />
  </Link>
)

/**
 * The account shell — a grouped left rail, a sticky breadcrumb bar, and a
 * slide-in drawer below `lg`.
 *
 * Deliberately does not reuse the storefront layout: no nav bar, no footer and no
 * bag drawer. The bag in the storefront is a local prototype with no relationship
 * to the server cart this shell is built around, and putting both in the same
 * chrome would invite exactly the confusion the two are kept apart to avoid.
 */
export function AccountLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { user, logout } = useAuth()

  const menuButton = useRef<HTMLButtonElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)

  const bagCount = useCartActions().cart?.itemCount ?? 0
  const wishlistCount = useWishlistActions().itemCount

  useLockBodyScroll(mobileOpen)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!mobileOpen) return undefined
    closeButton.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setMobileOpen(false)
      menuButton.current?.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [mobileOpen])

  const activeItem = accountNavigation
    .flatMap((group) => group.items)
    .find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`))

  const handleSignOut = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const countFor = (key: 'bag' | 'wishlist' | undefined) =>
    key === 'bag' ? bagCount : key === 'wishlist' ? wishlistCount : 0

  const sectionNav = (onNavigate?: () => void) => (
    <nav aria-label="Account" className="flex flex-col gap-6">
      {accountNavigation.map((group) => (
        <div key={group.title}>
          <p className="eyebrow px-3 text-graphite">{group.title}</p>
          <ul className="mt-2 space-y-0.5">
            {group.items.map(({ label, to, icon: Icon, countKey }) => {
              const count = countFor(countKey)
              return (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={to === '/dashboard'}
                    onClick={onNavigate}
                    className={({ isActive }) => navLinkClasses(isActive)}
                  >
                    <Icon size={16} strokeWidth={1.6} aria-hidden className="shrink-0" />
                    <span className="flex-1">{label}</span>
                    {count > 0 && (
                      <span className="font-mono text-[11px] text-graphite tabular-nums">{count}</span>
                    )}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )

  return (
    <div className="flex min-h-svh bg-canvas">
      <ScrollToTop />

      <a
        href="#main"
        className="eyebrow sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:bg-ink focus:px-4 focus:py-3 focus:text-paper"
      >
        Skip to content
      </a>

      {/* Left rail — desktop */}
      <aside className="sticky top-0 hidden h-svh w-[16.5rem] shrink-0 flex-col border-r border-line bg-paper lg:flex">
        <div className="flex min-h-0 flex-1 flex-col">
          <Link
            to="/"
            className="group flex h-16 shrink-0 items-center gap-2.5 border-b border-line px-5"
          >
            <Mark className="size-4 transition-transform duration-500 ease-editorial group-hover:rotate-90" />
            <span className="text-[15px] font-extrabold tracking-[-0.03em] uppercase">CTRL</span>
            <span className="ml-auto text-[11px] font-semibold tracking-[0.08em] text-graphite uppercase">
              Account
            </span>
          </Link>

          <div className="border-b border-line px-3 py-3">
            <IdentityCard
              firstName={user?.firstName}
              lastName={user?.lastName}
              email={user?.email}
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5">{sectionNav()}</div>
        </div>

        <div className="shrink-0 space-y-1 border-t border-line p-3">
          <Link
            to="/"
            className="group flex min-h-11 items-center gap-2.5 px-3 text-[13px] text-graphite transition-colors duration-200 hover:bg-bone/60 hover:text-ink"
          >
            <Store size={15} strokeWidth={1.6} aria-hidden />
            <span className="flex-1">Storefront</span>
            <ArrowUpRight
              size={14}
              strokeWidth={1.6}
              aria-hidden
              className="text-ash transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="group flex min-h-11 w-full items-center gap-2.5 px-3 text-left text-[13px] text-graphite transition-colors duration-200 hover:bg-bone/60 hover:text-ink"
          >
            <LogOut size={15} strokeWidth={1.6} aria-hidden />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className={`sticky top-0 z-70 border-b border-line backdrop-blur-xl transition-colors duration-200 ${
            scrolled ? 'bg-canvas/90' : 'bg-canvas'
          }`}
        >
          <div className="container-account flex h-16 items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <button
                ref={menuButton}
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Open account navigation"
                aria-expanded={mobileOpen}
                className="grid size-11 shrink-0 place-items-center border border-line bg-paper text-ink transition-colors duration-200 hover:border-ink hover:bg-ink hover:text-paper lg:hidden"
              >
                <Menu size={18} strokeWidth={1.6} />
              </button>

              <p className="min-w-0 truncate text-[13px] text-graphite">
                <span className="hidden sm:inline">Account </span>
                <span aria-hidden className="hidden text-ash sm:inline">
                  /{' '}
                </span>
                <span className="font-medium text-ink">{activeItem?.label ?? 'Overview'}</span>
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Link
                to="/"
                className="hidden min-h-11 items-center gap-2 border border-line bg-paper px-3 text-[13px] text-graphite transition-colors duration-200 hover:border-ink hover:text-ink sm:flex"
              >
                Storefront
                <ArrowUpRight size={14} strokeWidth={1.6} aria-hidden />
              </Link>
              <Link
                to="/dashboard/profile"
                className="grid size-11 place-items-center bg-ink font-mono text-[11px] text-paper transition-colors hover:bg-ink-soft"
              >
                <span aria-hidden>{initials(user?.firstName, user?.lastName)}</span>
                <span className="sr-only">Open your profile</span>
              </Link>
            </div>
          </div>
        </header>

        <main id="main" className="flex-1">
          <div className="container-account py-7 sm:py-9 lg:py-11">
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
              role="dialog"
              aria-modal="true"
              aria-label="Account navigation"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.5, ease: EASE }}
              className="flex h-full w-[86vw] max-w-[320px] flex-col border-r border-line bg-paper"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-4">
                <Link
                  to="/"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5 px-1"
                >
                  <Mark className="size-4" />
                  <span className="text-[15px] font-extrabold tracking-[-0.03em] uppercase">CTRL</span>
                </Link>
                <button
                  ref={closeButton}
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close account navigation"
                  className="grid size-11 place-items-center text-ink"
                >
                  <X size={20} strokeWidth={1.5} />
                </button>
              </div>

              <div className="border-b border-line px-3 py-3">
                <IdentityCard
                  firstName={user?.firstName}
                  lastName={user?.lastName}
                  email={user?.email}
                  onNavigate={() => setMobileOpen(false)}
                />
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-5">
                {sectionNav(() => setMobileOpen(false))}
              </div>

              <div className="shrink-0 space-y-1 border-t border-line p-3">
                <Link
                  to="/"
                  onClick={() => setMobileOpen(false)}
                  className="group flex min-h-11 items-center gap-2.5 px-3 text-[13px] text-graphite transition-colors duration-200 hover:bg-bone/60 hover:text-ink"
                >
                  <Store size={15} strokeWidth={1.6} aria-hidden />
                  <span className="flex-1">Storefront</span>
                  <ArrowUpRight size={14} strokeWidth={1.6} aria-hidden />
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="group flex min-h-11 w-full items-center gap-2.5 px-3 text-left text-[13px] text-graphite transition-colors duration-200 hover:bg-bone/60 hover:text-ink"
                >
                  <LogOut size={15} strokeWidth={1.6} aria-hidden />
                  Sign out
                </button>
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
