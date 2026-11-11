import { useState } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { FormError } from '@/components/account/Field'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { EmptyState, ErrorState } from '@/components/account/States'
import { Skeleton } from '@/components/account/Skeleton'
import { useFeedback } from '@/context/feedbackContext'
import {
  fetchAdminCodEligibility,
  updateAdminCodEligibility,
} from '@/features/locations/api'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { useMutation } from '@/hooks/useMutation'
import { toUserMessage } from '@/lib/api/errors'
import type {
  AdminCodEligibility,
  UpdateCodEligibilityRequest,
} from '@/types/api'

const EMPTY_LOCATIONS: AdminCodEligibility[] = []

const locationLabel = (location: AdminCodEligibility) =>
  location.nameKm
    ? `${location.nameEn} / ${location.nameKm}`
    : location.nameEn

const overrideLabel = (value: boolean | null) => {
  if (value === true) return 'Allowed here'
  if (value === false) return 'Blocked here'
  return 'Inherited'
}

export default function CodEligibilityIndex() {
  const { showFeedback, confirmFeedback } = useFeedback()
  const [path, setPath] = useState<AdminCodEligibility[]>([])
  const parent = path[path.length - 1]
  const locations = useAsyncResource(
    (signal) => fetchAdminCodEligibility(parent?.pcode, signal),
    [parent?.pcode],
  )

  const updateMutation = useMutation<
    [string, UpdateCodEligibilityRequest],
    AdminCodEligibility
  >((pcode, body) => updateAdminCodEligibility(pcode, body), {
    onSuccess: (updated) => {
      locations.refetch()
      showFeedback({
        type: 'success',
        title: 'COD eligibility updated',
        message: `${locationLabel(updated)} now ${updated.codEnabled ? 'allows' : 'does not allow'} Cash on Delivery.`,
      })
    },
  })

  const rows = locations.data ?? EMPTY_LOCATIONS
  const mutationError = updateMutation.error

  const setOverride = async (
    location: AdminCodEligibility,
    codEnabledOverride: boolean | null,
  ) => {
    if (codEnabledOverride === false) {
      const confirmed = await confirmFeedback({
        type: 'warning',
        title: 'Disable COD for this location?',
        message: `Customers at ${locationLabel(location)} will not be able to use Cash on Delivery. A disabled province also blocks all its subareas.`,
        confirmLabel: 'Disable COD',
        cancelLabel: 'Keep enabled',
      })
      if (!confirmed) return
    }

    updateMutation.reset()
    await updateMutation.run(location.pcode, { codEnabledOverride })
  }

  const enter = (location: AdminCodEligibility) => {
    if (location.adminLevel < 3) setPath((current) => [...current, location])
  }

  const goTo = (index: number) => setPath((current) => current.slice(0, index + 1))
  const provinceAllowsCod = path[0]?.codEnabled === true

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Delivery"
        title="Address-based COD eligibility"
        description="Enable Cash on Delivery by province or municipality, then optionally override districts and communes. A disabled province always blocks its subareas."
      />

      {mutationError !== undefined && (
        <div className="space-y-3">
          <FormError message={toUserMessage(mutationError)} />
          <Action variant="outline" size="sm" onClick={updateMutation.reset}>
            Dismiss
          </Action>
        </div>
      )}

      {path.length > 0 && (
        <nav aria-label="Administrative location path" className="flex flex-wrap items-center gap-1.5 rounded-lg border border-line bg-paper-pure px-3.5 py-2 text-sm shadow-xs">
          <Action variant="ghost" size="sm" onClick={() => setPath([])}>
            Provinces
          </Action>
          {path.map((location, index) => (
            <span key={location.pcode} className="inline-flex items-center gap-2">
              <ChevronRight size={14} aria-hidden />
              {index === path.length - 1 ? (
                <span aria-current="location" className="font-medium text-ink">
                  {locationLabel(location)}
                </span>
              ) : (
                <Action variant="ghost" size="sm" onClick={() => goTo(index)}>
                  {locationLabel(location)}
                </Action>
              )}
            </span>
          ))}
        </nav>
      )}

      {locations.isLoading && (
        <div className="space-y-3" aria-label="Loading COD eligibility">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {!locations.isLoading && locations.error !== undefined && (
        <ErrorState
          message={toUserMessage(locations.error)}
          onRetry={locations.refetch}
        />
      )}

      {!locations.isLoading &&
        !locations.isRefreshing &&
        locations.error === undefined &&
        rows.length === 0 && (
          <EmptyState
            align="left"
            eyebrow="No locations"
            title="No administrative locations found"
            description="The canonical Cambodia location dataset is not available."
          />
        )}

      {!locations.isLoading &&
        !locations.isRefreshing &&
        locations.error === undefined &&
        rows.length > 0 && (
          <section aria-label="COD eligibility locations" className="space-y-3">
            {locations.isRefreshing && (
              <p role="status" className="text-sm text-graphite">
                Refreshing eligibility…
              </p>
            )}
            {path.length > 0 && (
              <Action
                variant="outline"
                size="sm"
                onClick={() => setPath((current) => current.slice(0, -1))}
              >
                <ChevronLeft size={15} aria-hidden />
                Back
              </Action>
            )}
            {rows.map((location) => {
              const canEnable =
                location.adminLevel === 1 || provinceAllowsCod
              return (
                <article
                  key={location.pcode}
                  className="flex flex-col gap-4 rounded-xl border border-line bg-paper-pure p-5 shadow-xs transition-all hover:border-graphite/30 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <h2 className="font-medium text-ink">{locationLabel(location)}</h2>
                    <p className="mt-1 text-xs text-graphite">
                      {location.adminLevel === 1
                        ? 'Province / municipality'
                        : location.adminLevel === 2
                          ? 'District'
                          : 'Commune'}{' '}
                      · {location.pcode}
                    </p>
                    <p className="mt-1 text-sm text-graphite">
                      Rule: {overrideLabel(location.codEnabledOverride)} · Effective:{' '}
                      {location.codEnabled ? 'COD enabled' : 'COD disabled'}
                    </p>
                    {location.adminLevel > 1 && !provinceAllowsCod && (
                      <p className="mt-1 text-xs text-graphite">
                        Enable the province before a subarea can be COD eligible.
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {location.adminLevel < 3 && (
                      <Action
                        variant="outline"
                        size="sm"
                        onClick={() => enter(location)}
                        aria-label={`Manage subareas for ${locationLabel(location)}`}
                      >
                        Manage subareas
                        <ChevronRight size={15} aria-hidden />
                      </Action>
                    )}
                    <Action
                      variant={location.codEnabledOverride === true ? 'outline' : 'ghost'}
                      size="sm"
                      disabled={updateMutation.isPending || !canEnable || location.codEnabledOverride === true}
                      onClick={() => void setOverride(location, true)}
                    >
                      Enable
                    </Action>
                    <Action
                      variant={location.codEnabledOverride === false ? 'outline' : 'ghost'}
                      size="sm"
                      disabled={updateMutation.isPending || location.codEnabledOverride === false}
                      onClick={() => void setOverride(location, false)}
                    >
                      Disable
                    </Action>
                    {location.codEnabledOverride !== null && (
                      <Action
                        variant="ghost"
                        size="sm"
                        disabled={updateMutation.isPending}
                        onClick={() => void setOverride(location, null)}
                        aria-label={`Inherit COD rule for ${locationLabel(location)}`}
                      >
                        <RotateCcw size={14} aria-hidden />
                        Inherit
                      </Action>
                    )}
                  </div>
                </article>
              )
            })}
          </section>
        )}
    </div>
  )
}
