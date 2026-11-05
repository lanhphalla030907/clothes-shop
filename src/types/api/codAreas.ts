import type { ISODateTime, UUID } from './common'

/** Administrative COD-area record, including whether the area is enabled. */
export interface CodArea {
  id: UUID
  code: string
  name: string
  codEnabled: boolean
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

/** Public endpoint returns only areas explicitly configured for COD. */
export interface PublicCodArea {
  id: UUID
  code: string
  name: string
}

export interface CreateCodAreaRequest {
  code: string
  name: string
}

export interface UpdateCodAreaRequest {
  name?: string
  codEnabled?: boolean
}

export interface CodAreaFormValues {
  code: string
  name: string
}
