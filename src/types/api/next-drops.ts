import type { ISODateTime, UUID } from './common'

export interface NextDrop {
  id: UUID
  title: string
  launchAt: ISODateTime | null
  collectionId: UUID | null
  promotionId: UUID | null
  buttonText: string | null
  buttonUrl: string
  isPublished: boolean
  createdAt: ISODateTime
  updatedAt: ISODateTime
  collection?: { id: UUID; title: string; slug: string; coverImage: string } | null
  promotion?: { id: UUID; code: string | null; name: string } | null
}

export interface NextDropPage {
  items: NextDrop[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export interface CreateNextDropInput {
  title: string
  launchAt: string
  collectionId?: string | null
  promotionId?: string | null
  buttonText?: string | null
  buttonUrl: string
  isPublished?: boolean
}

export interface UpdateNextDropInput {
  title?: string
  launchAt?: string
  collectionId?: string | null
  promotionId?: string | null
  buttonText?: string | null
  buttonUrl?: string
  isPublished?: boolean
}
