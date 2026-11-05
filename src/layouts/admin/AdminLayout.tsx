import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowUpRight,
  ClipboardList,
  CreditCard,
  FileClock,
  FolderTree,
  GalleryHorizontalEnd,
  Layers,
  Image,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Package,
  Sliders,
  Store,
  Truck,
  Users,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { displayName, useAuth } from '@/features/auth/useAuth'
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll'

/**
 * Only admin destinations implemented in this frontend are shown: a greyed-out
 * destination is still a promise. Customer lookup is deliberately named for
 * what it does rather than "Customers".
 */
const NAV: ReadonlyArray<{
  label: string
  to: string
  icon: LucideIcon
  exact: boolean
}> = [
  { label: 'Overview', to: '/admin', icon: LayoutDashboard, exact: true },
  { label: 'Orders', to: '/admin/orders', icon: ClipboardList, exact: false },
  { label: 'COD dashboard', to: '/admin/cod-dashboard', icon: CreditCard, exact: false },
  { label: 'COD reconciliation', to: '/admin/cod-reconciliation', icon: FileClock, exact: false },
  { label: 'Products', to: '/admin/products', icon: Package, exact: false },
  { label: 'Product images', to: '/admin/product-images', icon: Image, exact: false },
  { label: 'Product variants', to: '/admin/product-variants', icon: Sliders, exact: false },
  { label: 'Categories', to: '/admin/categories', icon: FolderTree, exact: false },
  { label: 'Posters', to: '/admin/posters', icon: GalleryHorizontalEnd, exact: false },
  { label: 'Collections', to: '/admin/collections', icon: Layers, exact: false },
  { label: 'Shipping providers', to: '/admin/shipping-providers', icon: Truck, exact: false },
  { label: 'COD eligibility', to: '/admin/cod-areas', icon: MapPin, exact: false },
  { label: 'Customer lookup', to: '/admin/customers', icon: Users, exact: true },
]

const EASE = [0.16, 1, 0.3, 1] as const

const navLinkClasses = (isActive: boolean) =>
  [
    'group relative flex min-h-11 items-center gap-2.5 px-3 text-[13.5px] font-medium transition-colors duration-200',
    isActive
      ? 'bg-bone text-ink before:absolute before:top-2 before:bottom-2 before:left-0 before:w-0.5 before:bg-ink'
      : 'text-graphite hover:bg-bone/60 hover:text-ink',
  ].join(' ')

const Mark = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
    <rect x="1.6" y="1.6" width="20.8" height="20.8" stroke="currentColor" strokeWidth="1.4" />
    <path d="M6 12h12" stroke="currentColor" strokeWidth="1.4" />
  </svg>
)

/** Scroll to top on every admin route change. */
const ScrollToTop = () => {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])

  return null
}

export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const menuButton = useRef<HTMLButtonElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)

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

  const activeItem = NAV.find((item) => item.to === pathname) ??
    NAV.find((item) => pathname.startsWith(`${item.to}/`) && item.to !== '/admin')

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-svh bg-canvas">
      <ScrollToTop />

      <a
        href="#main"
        className="eyebrow sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:bg-ink focus:px-4 focus:py-3 focus:text-paper"
      >
        Skip to content
      </a>

      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-r border-line bg-paper lg:flex">
        <div className="flex min-h-0 flex-1 flex-col">
          <Link
            to="/admin"
            className="group flex h-16 shrink-0 items-center gap-2.5 border-b border-line px-5"
          >
            <Mark className="size-4 transition-transform duration-500 ease-editorial group-hover:rotate-90" />
            <span className="text-[15px] font-extrabold tracking-[-0.03em] uppercase">CTRL</span>
            <span className="ml-auto text-[11px] font-semibold tracking-[0.08em] text-graphite uppercase">
              Admin
            </span>
          </Link>

          <div className="border-b border-line px-3 py-3">
            <div className="flex items-center gap-3 px-2 py-2">
              <span
                aria-hidden
                className="grid size-9 shrink-0 place-items-center bg-ink font-mono text-[11px] text-paper"
              >
                {initials(user?.firstName, user?.lastName)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-semibold text-ink">
                  {displayName(user) || 'Administrator'}
                </p>
                {user?.email && (
                  <p className="mt-0.5 truncate text-[12px] text-graphite">{user.email}</p>
                )}
              </div>
            </div>
          </div>

          <nav aria-label="Admin" className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
            <p className="eyebrow px-3 text-graphite">Studio</p>
            <ul className="mt-2 space-y-0.5">
              {NAV.map(({ label, to, icon: Icon, exact }) => (
                <li key={to}>
                  <NavLink to={to} end={exact} className={({ isActive }) => navLinkClasses(isActive)}>
                    <Icon size={16} strokeWidth={1.6} aria-hidden className="shrink-0" />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>

            <p className="mt-8 px-3 text-[12px] leading-relaxed text-graphite">
              Images, variants and stock have dedicated catalogue pages and can also be
              edited inside a product. Shipping and COD eligibility are configured here.
            </p>
          </nav>
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
            onClick={handleLogout}
            className="flex min-h-11 w-full items-center gap-2.5 px-3 text-left text-[13px] text-graphite transition-colors duration-200 hover:bg-bone/60 hover:text-ink"
          >
            <LogOut size={15} strokeWidth={1.6} aria-hidden />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className={`sticky top-0 z-70 border-b border-line backdrop-blur-xl transition-colors duration-200 ${
            scrolled ? 'bg-canvas/90' : 'bg-canvas'
          }`}
        >
          <div className="container-admin flex h-16 items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <button
                ref={menuButton}
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Open admin navigation"
                aria-expanded={mobileOpen}
                className="grid size-11 shrink-0 place-items-center border border-line bg-paper text-ink transition-colors duration-200 hover:border-ink hover:bg-ink hover:text-paper lg:hidden"
              >
                <Menu size={18} strokeWidth={1.6} />
              </button>

              <p className="min-w-0 truncate text-[13px] text-graphite">
                <span className="hidden sm:inline">Admin </span>
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
              <span className="grid size-10 place-items-center bg-ink font-mono text-[11px] text-paper">
                {initials(user?.firstName, user?.lastName)}
              </span>
            </div>
          </div>
        </header>

        <main id="main" className="flex-1">
          <div className="container-admin py-7 sm:py-9 lg:py-11">
            <Outlet />
          </div>
        </main>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="admin-nav"
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
              aria-label="Admin navigation"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.5, ease: EASE }}
              className="flex h-full w-[86vw] max-w-[320px] flex-col border-r border-line bg-paper"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-4">
                <Link
                  to="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5 px-1"
                >
                  <Mark className="size-4" />
                  <span className="text-[15px] font-extrabold tracking-[-0.03em] uppercase">CTRL</span>
                  <span className="text-[11px] font-semibold tracking-[0.08em] text-graphite uppercase">
                    Admin
                  </span>
                </Link>
                <button
                  ref={closeButton}
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close admin navigation"
                  className="grid size-11 place-items-center text-ink"
                >
                  <X size={20} strokeWidth={1.5} />
                </button>
              </div>

              <div className="border-b border-line px-3 py-3">
                <div className="flex items-center gap-3 px-2 py-2">
                  <span
                    aria-hidden
                    className="grid size-9 shrink-0 place-items-center bg-ink font-mono text-[11px] text-paper"
                  >
                    {initials(user?.firstName, user?.lastName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold text-ink">
                      {displayName(user) || 'Administrator'}
                    </p>
                    {user?.email && (
                      <p className="mt-0.5 truncate text-[12px] text-graphite">{user.email}</p>
                    )}
                  </div>
                </div>
              </div>

              <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 py-5">
                <p className="eyebrow px-3 text-graphite">Studio</p>
                <ul className="mt-2 space-y-0.5">
                  {NAV.map(({ label, to, icon: Icon, exact }) => (
                    <li key={to}>
                      <NavLink
                        to={to}
                        end={exact}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) => navLinkClasses(isActive)}
                      >
                        <Icon size={16} strokeWidth={1.6} aria-hidden className="shrink-0" />
                        {label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="shrink-0 space-y-1 border-t border-line p-3">
                <Link
                  to="/"
                  onClick={() => setMobileOpen(false)}
                  className="flex min-h-11 items-center gap-2.5 px-3 text-[13px] text-graphite transition-colors duration-200 hover:bg-bone/60 hover:text-ink"
                >
                  <Store size={15} strokeWidth={1.6} aria-hidden />
                  <span className="flex-1">Storefront</span>
                  <ArrowUpRight size={14} strokeWidth={1.6} aria-hidden />
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex min-h-11 w-full items-center gap-2.5 px-3 text-left text-[13px] text-graphite transition-colors duration-200 hover:bg-bone/60 hover:text-ink"
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

const initials = (first?: string, last?: string): string => {
  const letters = `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase()
  return letters.length === 2 ? letters : '—'
}
