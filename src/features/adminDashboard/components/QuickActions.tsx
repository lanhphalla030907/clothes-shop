import { Link } from 'react-router-dom'
import {
  BadgePercent,
  ClipboardList,
  Package,
  Sliders,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type QuickAction = {
  label: string
  description: string
  to: string
  icon: LucideIcon
}

const ACTIONS: readonly QuickAction[] = [
  {
    label: 'Orders',
    description: 'Review and fulfil',
    to: '/admin/orders',
    icon: ClipboardList,
  },
  {
    label: 'Products',
    description: 'Catalogue records',
    to: '/admin/products',
    icon: Package,
  },
  {
    label: 'Customers',
    description: 'Accounts and history',
    to: '/admin/customers',
    icon: Users,
  },
  {
    label: 'Inventory',
    description: 'Variant stock',
    to: '/admin/product-variants',
    icon: Sliders,
  },
  {
    label: 'Finance',
    description: 'Revenue and cash',
    to: '/admin/finance',
    icon: TrendingUp,
  },
  {
    label: 'Promotions',
    description: 'Discounts and codes',
    to: '/admin/promotions',
    icon: BadgePercent,
  },
  {
    label: 'Delivery',
    description: 'Staff and assignments',
    to: '/admin/delivery-staff',
    icon: Truck,
  },
]

/** Shortcuts to routes that already exist in the admin application. */
export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-2 p-4 sm:p-5">
      {ACTIONS.map(({ label, description, to, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className="group flex items-start gap-2.5 rounded-lg border border-line-soft bg-paper-pure p-3 transition-colors hover:border-ink hover:bg-bone/60"
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-md bg-bone text-graphite transition-colors group-hover:bg-ink group-hover:text-paper">
            <Icon size={14} strokeWidth={1.8} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-[12.5px] font-semibold text-ink">
              {label}
            </span>
            <span className="block text-[11px] leading-tight text-graphite">
              {description}
            </span>
          </span>
        </Link>
      ))}
    </div>
  )
}
