import { createContext } from 'react'
import type { Address, CreateAddressRequest, UpdateAddressRequest, UUID } from '@/types/api'

export interface AddressActions {
  addresses: readonly Address[]
  defaultAddress: Address | undefined
  isLoading: boolean
  isRefreshing: boolean
  error: unknown
  refetch: () => void
  actionError: unknown
  dismissActionError: () => void
  create: (body: CreateAddressRequest) => Promise<Address | undefined>
  update: (id: UUID, body: UpdateAddressRequest) => Promise<Address | undefined>
  /** Moves the single default slot; naming the incumbent is a server no-op. */
  makeDefault: (id: UUID) => Promise<boolean>
  remove: (id: UUID) => Promise<boolean>
  pendingIds: ReadonlySet<UUID>
  isCreating: boolean
}

export const AddressActionsContext = createContext<AddressActions | undefined>(undefined)