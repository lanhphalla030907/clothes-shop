import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api/client'
import { API } from '@/lib/api/config'
import type {
  Address,
  CreateAddressRequest,
  UpdateAddressRequest,
  UUID,
} from '@/types/api'

/**
 * `GET/POST/PATCH/DELETE /addresses`, plus `POST /addresses/:id/default`.
 *
 * The address book is addressed by its owner, so no path can name somebody else's
 * entry; an id that is not the caller's answers the same 404 as an absent one.
 *
 * `setDefault` has its own route because "make this my default" is a state
 * transition, not an edit — and because it is the one write that moves the single
 * default slot. It is idempotent: naming the current default succeeds and changes
 * nothing.
 */

/** Default first. An empty book is a success, not a missing resource. */
export const fetchAddresses = async (signal?: AbortSignal): Promise<Address[]> => {
  const addresses = await apiGet<Address[]>(API.addresses, { signal })
  return addresses ?? []
}

export const createAddress = (body: CreateAddressRequest, signal?: AbortSignal): Promise<Address> =>
  apiPost<Address>(API.addresses, body, { signal }).then(requireAddress)

export const updateAddress = (
  id: UUID,
  body: UpdateAddressRequest,
  signal?: AbortSignal,
): Promise<Address> => apiPatch<Address>(`${API.addresses}/${id}`, body, { signal }).then(requireAddress)

export const setDefaultAddress = (id: UUID, signal?: AbortSignal): Promise<Address> =>
  apiPost<Address>(`${API.addresses}/${id}/default`, undefined, { signal }).then(requireAddress)

export const deleteAddress = (id: UUID, signal?: AbortSignal): Promise<void> =>
  apiDelete<void>(`${API.addresses}/${id}`, { signal }).then(() => undefined)

const requireAddress = (address: Address | undefined): Address => {
  if (!address) throw new Error('The address book did not return the saved address.')
  return address
}