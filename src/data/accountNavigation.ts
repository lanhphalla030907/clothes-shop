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

/**
 * The account's navigation. Every entry is a screen that exists and reads real
 * data — there is no placeholder entry, because a disabled link is a promise the
 * phase does not keep.
 *
 * Checkout is deliberately absent. It is a flow, not a destination: it starts
 * from the bag and ends at payment, and a permanent sidebar link to it invites
 * people to abandon an order midway.
 */
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
