import { motion } from 'framer-motion'
import { Package, FolderTree, ShoppingCart, Boxes } from 'lucide-react'
import { displayName, useAuth } from '@/features/auth/useAuth'

const sections = [
  {
    title: 'Catalogue management',
    description: 'Products and categories structure. No real data yet.',
    icon: Package,
  },
  {
    title: 'Inventory management',
    description: 'Stock tracking and availability. Not implemented in this phase.',
    icon: Boxes,
  },
  {
    title: 'Order management',
    description: 'Orders and fulfillment workflows. Coming soon.',
    icon: ShoppingCart,
  },
  {
    title: 'Payment/order workflow',
    description: 'Payment states and workflow controls. Coming soon.',
    icon: FolderTree,
  },
]

export default function AdminDashboard() {
  const { user } = useAuth()

  return (
    <div className="max-w-5xl">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center gap-4"
      >
        <span className="h-px w-8 bg-line" aria-hidden />
        <span className="label-micro text-graphite">Administration</span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
        className="type-display mt-6 text-4xl leading-[0.88] sm:text-6xl"
      >
        Dashboard
      </motion.h1>

      <p className="mt-6 max-w-prose text-sm leading-relaxed text-graphite">
        Signed in as {displayName(user) || 'an administrator'} ({user?.role}). System sections below are for orientation only.
        <span className="block mt-2">No statistics are fetched in this phase — unavailable metrics are clearly distinguished from real data.</span>
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <div
              key={section.title}
              className="border border-line bg-paper p-6 transition-colors duration-200 hover:border-ink"
            >
              <div className="flex items-center gap-3">
                <Icon size={18} strokeWidth={1.5} />
                <h2 className="text-base font-medium">{section.title}</h2>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-graphite">{section.description}</p>
            </div>
          )
        })}
      </div>

      <div className="mt-8 border border-line bg-bone/50 p-4">
        <p className="text-xs text-graphite">
          Quick navigation: use the sidebar to access admin areas. Items marked "SOON" are structural placeholders only.
        </p>
      </div>
    </div>
  )
}
