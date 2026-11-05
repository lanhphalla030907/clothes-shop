import {
  ALLOWED_IMAGE_TYPES,
  IMAGE_LIMITS,
} from '@/features/adminProducts/catalogueRules'
import type {
  CreatePosterRequest,
  Poster,
  PosterFormValues,
  UpdatePosterRequest,
} from '@/types/api'

/**
 * Client-side mirrors of the poster DTOs.
 *
 * These catch what a form can see — an empty file, an oversized upload, a
 * non-integer display order, a title the server would reject — and leave
 * Cloudinary and persistence to the API.
 */

export const POSTER_LIMITS = {
  title: 255,
} as const

export const EMPTY_POSTER_FORM: PosterFormValues = {
  title: '',
  displayOrder: '0',
}

export type PosterFormErrors = Partial<
  Record<'title' | 'displayOrder' | 'file', string>
>

export const posterToFormValues = (poster: Poster): PosterFormValues => ({
  title: poster.title ?? '',
  displayOrder: String(poster.displayOrder),
})

const integerFrom = (value: string): number | null => {
  const trimmed = value.trim()
  if (trimmed === '') return null
  const parsed = Number(trimmed)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null
}

export const validatePosterFile = (file: File | null): string | undefined => {
  if (file === null) return 'Choose an image to upload'
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return 'Choose a JPEG, PNG, WebP, AVIF or GIF image'
  }
  if (file.size > IMAGE_LIMITS.fileBytes) {
    return 'The image must be 5 MB or smaller'
  }
  return undefined
}

export const validatePosterMetadata = (
  values: PosterFormValues,
): PosterFormErrors => {
  const errors: PosterFormErrors = {}

  if (values.title.length > POSTER_LIMITS.title) {
    errors.title = `A title must be ${POSTER_LIMITS.title} characters or fewer`
  }

  if (integerFrom(values.displayOrder) === null) {
    errors.displayOrder = 'Display order must be a whole number of zero or more'
  }

  return errors
}

export const validatePosterUpload = (
  values: PosterFormValues,
  file: File | null,
): PosterFormErrors => {
  const errors = validatePosterMetadata(values)
  const fileError = validatePosterFile(file)
  if (fileError !== undefined) errors.file = fileError
  return errors
}

export const hasPosterChanges = (
  values: PosterFormValues,
  poster: Poster,
): boolean =>
  values.title.trim() !== (poster.title ?? '') ||
  integerFrom(values.displayOrder) !== poster.displayOrder

export const buildCreatePosterRequest = (
  values: PosterFormValues,
): CreatePosterRequest => {
  const title = values.title.trim()
  const displayOrder = integerFrom(values.displayOrder) ?? 0

  return {
    ...(title === '' ? {} : { title }),
    displayOrder,
  }
}

export const buildUpdatePosterRequest = (
  values: PosterFormValues,
  poster: Poster,
): UpdatePosterRequest => {
  const body: UpdatePosterRequest = {}
  const title = values.title.trim()
  const displayOrder = integerFrom(values.displayOrder)

  if (title !== (poster.title ?? '')) body.title = title
  if (displayOrder !== null && displayOrder !== poster.displayOrder) {
    body.displayOrder = displayOrder
  }

  return body
}
