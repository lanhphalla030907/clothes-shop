import { Heart, LayoutDashboard, MapPin, Receipt, ShoppingBag, UserRound, MessageSquare } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type AccountNavItem = {
  label: string
  to: string
  icon: LucideIcon
  /** Singular noun for a count badge, e.g. "item" / "piece". */
  countKey?: 'bag' | 'wishlist'
}

export type AccountNavGroup = {
  title: string
  items: readonly AccountNavItem[]
}

export const accountNavigation: readonly AccountNavGroup[] = [
  {
    title: 'Account',
    items: [
      { label: 'Overview', to: '/account', icon: LayoutDashboard },
      { label: 'Orders', to: '/account/orders', icon: Receipt },
      { label: 'Profile', to: '/account/profile', icon: UserRound },
    ],
  },
  {
    title: 'Shopping',
    items: [
      { label: 'Bag', to: '/account/bag', icon: ShoppingBag, countKey: 'bag' },
      { label: 'Wishlist', to: '/account/wishlist', icon: Heart, countKey: 'wishlist' },
    ],
  },
  {
    title: 'Delivery',
    items: [{ label: 'Addresses', to: '/account/addresses', icon: MapPin }],
  },
  {
    title: 'Voice',
    items: [{ label: 'Feedback', to: '/account/feedback', icon: MessageSquare }],
  },
] as const

export const accountNavItems: readonly AccountNavItem[] = accountNavigation.flatMap(
  (group) => group.items,
)
