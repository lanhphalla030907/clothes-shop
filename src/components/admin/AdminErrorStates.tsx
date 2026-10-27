import type { ReactNode } from 'react'
import { Action } from '@/components/ui/Action'

export function AdminLoading() {
  return (
    <div className="grid min-h-[50svh] place-items-center" role="status" aria-live="polite">
      <span className="label-micro animate-pulse text-ash">Loading</span>
    </div>
  )
}

export function AdminUnauthorized() {
  return (
    <div className="max-w-2xl border border-line bg-paper p-8">
      <p className="label-micro text-ash">Unauthorized</p>
      <h1 className="mt-4 text-xl font-semibold">Authentication required</h1>
      <p className="mt-2 text-sm leading-relaxed text-graphite">
        You need to sign in to access this area.
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
    <div className="max-w-2xl border border-line bg-paper p-8">
      <p className="label-micro text-ash">Forbidden</p>
      <h1 className="mt-4 text-xl font-semibold">Access denied</h1>
      <p className="mt-2 text-sm leading-relaxed text-graphite">
        Your account does not have permission to access the admin area.
      </p>
      <div className="mt-6 flex gap-3">
        <Action to="/" variant="outline" size="sm" withArrow>
          Back to storefront
        </Action>
        <Action to="/dashboard" variant="ghost" size="sm">
          Your account
        </Action>
      </div>
    </div>
  )
}

export function AdminError({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="max-w-2xl border border-line bg-paper p-8" role="alert">
      <p className="label-micro text-ash">Error</p>
      <h1 className="mt-4 text-xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm leading-relaxed text-graphite">{message}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
