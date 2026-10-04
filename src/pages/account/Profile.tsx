import { Action } from '@/components/ui/Action'
import { PageHeader, Panel, PanelHeader } from '@/components/account/PageHeader'
import { ErrorState, InlineNotice } from '@/components/account/States'
import { Skeleton } from '@/components/account/Skeleton'
import { DefinitionRow } from '@/components/account/Bits'
import { displayName, useIdentity } from '@/features/identity/useIdentity'
import { useOrders } from '@/features/orders/useOrders'
import { useWishlist } from '@/features/wishlist/useWishlist'
import { useAddresses } from '@/features/addresses/useAddresses'
import { toUserMessage } from '@/lib/api/errors'

/**
 * What this account actually is.
 *
 * ## Why there is no edit form
 *
 * The API has no `GET /users/me` and no update endpoint — the only user route this
 * app may call is `POST /users`, and only to provision an identity. So there is
 * nothing to edit *to*, and an editable form with no save button behind it would be
 * a lie.
 *
 * What is shown instead is the real provisional identity: a first and last name and
 * an email that were generated on this device. They are labelled as provisional on
 * purpose — presenting them as details the shopper chose would be untrue.
 *
 * ## Why the aggregates are counted per request
 *
 * Orders, saved pieces and addresses come from three endpoints. They are fetched
 * here so the numbers are real, and each degrades on its own rather than the whole
 * page failing if one is down.
 */
export default function Profile() {
  const { identity, isReady, error, retry } = useIdentity()
  const orders = useOrders()
  const wishlist = useWishlist()
  const addresses = useAddresses()

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Account"
        title="Profile"
        description="Your account as the studio server knows it."
      />

      {error !== undefined && (
        <div className="space-y-4">
          <ErrorState message={toUserMessage(error)} onRetry={retry} />
          <InlineNotice
            tone="info"
            message="Everything on this page needs a working identity. Retrying will provision a new one for this device, which means an empty cart, wishlist and order history."
          />
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader
            title="Identity"
            hint="Provisional for this phase. Sign-in is not implemented, so these details were generated rather than chosen."
          />

          <dl className="px-6 py-5">
            <DefinitionRow label="Name">
              {isReady ? displayName(identity) : <Skeleton className="h-3 w-32" />}
            </DefinitionRow>
            <DefinitionRow label="Email">
              {isReady ? identity?.email : <Skeleton className="h-3 w-48" />}
            </DefinitionRow>
            <DefinitionRow label="User id">
              {isReady ? (
                <span className="font-mono text-xs break-all">{identity?.userId}</span>
              ) : (
                <Skeleton className="h-3 w-64" />
              )}
            </DefinitionRow>
            <DefinitionRow label="Since">
              {isReady && identity ? (
                new Date(identity.claimedAt).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })
              ) : (
                <Skeleton className="h-3 w-24" />
              )}
            </DefinitionRow>
          </dl>

          <div className="border-t border-line px-6 py-5">
            <p className="label-micro text-ink">What you can change</p>
            <p className="mt-3 max-w-prose text-sm leading-relaxed text-graphite">
              Nothing here yet. The API exposes no endpoint to read or update a profile, so this
              screen shows what is stored and stops there. Names, email and password arrive with
              sign-in.
            </p>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="At a glance" />
          <dl className="px-6 py-5">
            <DefinitionRow label="Orders">{count(orders, orders.data?.length)}</DefinitionRow>
            <DefinitionRow label="Saved pieces">{count(wishlist, wishlist.items.length)}</DefinitionRow>
            <DefinitionRow label="Addresses">{count(addresses, addresses.addresses.length)}</DefinitionRow>
          </dl>

          <div className="space-y-3 border-t border-line px-6 py-5">
            <Action to="/dashboard/orders" variant="outline" size="sm" className="w-full">
              Your orders
            </Action>
            <Action to="/dashboard/addresses" variant="outline" size="sm" className="w-full">
              Your addresses
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
