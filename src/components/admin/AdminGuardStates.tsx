import type { ReactNode } from 'react'
import { Action } from '@/components/ui/Action'
import { Skeleton } from '@/components/account/Skeleton'

export function AdminLoading() {
  return (
    <div className="mx-auto max-w-2xl py-10" role="status" aria-live="polite">
      <span className="sr-only">Loading</span>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-5 h-9 w-2/3" />
      <Skeleton className="mt-4 h-3 w-full" />
      <Skeleton className="mt-2 h-3 w-4/5" />
      <Skeleton className="mt-8 h-12 w-full" />
    </div>
  )
}

export function AdminUnauthorized() {
  return (
    <div className="mx-auto max-w-2xl border border-line bg-paper p-6 sm:p-8">
      <p className="eyebrow text-graphite">Sign in required</p>
      <h1 className="mt-3 text-xl font-semibold tracking-[-0.015em] text-ink sm:text-2xl">
        Authentication required
      </h1>
      <p className="mt-2.5 text-[14.5px] leading-relaxed text-graphite">
        You need to sign in with an administrator account to access this area.
      </p>
      <div className="mt-6">
        <Action to="/login" variant="outline" size="sm">
          Sign in
        </Action>
      </div>
    </div>
  )
}

export function AdminForbidden() {
  return (
    <div className="mx-auto max-w-2xl border border-line bg-paper p-6 sm:p-8">
      <p className="eyebrow text-graphite">Access denied</p>
      <h1 className="mt-3 text-xl font-semibold tracking-[-0.015em] text-ink sm:text-2xl">
        This area is for administrators
      </h1>
      <p className="mt-2.5 text-[14.5px] leading-relaxed text-graphite">
        You are signed in as a customer. The studio tools need an admin account — your orders,
        wishlist and addresses are still available in your dashboard.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Action to="/dashboard" size="sm" withArrow>
          Your dashboard
        </Action>
        <Action to="/" variant="outline" size="sm">
          Back to storefront
        </Action>
      </div>
    </div>
  )
}

export function AdminError({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl border border-signal/25 bg-signal-soft p-6 sm:p-8" role="alert">
      <p className="eyebrow text-signal">Error</p>
      <h1 className="mt-3 text-xl font-semibold tracking-[-0.015em] text-ink sm:text-2xl">
        Something went wrong
      </h1>
      <p className="mt-2.5 max-w-prose text-[14.5px] leading-relaxed text-ink/80">{message}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
