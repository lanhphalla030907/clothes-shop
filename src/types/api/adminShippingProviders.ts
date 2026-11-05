import type { ISODateTime, MoneyString, UUID } from './common'

/** Administrative shipping-provider response, including activation state. */
export interface ShippingProvider {
  id: UUID
  code: string
  name: string
  description: string | null
  baseFee: MoneyString
  isActive: boolean
  supportsCod: boolean
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

/** Public response omits activation and administrative timestamps. */
export interface PublicShippingProvider {
  id: UUID
  code: string
  name: string
  description: string | null
  baseFee: MoneyString
  supportsCod: boolean
}

export interface CreateShippingProviderRequest {
  code: string
  name: string
  description?: string
  baseFee: MoneyString
  isActive?: boolean
  supportsCod?: boolean
}

export interface UpdateShippingProviderRequest {
  code?: string
  name?: string
  description?: string | null
  baseFee?: MoneyString
  isActive?: boolean
  supportsCod?: boolean
}

export interface ShippingProviderFormValues {
  code: string
  name: string
  description: string
  baseFee: string
  supportsCod: boolean
}
