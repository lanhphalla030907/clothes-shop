import { Link, useLocation } from 'react-router-dom'
import { Home, Store, Heart, ShoppingBag, UserRound } from 'lucide-react'
import { useCartActions } from '@/features/cart/useCartActions'
import { useWishlistActions } from '@/features/wishlist/useWishlistActions'

interface NavItem {
  label: string
  to: string
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
  countKey?: 'bag' | 'wishlist'
}

const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Home', to: '/', icon: Home },
  { label: 'Shop', to: '/shop', icon: Store },
  { label: 'Wishlist', to: '/dashboard/wishlist', icon: Heart, countKey: 'wishlist' },
  { label: 'Cart', to: '/dashboard/bag', icon: ShoppingBag, countKey: 'bag' },
  { label: 'Account', to: '/dashboard', icon: UserRound },
]

export function BottomNavigation() {
  const { pathname } = useLocation()
  const { itemCount: cartCount } = useCartActions()
  const { itemCount: wishlistCount } = useWishlistActions()

  const isActive = (to: string) => {
    if (to === '/') return pathname === '/'
    return pathname.startsWith(to)
  }

  const getCount = (key?: 'bag' | 'wishlist') => {
    if (!key) return 0
    return key === 'bag' ? cartCount : wishlistCount
  }

  return (
    <nav
      aria-label="Primary mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-40 flex h-[56px] items-center justify-around border-t border-line bg-paper/95 backdrop-blur-md lg:hidden safe-area-inset-bottom"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.to)
        const count = getCount(item.countKey)
        const showBadge = count > 0 && item.countKey

        return (
          <Link
            key={item.to}
            to={item.to}
            className={`flex flex-col items-center gap-1 px-3 py-2 min-h-[44px] transition-colors duration-200 ease-editorial ${
              active ? 'text-ink' : 'text-graphite hover:text-ink'
            }`}
            aria-current={active ? 'page' : undefined}
            aria-label={item.label}
          >
            <span className="relative flex size-6 items-center justify-center" aria-hidden="true">
              <item.icon size={20} strokeWidth={2} />
              {showBadge && (
                <span
                  className="absolute -top-1 -right-1 flex min-w-[14px] h-[14px] items-center justify-center rounded-full bg-ink px-1 font-mono text-[9px] leading-4 text-paper"
                  aria-label={`${count} ${count === 1 ? 'item' : 'items'} in ${item.label.toLowerCase()}`}
                >
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </span>
            <span className={`text-[10px] font-medium leading-none ${active ? 'text-ink' : 'text-graphite'}`}>
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}