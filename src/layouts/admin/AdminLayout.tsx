import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowUpRight,
  BadgePercent,
  Boxes,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FileClock,
  FolderTree,
  GalleryHorizontalEnd,
  Image,
  Layers,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Package,
  Sliders,
  Store,
  TrendingUp,
  Truck,
  Users,
  MessageSquare,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { displayName, useAuth } from '@/features/auth/useAuth'
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll'
import { NotificationCenter } from '@/features/notifications/NotificationCenter'

type NavItem = {
  label: string
  to: string
  icon: LucideIcon
  exact: boolean
}

type NavGroup = {
  title: string
  items: ReadonlyArray<NavItem>
}

const NAV_GROUPS: ReadonlyArray<NavGroup> = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', to: '/admin', icon: LayoutDashboard, exact: true },
      { label: 'Finance & profit', to: '/admin/finance', icon: TrendingUp, exact: false },
    ],
  },
  {
    title: 'Commerce',
    items: [
      { label: 'Orders', to: '/admin/orders', icon: ClipboardList, exact: false },
      { label: 'Promotions', to: '/admin/promotions', icon: BadgePercent, exact: false },
      { label: 'COD dashboard', to: '/admin/cod-dashboard', icon: CreditCard, exact: false },
      { label: 'COD reconciliation', to: '/admin/cod-reconciliation', icon: FileClock, exact: false },
    ],
  },
  {
    title: 'Catalogue',
    items: [
      { label: 'Products', to: '/admin/products', icon: Package, exact: false },
      { label: 'Product overview', to: '/admin/products/overview', icon: Boxes, exact: true },
      { label: 'Product images', to: '/admin/product-images', icon: Image, exact: false },
      { label: 'Product variants', to: '/admin/product-variants', icon: Sliders, exact: false },
      { label: 'Categories', to: '/admin/categories', icon: FolderTree, exact: false },
      { label: 'Posters', to: '/admin/posters', icon: GalleryHorizontalEnd, exact: false },
      { label: 'Collections', to: '/admin/collections', icon: Layers, exact: false },
    ],
  },
  {
    title: 'Logistics',
    items: [
      { label: 'Delivery staff', to: '/admin/delivery-staff', icon: Truck, exact: false },
      { label: 'Shipping providers', to: '/admin/shipping-providers', icon: Truck, exact: false },
      { label: 'COD eligibility', to: '/admin/cod-areas', icon: MapPin, exact: false },
    ],
  },
  {
    title: 'Customers',
    items: [
      { label: 'Customers', to: '/admin/customers', icon: Users, exact: true },
      { label: 'Feedback', to: '/admin/feedback', icon: MessageSquare, exact: false },
    ],
  },
]

const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items)

const EASE = [0.16, 1, 0.3, 1] as const

const navLinkClasses = (isActive: boolean) =>
  [
    'group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-150',
    isActive
      ? 'bg-ink text-paper shadow-xs font-semibold'
      : 'text-graphite hover:bg-bone hover:text-ink',
  ].join(' ')

const Mark = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
    <rect x="2" y="2" width="20" height="20" rx="4" stroke="currentColor" strokeWidth="1.7" />
    <path d="M7 12h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
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

  const activeItem =
    ALL_NAV_ITEMS.find((item) => item.to === pathname) ??
    ALL_NAV_ITEMS.find((item) => pathname.startsWith(`${item.to}/`) && item.to !== '/admin')

  const activeGroup = NAV_GROUPS.find((group) =>
    group.items.some((item) => item.to === activeItem?.to),
  )

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const renderNavList = (onNavigate?: () => void) => (
    <div className="space-y-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.title}>
          <p className="px-2.5 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-graphite/70">
            {group.title}
          </p>
          <ul className="space-y-0.5">
            {group.items.map(({ label, to, icon: Icon, exact }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={exact}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    navLinkClasses(
                      isActive &&
                        !(
                          to === '/admin/products' &&
                          pathname.startsWith('/admin/products/overview')
                        ),
                    )
                  }
                >
                  <Icon size={16} strokeWidth={1.75} aria-hidden className="shrink-0" />
                  <span>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )

  return (
    <div className="flex min-h-svh bg-canvas font-sans text-ink">
      <ScrollToTop />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:rounded-md focus:bg-ink focus:px-4 focus:py-3 focus:text-paper"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-r border-line bg-paper lg:flex">
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Brand header */}
          <Link
            to="/admin"
            className="group flex h-16 shrink-0 items-center gap-2.5 border-b border-line px-5"
          >
            <div className="grid size-8 place-items-center rounded-lg bg-ink text-paper shadow-xs transition-transform duration-300 group-hover:scale-105">
              <Mark className="size-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[14px] font-extrabold tracking-[-0.02em] uppercase text-ink">
                CTRL
              </span>
              <span className="text-[10px] font-medium tracking-wider text-graphite uppercase">
                Admin Studio
              </span>
            </div>
          </Link>

          {/* User profile card */}
          <div className="border-b border-line p-3">
            <div className="flex items-center gap-2.5 rounded-lg border border-line-soft bg-paper-pure p-2 shadow-xs">
              <span
                aria-hidden
                className="grid size-8 shrink-0 place-items-center rounded-md bg-ink font-mono text-[11px] font-semibold text-paper"
              >
                {initials(user?.firstName, user?.lastName)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-ink">
                  {displayName(user) || 'Administrator'}
                </p>
                {user?.email && (
                  <p className="truncate text-[11.5px] text-graphite">{user.email}</p>
                )}
              </div>
            </div>
          </div>

          {/* Nav links */}
          <nav aria-label="Admin" className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
            {renderNavList()}
          </nav>
        </div>

        {/* Footer actions */}
        <div className="shrink-0 space-y-1 border-t border-line p-3">
          <Link
            to="/"
            className="group flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[12.5px] font-medium text-graphite transition-colors hover:bg-bone hover:text-ink"
          >
            <Store size={15} strokeWidth={1.8} aria-hidden />
            <span className="flex-1">Live Storefront</span>
            <ArrowUpRight
              size={13}
              strokeWidth={1.8}
              aria-hidden
              className="text-ash transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[12.5px] font-medium text-graphite transition-colors hover:bg-rose-50 hover:text-signal"
          >
            <LogOut size={15} strokeWidth={1.8} aria-hidden />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main shell */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header */}
        <header
          className={`sticky top-0 z-40 border-b border-line backdrop-blur-xl transition-colors duration-200 ${
            scrolled ? 'bg-canvas/95 shadow-xs' : 'bg-canvas'
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
                className="grid size-10 shrink-0 place-items-center rounded-lg border border-line bg-paper text-ink shadow-xs transition-colors hover:border-ink hover:bg-ink hover:text-paper lg:hidden"
              >
                <Menu size={18} strokeWidth={1.75} />
              </button>

              <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px]">
                <Link
                  to="/admin"
                  className="font-medium text-graphite transition-colors hover:text-ink"
                >
                  Admin
                </Link>
                {activeGroup && (
                  <>
                    <ChevronRight size={13} className="text-ash shrink-0" aria-hidden />
                    <span className="text-graphite">{activeGroup.title}</span>
                  </>
                )}
                <ChevronRight size={13} className="text-ash shrink-0" aria-hidden />
                <span className="font-semibold text-ink truncate">
                  {activeItem?.label ?? 'Overview'}
                </span>
              </nav>
            </div>

            <div className="flex shrink-0 items-center gap-2.5">
              <NotificationCenter />
              <Link
                to="/"
                className="hidden h-9 items-center gap-1.5 rounded-lg border border-line bg-paper px-3 text-[12.5px] font-medium text-graphite shadow-xs transition-colors hover:border-ink hover:text-ink sm:inline-flex"
              >
                <span>Storefront</span>
                <ArrowUpRight size={13} strokeWidth={1.8} aria-hidden />
              </Link>
              <div className="flex items-center gap-2 pl-2 sm:border-l sm:border-line">
                <span
                  aria-hidden
                  className="grid size-9 place-items-center rounded-md bg-ink font-mono text-[11px] font-semibold text-paper shadow-xs"
                >
                  {initials(user?.firstName, user?.lastName)}
                </span>
              </div>
            </div>
          </div>
        </header>

        <main id="main" className="flex-1">
          <div className="container-admin py-6 sm:py-8 lg:py-10">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="admin-nav"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[90] bg-ink/40 backdrop-blur-xs lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Admin navigation"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.35, ease: EASE }}
              className="flex h-full w-[85vw] max-w-[300px] flex-col border-r border-line bg-paper shadow-raised"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-4">
                <Link
                  to="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5"
                >
                  <div className="grid size-8 place-items-center rounded-lg bg-ink text-paper shadow-xs">
                    <Mark className="size-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[14px] font-extrabold uppercase text-ink">CTRL</span>
                    <span className="text-[10px] font-medium tracking-wider text-graphite uppercase">
                      Admin Studio
                    </span>
                  </div>
                </Link>
                <button
                  ref={closeButton}
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close admin navigation"
                  className="grid size-9 place-items-center rounded-md text-graphite hover:text-ink"
                >
                  <X size={19} strokeWidth={1.8} />
                </button>
              </div>

              <div className="border-b border-line p-3">
                <div className="flex items-center gap-2.5 rounded-lg border border-line-soft bg-paper-pure p-2 shadow-xs">
                  <span
                    aria-hidden
                    className="grid size-8 shrink-0 place-items-center rounded-md bg-ink font-mono text-[11px] font-semibold text-paper"
                  >
                    {initials(user?.firstName, user?.lastName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ink">
                      {displayName(user) || 'Administrator'}
                    </p>
                    {user?.email && (
                      <p className="truncate text-[11.5px] text-graphite">{user.email}</p>
                    )}
                  </div>
                </div>
              </div>

              <nav aria-label="Admin" className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
                {renderNavList(() => setMobileOpen(false))}
              </nav>

              <div className="shrink-0 space-y-1 border-t border-line p-3">
                <Link
                  to="/"
                  onClick={() => setMobileOpen(false)}
                  className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[12.5px] font-medium text-graphite transition-colors hover:bg-bone hover:text-ink"
                >
                  <Store size={15} strokeWidth={1.8} aria-hidden />
                  <span className="flex-1">Live Storefront</span>
                  <ArrowUpRight size={13} strokeWidth={1.8} aria-hidden />
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[12.5px] font-medium text-graphite transition-colors hover:bg-rose-50 hover:text-signal"
                >
                  <LogOut size={15} strokeWidth={1.8} aria-hidden />
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
