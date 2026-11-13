import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { PageHeader, Panel, PanelHeader } from '@/components/account/PageHeader'
import { Skeleton } from '@/components/account/Skeleton'
import { DefinitionRow } from '@/components/account/Bits'
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton'
import { fetchLinkedIdentities, type UserIdentity } from '@/features/auth/api'
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

  const [identities, setIdentities] = useState<UserIdentity[]>([])
  const [loadingIdentities, setLoadingIdentities] = useState(true)

  const loadIdentities = useCallback(async () => {
    try {
      setLoadingIdentities(true)
      const data = await fetchLinkedIdentities()
      setIdentities(data)
    } catch {
      // Degrade gracefully if identities request fails
    } finally {
      setLoadingIdentities(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    fetchLinkedIdentities()
      .then((data) => {
        if (active) setIdentities(data)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingIdentities(false)
      })

    return () => {
      active = false
    }
  }, [])

  const googleIdentity = identities.find((i) => i.provider === 'google')

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

        <Panel className="lg:col-span-2">
          <PanelHeader
            title="Connected accounts"
            hint="Manage federated identity providers connected to your account."
          />

          <div className="divide-y divide-line">
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex items-start gap-3.5">
                <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center border border-line bg-paper">
                  <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13.5px] font-medium text-ink">Google</span>
                    {!loadingIdentities && googleIdentity && (
                      <span className="inline-flex items-center gap-1 border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10.5px] font-medium text-emerald-600">
                        <CheckCircle2 className="size-3" /> Connected
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[12.5px] text-graphite">
                    {loadingIdentities ? (
                      <Skeleton className="h-3 w-40" />
                    ) : googleIdentity ? (
                      `Connected on ${new Date(googleIdentity.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}`
                    ) : (
                      'Not connected. Connect Google for 1-click sign-in.'
                    )}
                  </p>
                </div>
              </div>

              {!loadingIdentities && !googleIdentity && (
                <div className="sm:w-60">
                  <GoogleAuthButton mode="link" onSuccess={loadIdentities} />
                </div>
              )}
            </div>
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
            <Action to="/account/orders" variant="outline" size="sm" className="w-full">
              Your orders
            </Action>
            <Action to="/account/addresses" variant="outline" size="sm" className="w-full">
              Your addresses
            </Action>
            <Action to="/account/wishlist" variant="ghost" size="sm" className="w-full">
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
