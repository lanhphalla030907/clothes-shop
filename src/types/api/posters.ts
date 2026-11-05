import type { ISODateTime, UUID } from './common'

/**
 * A storefront campaign poster.
 *
 * Mirrors `PosterResponseDto`: the image URL and its Cloudinary public id are
 * the only media fields, and `title` is optional. `displayOrder` is the
 * server-owned sort key — lower numbers appear first.
 */
export interface Poster {
  id: UUID
  title: string | null
  imageUrl: string
  publicId: string
  isActive: boolean
  displayOrder: number
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

/** `POST /admin/posters` — a poster is created from an uploaded image. */
export interface CreatePosterRequest {
  title?: string
  displayOrder?: number
}

/**
 * `PATCH /admin/posters/:id` — only the editable metadata, never the image.
 * Replacing the image has its own multipart route.
 */
export interface UpdatePosterRequest {
  title?: string
  isActive?: boolean
  displayOrder?: number
}

export interface PosterFormValues {
  title: string
  displayOrder: string
}

export interface CreatePosterInput {
  file: File
  title?: string
  displayOrder?: number
}

export interface ReplacePosterImageInput {
  file: File
}
