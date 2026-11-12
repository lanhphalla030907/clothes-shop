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
      { label: 'Overview', to: '/dashboard', icon: LayoutDashboard },
      { label: 'Orders', to: '/dashboard/orders', icon: Receipt },
      { label: 'Profile', to: '/dashboard/profile', icon: UserRound },
    ],
  },
  {
    title: 'Shopping',
    items: [
      { label: 'Bag', to: '/dashboard/bag', icon: ShoppingBag, countKey: 'bag' },
      { label: 'Wishlist', to: '/dashboard/wishlist', icon: Heart, countKey: 'wishlist' },
    ],
  },
  {
    title: 'Delivery',
    items: [{ label: 'Addresses', to: '/dashboard/addresses', icon: MapPin }],
  },
  {
    title: 'Voice',
    items: [{ label: 'Feedback', to: '/dashboard/feedback', icon: MessageSquare }],
  },
] as const

export const accountNavItems: readonly AccountNavItem[] = accountNavigation.flatMap(
  (group) => group.items,
)
