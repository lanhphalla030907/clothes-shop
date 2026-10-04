import { useCallback, useState } from 'react'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { createAddress, deleteAddress, fetchAddresses, setDefaultAddress, updateAddress } from './api'
import type {
  Address,
  AddressFormValues,
  CreateAddressRequest,
  UpdateAddressRequest,
  UUID,
} from '@/types/api'

/**
 * The address book: read plus every write the page offers.
 *
 * Two rules the UI depends on, both enforced by the server and mirrored here so
 * the interface can explain itself:
 *
 * - a user's **first** address becomes the default automatically, so the create
 *   form does not ask;
 * - `isDefault: false` on the current default is a **409**, so the "make
 *   default" control is simply absent for the address that already holds it
 *   rather than offering an action that would fail.
 *
 * Every write re-reads the list, because "make default" demotes another row and a
 * local patch would have to model that.
 */

export interface AddressBook {
  addresses: readonly Address[]
  defaultAddress: Address | undefined
  isLoading: boolean
  isRefreshing: boolean
  error: unknown
  actionError: unknown
  refetch: () => void
  create: (body: CreateAddressRequest) => Promise<Address | undefined>
  update: (id: UUID, body: UpdateAddressRequest) => Promise<Address | undefined>
  makeDefault: (id: UUID) => Promise<boolean>
  remove: (id: UUID) => Promise<boolean>
  /** Ids with a write in flight, so a row can disable just its own controls. */
  pendingIds: ReadonlySet<UUID>
  isCreating: boolean
  dismissActionError: () => void
}

export const useAddresses = (): AddressBook => {
  const resource = useAsyncResource<Address[]>((signal) => fetchAddresses(signal), [])

  const [pendingIds, setPendingIds] = useState<ReadonlySet<UUID>>(() => new Set())
  const [actionError, setActionError] = useState<unknown>(undefined)
  const [isCreating, setIsCreating] = useState(false)

  const withPending = useCallback(
    async <T,>(id: UUID | null, write: () => Promise<T>): Promise<T | undefined> => {
      if (id) setPendingIds((current) => new Set(current).add(id))
      setActionError(undefined)

      try {
        const result = await write()
        resource.refetch()
        return result
      } catch (cause) {
        setActionError(cause)
        return undefined
      } finally {
        if (id) {
          setPendingIds((current) => {
            const next = new Set(current)
            next.delete(id)
            return next
          })
        }
      }
    },
    [resource],
  )

  const create = useCallback(
    async (body: CreateAddressRequest) => {
      setIsCreating(true)
      try {
        return await withPending(null, () => createAddress(body))
      } finally {
        setIsCreating(false)
      }
    },
    [withPending],
  )

  const update = useCallback(
    (id: UUID, body: UpdateAddressRequest) => withPending(id, () => updateAddress(id, body)),
    [withPending],
  )

  const makeDefault = useCallback(
    async (id: UUID): Promise<boolean> => (await withPending(id, () => setDefaultAddress(id))) !== undefined,
    [withPending],
  )

  const remove = useCallback(
    async (id: UUID): Promise<boolean> => {
      try {
        await withPending(id, () => deleteAddress(id))
        return true
      } catch {
        return false
      }
    },
    [withPending],
  )

  const dismissActionError = useCallback(() => setActionError(undefined), [])

  const addresses = resource.data ?? []

  return {
    addresses,
    defaultAddress: addresses.find((address) => address.isDefault),
    isLoading: resource.isLoading,
    isRefreshing: resource.isRefreshing,
    error: resource.error,
    actionError,
    refetch: resource.refetch,
    create,
    update,
    makeDefault,
    remove,
    pendingIds,
    isCreating,
    dismissActionError,
  }
}

/** Form values → create body, kept here so the page does not import the mapping. */
export const toCreateRequest = (values: AddressFormValues): CreateAddressRequest => ({
  label: values.label,
  recipientName: values.recipientName,
  phone: values.phone,
  addressLine1: values.addressLine1,
  addressLine2: values.addressLine2.trim() === '' ? null : values.addressLine2,
  city: values.city,
  stateProvince: values.stateProvince.trim() === '' ? null : values.stateProvince,
  postalCode: values.postalCode.trim() === '' ? null : values.postalCode,
  countryCode: values.countryCode.trim().toUpperCase(),
})