import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Store, Heart, ShoppingBag, UserRound } from 'lucide-react'
import { useCartActions } from '@/features/cart/useCartActions'
import { useWishlistActions } from '@/features/wishlist/useWishlistActions'

interface NavItem {
  label: string
  to: string
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
  countKey?: 'bag' | 'wishlist'
}

const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Home', to: '/', icon: Home },
  { label: 'Shop', to: '/shop', icon: Store },
  { label: 'Wishlist', to: '/account/wishlist', icon: Heart, countKey: 'wishlist' },
  { label: 'Bag', to: '/account/bag', icon: ShoppingBag, countKey: 'bag' },
  { label: 'Account', to: '/account', icon: UserRound },
]

export function BottomNavigation() {
  const { pathname } = useLocation()
  const { itemCount: cartCount } = useCartActions()
  const { itemCount: wishlistCount } = useWishlistActions()

  const activeTo = NAV_ITEMS.reduce<string | undefined>((best, item) => {
    const matches =
      item.to === '/' ? pathname === '/' : pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (!matches) return best
    return best === undefined || item.to.length > best.length ? item.to : best
  }, undefined)

  const getCount = (key?: 'bag' | 'wishlist') => {
    if (!key) return 0
    return key === 'bag' ? cartCount : wishlistCount
  }

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-4 left-4 right-4 z-50 lg:hidden"
    >
      {/* 
        The container is a floating pill. 
        We use pb-2 to give space for the active circle to pop up.
      */}
      <div className="relative mx-auto max-w-md bg-white/95 backdrop-blur-xl border border-gray-200 shadow-[0_10px_40px_rgba(0,0,0,0.08)] rounded-full h-[72px] flex items-center justify-between px-2">
        
        {NAV_ITEMS.map((item) => {
          const active = item.to === activeTo
          const count = getCount(item.countKey)
          const showBadge = count > 0 && item.countKey

          return (
            <Link
              key={item.to}
              to={item.to}
              className="relative flex flex-col items-center justify-center w-full h-full"
              aria-current={active ? 'page' : undefined}
              aria-label={item.label}
            >
              {/* 
                The Active Black Circle 
                It's absolutely positioned in the center. 
                We use negative top margin to push it above the bar.
              */}
              {active && (
                <motion.div
                  layoutId="bottom-nav-circle"
                  className="absolute -top-6 w-[64px] h-[64px] bg-[#111] rounded-full flex flex-col items-center justify-center shadow-lg z-10"
                  transition={{ type: 'spring', bounce: 0.25, duration: 0.6 }}
                >
                  <item.icon size={20} strokeWidth={2} className="text-white" />
                  <span className="text-[8px] font-bold tracking-widest uppercase text-white mt-0.5">
                    {item.label}
                  </span>

                  {/* Badge inside the circle */}
                  {showBadge && (
                    <span className="absolute top-0 right-0 flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-white text-[#111] px-1 font-mono text-[10px] font-bold border-2 border-[#111]">
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </motion.div>
              )}

              {/* Inactive State */}
              {!active && (
                <>
                  <div className="relative text-gray-500">
                    <item.icon size={22} strokeWidth={1.5} />
                    {showBadge && (
                      <span className="absolute -top-1.5 -right-2 flex min-w-[16px] h-[16px] items-center justify-center rounded-full bg-[#111] text-white px-1 font-mono text-[9px] font-bold">
                        {count > 99 ? '99+' : count}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-bold tracking-wider uppercase text-gray-500 mt-1">
                    {item.label}
                  </span>
                </>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}