import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut, Menu } from 'lucide-react'
import { displayName, useAuth } from '@/features/auth/useAuth'
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll'

const NAV = [
  { label: 'Dashboard', to: '/admin', icon: 'LayoutDashboard', exact: true },
  { label: 'Products', to: '/admin/products', icon: 'Package', exact: false },
  { label: 'Categories', to: '/admin/categories', icon: 'FolderTree', exact: false, disabled: true },
  { label: 'Orders', to: '/admin/orders', icon: 'ShoppingCart', exact: false, disabled: true },
  { label: 'Customers', to: '/admin/customers', icon: 'Users', exact: false, disabled: true },
  { label: 'Inventory', to: '/admin/inventory', icon: 'Boxes', exact: false, disabled: true },
] as const

const navLinkClasses = (isActive: boolean, disabled: boolean) =>
  [
    'group relative flex items-center gap-3 px-3 py-2.5 transition-colors duration-200',
    disabled
      ? 'text-ash/60 cursor-not-allowed'
      : isActive
      ? 'bg-bone text-ink before:absolute before:top-2 before:bottom-2 before:left-0 before:w-0.5 before:bg-ink'
      : 'text-graphite hover:bg-bone/60 hover:text-ink',
  ].join(' ')

const Mark = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
    <rect x="1.6" y="1.6" width="20.8" height="20.8" stroke="currentColor" strokeWidth="1.4" />
    <path d="M6 12h12" stroke="currentColor" strokeWidth="1.4" />
  </svg>
)

export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  useLockBodyScroll(mobileOpen)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-svh bg-canvas">
      <a
        href="#main"
        className="label-micro sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:bg-ink focus:px-4 focus:py-3 focus:text-paper"
      >
        Skip to content
      </a>

      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col justify-between border-r border-line bg-paper lg:flex">
        <div className="flex min-h-0 flex-1 flex-col">
          <Link
            to="/admin"
            className="group flex h-16 shrink-0 items-center gap-2.5 border-b border-line px-5"
            aria-label="CTRL — Admin"
          >
            <Mark className="size-4 transition-transform duration-500 ease-editorial group-hover:rotate-90" />
            <span className="text-[15px] font-extrabold tracking-[-0.03em] uppercase">CTRL · ADMIN</span>
          </Link>

          <nav aria-label="Admin" className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
            {NAV.map((item) =>
              'disabled' in item && item.disabled ? (
                <div
                  key={item.to}
                  className={navLinkClasses(false, true)}
                  aria-label={`${item.label} (coming soon)`}
                  aria-disabled="true"
                >
                  <span className="text-[13px] font-medium">{item.label}</span>
                  <span className="ml-auto font-mono text-[10px] text-ash/70">SOON</span>
                </div>
              ) : (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  className={({ isActive }) => navLinkClasses(isActive, false)}
                >
                  <span className="text-[13px] font-medium">{item.label}</span>
                </NavLink>
              ),
            )}
          </nav>
        </div>

        <div className="shrink-0 border-t border-line p-3">
          <button
            type="button"
            onClick={handleLogout}
            className="group flex w-full items-center gap-3 px-3 py-2.5 text-graphite transition-colors duration-200 hover:bg-bone/60 hover:text-ink"
          >
            <LogOut size={16} strokeWidth={1.5} aria-hidden />
            <span className="text-[13px]">Log out</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className={`sticky top-0 z-70 border-b border-line backdrop-blur-xl transition-colors duration-200 ${
            scrolled ? 'bg-canvas/90' : 'bg-canvas'
          }`}
        >
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Open admin navigation"
                className="grid size-11 shrink-0 place-items-center border border-line bg-paper text-ink transition-colors duration-200 hover:border-ink hover:bg-ink hover:text-paper lg:hidden"
              >
                <Menu size={18} strokeWidth={1.5} />
              </button>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-[13px] font-medium">Administration</span>
                <span className="truncate font-mono text-[10px] text-ash">
                  {displayName(user) || user?.email || ''} · {user?.role}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLogout}
                className="grid size-11 place-items-center border border-line bg-paper text-graphite transition-colors duration-200 hover:border-ink hover:text-ink lg:hidden"
                aria-label="Log out"
              >
                <LogOut size={18} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </header>

        <main id="main" className="flex-1">
          <div className="px-4 py-6 sm:px-6 sm:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
