import { useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, Store } from 'lucide-react'
import { accountNavigation, accountNavItems } from '@/data/accountNavigation'
import { displayName, useAuth } from '@/features/auth/useAuth'
import { useCartActions } from '@/features/cart/useCartActions'
import { useWishlistActions } from '@/features/wishlist/useWishlistActions'

const initials = (first?: string, last?: string): string => {
  const letters = `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase()
  return letters.length === 2 ? letters : '—'
}

/**
 * Active state is a bone fill plus a short ink rule on the left, matching the
 * account navigation that used to live in the standalone dashboard rail.
 */
const navLinkClasses = (isActive: boolean) =>
  [
    'group relative flex min-h-11 items-center gap-2.5 px-3 text-[13.5px] font-medium transition-colors duration-200',
    isActive
      ? 'bg-bone text-ink before:absolute before:top-2 before:bottom-2 before:left-0 before:w-0.5 before:bg-ink'
      : 'text-graphite hover:bg-bone/60 hover:text-ink',
  ].join(' ')

/**
 * The customer account navigation, rendered inside the public storefront.
 *
 * Below `xl` it is a native disclosure so the account pages keep the site
 * navbar and the bottom navigation without a second full-screen drawer; the
 * groups are plain links, so Tab, Enter and Escape behave without a key map.
 */
export function AccountSectionNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const bagCount = useCartActions().itemCount
  const wishlistCount = useWishlistActions().itemCount
  const [mobileOpen, setMobileOpen] = useState(false)
  const [shownPath, setShownPath] = useState(pathname)

  // A navigation closes the disclosure during the same render as the route
  // change, rather than leaving it open on top of the next page.
  if (shownPath !== pathname) {
    setShownPath(pathname)
    setMobileOpen(false)
  }

  const activeItem = accountNavItems.find((item) =>
    item.to === '/account' ? pathname === item.to : pathname.startsWith(`${item.to}/`),
  )

  const signOut = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const countFor = (key: 'bag' | 'wishlist' | undefined) =>
    key === 'bag' ? bagCount : key === 'wishlist' ? wishlistCount : 0

  const groups = (onNavigate?: () => void) => (
    <>
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
                    end={to === '/account'}
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
    </>
  )

  return (
    <>
      {/* Desktop rail */}
      <aside className="hidden xl:sticky xl:top-24 xl:block xl:self-start">
        <div className="border border-line bg-paper">
          <Link
            to="/account/profile"
            className="flex items-center gap-3 border-b border-line px-3 py-3 transition-colors duration-200 hover:bg-bone"
          >
            <span
              aria-hidden
              className="grid size-9 shrink-0 place-items-center bg-ink font-mono text-[11px] tracking-wide text-paper"
            >
              {initials(user?.firstName, user?.lastName)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13.5px] font-semibold text-ink">
                {displayName(user) || 'Your account'}
              </span>
              {user?.email && (
                <span className="mt-0.5 block truncate text-[12px] text-graphite">{user.email}</span>
              )}
            </span>
          </Link>

          <nav aria-label="Account sections" className="space-y-6 p-3">
            {groups()}
          </nav>
        </div>

        <div className="mt-3 space-y-0.5">
          <Link
            to="/"
            className="group flex min-h-11 items-center gap-2.5 px-3 text-[13px] text-graphite transition-colors duration-200 hover:bg-bone/60 hover:text-ink"
          >
            <Store size={15} strokeWidth={1.6} aria-hidden />
            Continue shopping
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="group flex min-h-11 w-full items-center gap-2.5 px-3 text-left text-[13px] text-graphite transition-colors duration-200 hover:bg-bone/60 hover:text-ink"
          >
            <LogOut size={15} strokeWidth={1.6} aria-hidden />
            Sign out
          </button>
        </div>
      </aside>

      {/* Compact disclosure below xl */}
      <details
        open={mobileOpen}
        onToggle={(event) => setMobileOpen(event.currentTarget.open)}
        className="group border border-line bg-paper xl:hidden"
      >
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 [&::-webkit-details-marker]:hidden">
          <span className="eyebrow shrink-0 text-graphite">Account</span>
          <span aria-hidden className="text-ash">
            /
          </span>
          <span className="min-w-0 truncate text-[13.5px] font-medium text-ink">
            {activeItem?.label ?? 'Account'}
          </span>
          <ChevronDown
            size={16}
            strokeWidth={1.6}
            aria-hidden
            className="ml-auto shrink-0 text-graphite transition-transform duration-200 group-open:rotate-180"
          />
        </summary>

        <nav aria-label="Account sections" className="space-y-6 border-t border-line p-3">
          {groups(() => setMobileOpen(false))}
        </nav>

        <div className="border-t border-line p-3">
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false)
              signOut()
            }}
            className="flex min-h-11 w-full items-center gap-2.5 px-3 text-left text-[13px] text-graphite transition-colors duration-200 hover:text-ink"
          >
            <LogOut size={15} strokeWidth={1.6} aria-hidden />
            Sign out
          </button>
        </div>
      </details>
    </>
  )
}