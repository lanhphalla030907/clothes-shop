import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { useAuth } from '@/features/auth/useAuth'
import { createAddress, deleteAddress, fetchAddresses, setDefaultAddress, updateAddress } from './api'
import { AddressActionsContext } from './addressActions'
import type { Address, CreateAddressRequest, UpdateAddressRequest, UUID } from '@/types/api'

const CREATE_KEY = 'create'

type WriteOutcome<T> = { ok: true; value: T } | { ok: false }

export function AddressActionsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  // Addresses only exist against an account, so signed out the book is empty
  // rather than an error the customer would have to dismiss.
  const resource = useAsyncResource<Address[]>(
    (signal) => (isAuthenticated ? fetchAddresses(signal) : Promise.resolve([])),
    [isAuthenticated],
  )

  const [pendingIds, setPendingIds] = useState<ReadonlySet<UUID>>(() => new Set())
  const [actionError, setActionError] = useState<unknown>(undefined)
  const inFlight = useRef<ReadonlySet<UUID>>(new Set())

  const perform = useCallback(
    async <T,>(key: UUID, write: () => Promise<T>): Promise<WriteOutcome<T>> => {
      // A ref, not the pending set: two clicks in one tick both see an empty set.
      if (inFlight.current.has(key)) return { ok: false }

      inFlight.current = new Set(inFlight.current).add(key)
      setPendingIds((current) => new Set(current).add(key))
      setActionError(undefined)

      try {
        const value = await write()
        return { ok: true, value }
      } catch (cause) {
        setActionError(cause)
        return { ok: false }
      } finally {
        inFlight.current = new Set([...inFlight.current].filter((entry) => entry !== key))
        setPendingIds((current) => {
          const next = new Set(current)
          next.delete(key)
          return next
        })
        // Every write can move another row (promotions, demotions, a default that
        // changed hands), so the list is re-read whatever the outcome was.
        resource.refetch()
      }
    },
    [resource],
  )

  const create = useCallback(
    async (body: CreateAddressRequest) => {
      const outcome = await perform(CREATE_KEY, () => createAddress(body))
      return outcome.ok ? outcome.value : undefined
    },
    [perform],
  )

  const update = useCallback(
    async (id: UUID, body: UpdateAddressRequest) => {
      const outcome = await perform(id, () => updateAddress(id, body))
      return outcome.ok ? outcome.value : undefined
    },
    [perform],
  )

  const makeDefault = useCallback(
    async (id: UUID) => (await perform(id, () => setDefaultAddress(id))).ok,
    [perform],
  )

  const remove = useCallback(
    async (id: UUID) => (await perform(id, () => deleteAddress(id))).ok,
    [perform],
  )

  const value = useMemo(
    () => {
      const addresses = resource.data ?? []

      return {
        addresses,
        defaultAddress: addresses.find((address) => address.isDefault),
        isLoading: resource.isLoading,
        isRefreshing: resource.isRefreshing,
        error: resource.error,
        refetch: resource.refetch,
        actionError,
        dismissActionError: () => setActionError(undefined),
        create,
        update,
        makeDefault,
        remove,
        pendingIds,
        isCreating: pendingIds.has(CREATE_KEY),
      }
    },
    [resource, actionError, create, update, makeDefault, remove, pendingIds],
  )

  return <AddressActionsContext.Provider value={value}>{children}</AddressActionsContext.Provider>
}