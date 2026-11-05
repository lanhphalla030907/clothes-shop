import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronDown, LogOut, ShieldCheck } from 'lucide-react'
import { accountNavItems } from '@/data/accountNavigation'
import { displayName, useAuth } from '@/features/auth/useAuth'

const initials = (first?: string, last?: string): string => {
  const letters = `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase()
  return letters.length === 2 ? letters : '—'
}

type AccountMenuProps = {
  onSignOut: () => void
  /** Counts shown beside Bag and Wishlist. */
  bagCount: number
  wishlistCount: number
}

/**
 * The signed-in account menu in the storefront header.
 *
 * It is a disclosure, not a `role="menu"` widget: the contents are ordinary
 * links in DOM order, so Tab works without a custom key map. Escape closes and
 * returns focus to the trigger; a click outside and any route change also close.
 */
export function AccountMenu({ onSignOut, bagCount, wishlistCount }: AccountMenuProps) {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [shownPath, setShownPath] = useState(pathname)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)

  // Navigating closes the menu during the same render instead of in an effect.
  if (shownPath !== pathname) {
    setShownPath(pathname)
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return undefined

    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      trigger.current?.focus()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const countFor = (key: 'bag' | 'wishlist' | undefined) =>
    key === 'bag' ? bagCount : key === 'wishlist' ? wishlistCount : 0

  return (
    <div ref={root} className="relative hidden sm:block">
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls="storefront-account-menu"
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-11 items-center gap-2 border border-transparent px-1.5 py-1 transition-colors hover:border-line hover:bg-bone"
      >
        <span
          aria-hidden
          className="grid size-8 place-items-center bg-ink font-mono text-[11px] tracking-wide text-paper"
        >
          {initials(user?.firstName, user?.lastName)}
        </span>
        <span className="hidden max-w-28 truncate text-[13px] font-medium text-ink lg:block">
          {displayName(user) || 'Account'}
        </span>
        <span className="sr-only">{displayName(user) || 'Account'} menu</span>
        <ChevronDown
          size={14}
          strokeWidth={1.7}
          aria-hidden
          className={`text-graphite transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          id="storefront-account-menu"
          className="absolute top-full right-0 z-10 mt-2 w-64 border border-line bg-paper shadow-[var(--shadow-raised)]"
        >
          <div className="border-b border-line px-4 py-3.5">
            <p className="truncate text-[14px] font-semibold text-ink">
              {displayName(user) || 'Your account'}
            </p>
            {user?.email && (
              <p className="mt-0.5 truncate text-[12.5px] text-graphite">{user.email}</p>
            )}
          </div>

          <nav aria-label="Account menu" className="p-1.5">
            {accountNavItems.map(({ label, to, icon: Icon, countKey }) => {
              const count = countFor(countKey)
              return (
                <Link
                  key={to}
                  to={to}
                  className="flex min-h-11 items-center gap-2.5 px-2.5 text-[13.5px] text-ink transition-colors hover:bg-bone"
                >
                  <Icon size={15} strokeWidth={1.6} aria-hidden className="text-graphite" />
                  <span className="flex-1">{label}</span>
                  {count > 0 && (
                    <span className="font-mono text-[11px] tabular-nums text-graphite">{count}</span>
                  )}
                </Link>
              )
            })}

            {user?.role === 'ADMIN' && (
              <Link
                to="/admin"
                className="flex min-h-11 items-center gap-2.5 px-2.5 text-[13.5px] text-ink transition-colors hover:bg-bone"
              >
                <ShieldCheck size={15} strokeWidth={1.6} aria-hidden className="text-graphite" />
                Admin studio
              </Link>
            )}
          </nav>

          <div className="border-t border-line p-1.5">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onSignOut()
              }}
              className="flex min-h-10 w-full items-center gap-2.5 px-2.5 text-left text-[13.5px] text-ink transition-colors hover:bg-bone"
            >
              <LogOut size={15} strokeWidth={1.6} aria-hidden className="text-graphite" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
