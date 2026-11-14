import { useEffect, useRef, useState, type RefObject } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, LogOut, Menu, ShieldCheck, ShoppingBag, X } from 'lucide-react'
import { navLinks } from '@/data/navigation'
import { accountNavigation } from '@/data/accountNavigation'
import { AccountMenu } from '@/components/layout/AccountMenu'
import { displayName, useAuth } from '@/features/auth/useAuth'
import { useCartActions } from '@/features/cart/useCartActions'
import { useWishlistActions } from '@/features/wishlist/useWishlistActions'
import { useUI } from '@/hooks/useUI'
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll'
import { NotificationCenter } from '@/features/notifications/NotificationCenter'

// Official shop logo from public directory
const LOGO_SRC = '/logo.png'

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const { isMenuOpen, openMenu } = useUI()
  const { itemCount } = useCartActions()
  const { itemCount: wishlistCount } = useWishlistActions()
  const { isAuthenticated, isInitializing, logout } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const menuTrigger = useRef<HTMLButtonElement>(null)

  useLockBodyScroll(isMenuOpen)
  const signOut = () => {
    logout()
    if (pathname.startsWith('/account') || pathname.startsWith('/admin')) {
      navigate('/', { replace: true })
    }
  }

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
        className={`fixed inset-x-0 top-0 z-80 transition-all duration-400 ease-editorial focus-within:pointer-events-auto focus-within:opacity-100 ${
          docked
            ? 'border-b border-line bg-paper/95 opacity-100 backdrop-blur-md'
            : 'pointer-events-none border-b border-transparent opacity-0'
        }`}
      >
        <div className="container-editorial flex h-16 items-center justify-between gap-4 sm:h-[4.5rem] lg:grid lg:grid-cols-[1fr_auto_1fr] lg:gap-0">
          
          {/* LEFT CLUSTER: Navigation Links (Desktop) / Menu Toggle (Mobile) */}
          <div className="flex items-center justify-start">
            
            {/* Mobile Menu Button */}
            <button
              ref={menuTrigger}
              type="button"
              onClick={openMenu}
              aria-label="Open menu"
              className="grid size-11 place-items-center text-ink transition-colors hover:bg-bone lg:hidden -ml-2"
            >
              <Menu size={20} strokeWidth={1.6} />
            </button>

            {/* Desktop Nav */}
            <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  className={({ isActive }) =>
                    `relative flex min-h-11 items-center px-3.5 text-[12px] font-semibold tracking-[0.12em] uppercase transition-colors ${
                      isActive ? 'text-ink' : 'text-graphite hover:text-ink'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {link.label}
                      <span
                        aria-hidden
                        className={`absolute inset-x-3.5 bottom-1.5 h-px origin-left bg-ink transition-transform duration-300 ${
                          isActive ? 'scale-x-100' : 'scale-x-0'
                        }`}
                      />
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* CENTER: The Logo */}
          <div className="flex justify-center">
            <Link to="/" className="group flex min-h-11 shrink-0 items-center gap-2.5" aria-label="LOMOR — home">
              <img
                src={LOGO_SRC}
                alt="LOMOR Logo"
                className="h-15 w-auto object-contain transition-opacity duration-300 group-hover:opacity-70"
              />
            </Link>
          </div>

          {/* RIGHT CLUSTER: Account, Bag, & Auth */}
          <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-2">
            <NotificationCenter />
            {!isInitializing &&
              (isAuthenticated ? (
                <AccountMenu
                  onSignOut={signOut}
                  bagCount={itemCount}
                  wishlistCount={wishlistCount}
                />
              ) : (
                <div className="hidden items-center gap-1 sm:flex">
                  <Link
                    to="/login"
                    className="flex min-h-11 items-center px-2.5 text-[13px] font-medium text-ink transition-colors hover:text-graphite"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    className="hidden min-h-11 items-center border border-ink px-3.5 text-[12px] font-semibold tracking-[0.08em] uppercase transition-colors hover:bg-ink hover:text-paper md:flex"
                  >
                    Create account
                  </Link>
                </div>
              ))}

            <Link
              to="/account/bag"
              aria-label={`Your bag, ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
              className="group flex min-h-11 min-w-11 items-center justify-center gap-2 px-2 text-ink transition-colors hover:text-graphite"
            >
              <span className="relative">
                <ShoppingBag size={18} strokeWidth={1.5} aria-hidden />
                {itemCount > 0 && (
                  <span
                    aria-hidden
                    className="absolute -top-1 -right-1.5 grid min-w-4 place-items-center bg-ink px-1 font-mono text-[9px] leading-4 text-paper"
                  >
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                )}
              </span>
              <span className="hidden text-[12px] font-semibold tracking-[0.1em] uppercase md:inline">
                Bag
              </span>
            </Link>
          </div>
        </div>
      </header>

      <MobileMenu
        isAuthenticated={isAuthenticated}
        bagCount={itemCount}
        wishlistCount={wishlistCount}
        onSignOut={signOut}
        triggerRef={menuTrigger}
      />
    </>
  )
}

/** Full-bleed overlay menu — a page, not a dropdown. */
function MobileMenu({
  isAuthenticated,
  bagCount,
  wishlistCount,
  onSignOut,
  triggerRef,
}: {
  isAuthenticated: boolean
  bagCount: number
  wishlistCount: number
  onSignOut: () => void
  triggerRef: RefObject<HTMLButtonElement | null>
}) {
  const { isMenuOpen, closeMenu } = useUI()
  const { user, isInitializing } = useAuth()
  const { pathname } = useLocation()

  const dismiss = () => {
    closeMenu()
    triggerRef.current?.focus()
  }

  useEffect(() => {
    if (!isMenuOpen) return undefined
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      closeMenu()
      triggerRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isMenuOpen, closeMenu, triggerRef])

  const countFor = (key: 'bag' | 'wishlist' | undefined) =>
    key === 'bag' ? bagCount : key === 'wishlist' ? wishlistCount : 0

  return (
    <AnimatePresence>
      {isMenuOpen && (
        <motion.div
          key="menu"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          className="fixed inset-0 z-[85] flex flex-col overflow-hidden bg-paper lg:hidden"
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-5 sm:h-[4.5rem]">
            <Link to="/" onClick={closeMenu} className="flex items-center gap-2.5" aria-label="LOMOR — home">
              <img
                src={LOGO_SRC}
                alt="LOMOR Logo"
                className="h-9 w-auto object-contain"
              />
            </Link>
            <button
              type="button"
              autoFocus
              onClick={dismiss}
              aria-label="Close menu"
              className="grid size-11 place-items-center text-ink transition-colors hover:bg-bone"
            >
              <X size={21} strokeWidth={1.5} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6">
            {isInitializing ? null : isAuthenticated ? (
              <div className="mb-7 flex items-center gap-3 border border-line bg-bone/60 px-3.5 py-3">
                <span
                  aria-hidden
                  className="grid size-10 shrink-0 place-items-center bg-ink font-mono text-[12px] text-paper"
                >
                  {(user?.firstName?.[0] ?? '') + (user?.lastName?.[0] ?? '') || '—'}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-ink">
                    {displayName(user) || 'Your account'}
                  </p>
                  {user?.email && <p className="truncate text-[12.5px] text-graphite">{user.email}</p>}
                </div>
              </div>
            ) : null}

            <nav aria-label="Shop" className="flex flex-col">
              <p className="eyebrow mb-2 text-graphite">Shop</p>
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={closeMenu}
                  className={`flex min-h-12 items-center justify-between border-b border-line-soft text-[17px] font-medium transition-colors ${
                    pathname === link.to ? 'text-ink' : 'text-ink/85 hover:text-ink'
                  }`}
                >
                  {link.label}
                  <ArrowRight size={16} strokeWidth={1.5} aria-hidden className="text-ash" />
                </Link>
              ))}
              <Link
                to="/account/bag"
                onClick={closeMenu}
                className="flex min-h-12 items-center justify-between border-b border-line-soft text-[17px] font-medium text-ink/85 transition-colors hover:text-ink"
              >
                <span className="flex items-center gap-2.5">
                  <ShoppingBag size={17} strokeWidth={1.5} aria-hidden className="text-graphite" />
                  Bag
                </span>
                <span className="font-mono text-[12px] tabular-nums text-graphite">{bagCount}</span>
              </Link>
            </nav>

            {isAuthenticated && (
              <div className="mt-7">
                {accountNavigation.map((group) => (
                  <div key={group.title} className="mb-6">
                    <p className="eyebrow mb-2 text-graphite">{group.title}</p>
                    <div className="flex flex-col">
                      {group.items.map(({ label, to, icon: Icon, countKey }) => {
                        const count = countFor(countKey)
                        return (
                          <Link
                            key={to}
                            to={to}
                            onClick={closeMenu}
                            className="flex min-h-11 items-center gap-3 border-b border-line-soft text-[15px] text-ink transition-colors hover:text-graphite"
                          >
                            <Icon size={16} strokeWidth={1.6} aria-hidden className="text-graphite" />
                            <span className="flex-1">{label}</span>
                            {count > 0 && (
                              <span className="font-mono text-[11px] tabular-nums text-graphite">
                                {count}
                              </span>
                            )}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                ))}

                {user?.role === 'ADMIN' && (
                  <Link
                    to="/admin"
                    onClick={closeMenu}
                    className="mb-6 flex min-h-11 items-center gap-3 border border-line px-3 text-[14px] font-medium text-ink transition-colors hover:bg-bone"
                  >
                    <ShieldCheck size={16} strokeWidth={1.6} aria-hidden className="text-graphite" />
                    Admin studio
                  </Link>
                )}
              </div>
            )}

            {!isInitializing && !isAuthenticated && (
              <div className="mt-8 grid gap-2.5">
                <Link
                  to="/login"
                  onClick={closeMenu}
                  className="flex h-12 items-center justify-center bg-ink text-[13px] font-semibold tracking-[0.06em] text-paper uppercase"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  onClick={closeMenu}
                  className="flex h-12 items-center justify-center border border-ink text-[13px] font-semibold tracking-[0.06em] text-ink uppercase"
                >
                  Create account
                </Link>
              </div>
            )}

            {isAuthenticated && (
              <button
                type="button"
                onClick={() => {
                  closeMenu()
                  onSignOut()
                }}
                className="mt-2 flex min-h-11 items-center gap-3 text-[14px] text-graphite transition-colors hover:text-ink"
              >
                <LogOut size={16} strokeWidth={1.6} aria-hidden />
                Sign out
              </button>
            )}
          </div>

          <div className="shrink-0 border-t border-line px-5 py-4">
            <p className="font-mono text-[10px] leading-relaxed tracking-[0.12em] text-graphite uppercase">
              Release 01 · June 2026
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
