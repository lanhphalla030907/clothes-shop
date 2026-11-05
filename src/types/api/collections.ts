import type { ISODateTime, UUID } from './common'
import type { Product } from './catalogue'

export interface Collection {
  id: UUID
  title: string
  slug: string
  description: string | null
  coverImage: string
  isActive: boolean
  displayOrder: number
  createdAt: ISODateTime
  updatedAt: ISODateTime
  productCount?: number
}

export interface CollectionDetail {
  collection: Collection
  products: Product[]
  pagination?: { page: number; limit: number; total: number; totalPages: number }
}

export interface CreateCollectionInput {
  title: string
  description?: string
  displayOrder: number
  productIds: UUID[]
  file: File
}

export interface UpdateCollectionRequest {
  title?: string
  description?: string
  displayOrder?: number
  productIds?: UUID[]
}
