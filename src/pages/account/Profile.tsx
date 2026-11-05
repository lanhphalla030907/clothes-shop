import { useNavigate } from 'react-router-dom'
import { Action } from '@/components/ui/Action'
import { PageHeader, Panel, PanelHeader } from '@/components/account/PageHeader'
import { Skeleton } from '@/components/account/Skeleton'
import { DefinitionRow } from '@/components/account/Bits'
import { displayName, useAuth } from '@/features/auth/useAuth'
import { useOrders } from '@/features/orders/useOrders'
import { useWishlistActions } from '@/features/wishlist/useWishlistActions'
import { useAddressActions } from '@/features/addresses/useAddressActions'

/**
 * What this account actually is.
 *
 * ## Why there is no edit form
 *
 * The API exposes `POST /users` for registration and `GET /auth/me` for the
 * session, but no update endpoint. There is nothing to edit *to*, so an editable
 * form with no save button behind it would be a lie. What is shown is the real
 * identity the server returns.
 *
 * ## Why the aggregates are counted per request
 *
 * Orders, saved pieces and addresses come from three endpoints. They are fetched
 * here so the numbers are real, and each degrades on its own rather than the whole
 * page failing if one is down.
 */
export default function Profile() {
  const { user, isInitializing, logout } = useAuth()
  const orders = useOrders()
  const wishlist = useWishlistActions()
  const addresses = useAddressActions()
  const navigate = useNavigate()

  const handleSignOut = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Account"
        title="Profile"
        description="Your account as the studio server knows it."
        action={
          <Action variant="ghost" size="sm" onClick={handleSignOut}>
            Sign out
          </Action>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader
            title="Identity"
            hint="These details are set when the account is registered."
          />

          <dl className="px-5 py-4 sm:px-6 sm:py-5">
            <DefinitionRow label="Name">
              {!isInitializing ? displayName(user) || '—' : <Skeleton className="h-3 w-32" />}
            </DefinitionRow>
            <DefinitionRow label="Email">
              {!isInitializing ? user?.email : <Skeleton className="h-3 w-48" />}
            </DefinitionRow>
            <DefinitionRow label="Account id">
              {!isInitializing ? (
                <span className="font-mono text-[12px] break-all">{user?.id}</span>
              ) : (
                <Skeleton className="h-3 w-64" />
              )}
            </DefinitionRow>
            <DefinitionRow label="Member since">
              {!isInitializing && user ? (
                new Date(user.createdAt).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })
              ) : (
                <Skeleton className="h-3 w-24" />
              )}
            </DefinitionRow>
          </dl>

          <div className="border-t border-line px-5 py-5 sm:px-6">
            <p className="eyebrow text-ink">Changing these details</p>
            <p className="mt-3 max-w-prose text-[13.5px] leading-relaxed text-graphite">
              This build has no endpoint for updating a profile, so the screen is read-only. Your
              bag, wishlist, addresses and orders are all stored against this account.
            </p>
          </div>
        </Panel>

        <Panel className="flex flex-col">
          <PanelHeader title="At a glance" />
          <dl className="px-5 py-4 sm:px-6 sm:py-5">
            <DefinitionRow label="Orders">{count(orders, orders.data?.length)}</DefinitionRow>
            <DefinitionRow label="Saved pieces">
              {count(wishlist, wishlist.items.length)}
            </DefinitionRow>
            <DefinitionRow label="Addresses">
              {count(addresses, addresses.addresses.length)}
            </DefinitionRow>
          </dl>

          <div className="mt-auto space-y-2 border-t border-line px-5 py-5 sm:px-6">
            <Action to="/dashboard/orders" variant="outline" size="sm" className="w-full">
              Your orders
            </Action>
            <Action to="/dashboard/addresses" variant="outline" size="sm" className="w-full">
              Your addresses
            </Action>
            <Action to="/dashboard/wishlist" variant="ghost" size="sm" className="w-full">
              Saved pieces
            </Action>
          </div>
        </Panel>
      </div>
    </div>
  )
}

/**
 * A count, or an em dash when its request failed.
 *
 * Never `0` on an error: "you have no orders" and "we could not load your orders" are
 * different facts, and only one of them is a number.
 */
const count = (
  source: { isLoading: boolean; error: unknown },
  value: number | undefined,
): string => {
  if (source.isLoading) return '—'
  if (source.error) return 'Unavailable'
  return String(value ?? 0)
}
