import { useState } from 'react'
import type { FormEvent } from 'react'
import { Action } from '@/components/ui/Action'
import { FormError, TextField } from '@/components/account/Field'
import { Modal } from '@/components/account/Modal'
import {
  EMPTY_POSTER_FORM,
  POSTER_LIMITS,
  buildCreatePosterRequest,
  hasPosterChanges,
  posterToFormValues,
  validatePosterFile,
  validatePosterMetadata,
  validatePosterUpload,
  type PosterFormErrors,
} from '@/features/adminPosters/rules'
import { ALLOWED_IMAGE_TYPES } from '@/features/adminProducts/catalogueRules'
import { toUserMessage } from '@/lib/api/errors'
import type {
  CreatePosterInput,
  Poster,
  PosterFormValues,
} from '@/types/api'

const fileInputClasses =
  'mt-2 block w-full border border-line bg-paper-pure px-3 py-2.5 text-[13px] text-ink file:mr-3 file:border-0 file:bg-bone file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-ink'

const FileField = ({
  id,
  label,
  error,
  onSelect,
}: {
  id: string
  label: string
  error: string | undefined
  onSelect: (file: File | null) => void
}) => (
  <div>
    <label htmlFor={id} className="block text-[13px] font-medium text-ink">
      {label} <span className="text-signal">*</span>
    </label>
    <input
      id={id}
      name={id}
      type="file"
      accept={ALLOWED_IMAGE_TYPES.join(',')}
      onChange={(event) => onSelect(event.target.files?.[0] ?? null)}
      aria-invalid={error !== undefined}
      aria-describedby={error === undefined ? `${id}-hint` : `${id}-error`}
      className={fileInputClasses}
    />
    {error !== undefined ? (
      <p id={`${id}-error`} className="mt-1.5 text-[12.5px] text-signal">
        {error}
      </p>
    ) : (
      <p
        id={`${id}-hint`}
        className="mt-1.5 text-[12px] leading-relaxed text-graphite"
      >
        JPEG, PNG, WebP, AVIF or GIF. Maximum 5 MB. The backend uploads the file
        to Cloudinary.
      </p>
    )}
  </div>
)

export function PosterUploadModal({
  isSaving,
  serverError,
  onClose,
  onSubmit,
}: {
  isSaving: boolean
  serverError: unknown
  onClose: () => void
  onSubmit: (input: CreatePosterInput) => Promise<Poster | undefined>
}) {
  const [values, setValues] = useState<PosterFormValues>(EMPTY_POSTER_FORM)
  const [file, setFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<PosterFormErrors>({})

  const setField = <K extends keyof PosterFormValues>(
    field: K,
    value: PosterFormValues[K],
  ) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) =>
      current[field] === undefined ? current : { ...current, [field]: undefined },
    )
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const found = validatePosterUpload(values, file)
    setErrors(found)

    if (Object.keys(found).length > 0 || file === null) {
      event.currentTarget.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return
    }

    const request = buildCreatePosterRequest(values)
    const saved = await onSubmit({
      file,
      ...(request.title === undefined ? {} : { title: request.title }),
      ...(request.displayOrder === undefined
        ? {}
        : { displayOrder: request.displayOrder }),
    })

    if (saved !== undefined) onClose()
  }

  return (
    <Modal
      title="Upload poster"
      onClose={onClose}
      footer={
        <>
          <Action variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Action>
          <Action
            type="submit"
            form="poster-upload-form"
            size="sm"
            disabled={isSaving}
          >
            {isSaving ? 'Uploading' : 'Upload poster'}
          </Action>
        </>
      }
    >
      <form
        id="poster-upload-form"
        onSubmit={(event) => void submit(event)}
        className="space-y-5"
      >
        {serverError !== undefined && (
          <FormError message={toUserMessage(serverError)} />
        )}

        <FileField
          id="poster-file"
          label="Poster image"
          error={errors.file}
          onSelect={(selected) => {
            setFile(selected)
            setErrors((current) =>
              current.file === undefined ? current : { ...current, file: undefined },
            )
          }}
        />

        <TextField
          name="poster-title"
          label="Title"
          maxLength={POSTER_LIMITS.title}
          value={values.title}
          onChange={(event) => setField('title', event.target.value)}
          hint="Optional. Shown over the image on the homepage carousel."
          error={errors.title}
          autoComplete="off"
        />

        <TextField
          name="poster-display-order"
          label="Display order"
          inputMode="numeric"
          value={values.displayOrder}
          onChange={(event) => setField('displayOrder', event.target.value)}
          hint="Lower numbers appear first. Ties keep creation order."
          error={errors.displayOrder}
        />

        <p className="text-[12.5px] leading-relaxed text-graphite">
          New posters are active immediately. Pause one from the poster list when
          it should not appear on the storefront.
        </p>
      </form>
    </Modal>
  )
}

export function PosterEditModal({
  poster,
  isSaving,
  serverError,
  onClose,
  onSubmit,
}: {
  poster: Poster
  isSaving: boolean
  serverError: unknown
  onClose: () => void
  onSubmit: (values: PosterFormValues) => Promise<Poster | undefined>
}) {
  const [values, setValues] = useState<PosterFormValues>(() =>
    posterToFormValues(poster),
  )
  const [errors, setErrors] = useState<PosterFormErrors>({})

  const dirty = hasPosterChanges(values, poster)

  const setField = <K extends keyof PosterFormValues>(
    field: K,
    value: PosterFormValues[K],
  ) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) =>
      current[field] === undefined ? current : { ...current, [field]: undefined },
    )
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const found = validatePosterMetadata(values)
    setErrors(found)

    if (Object.keys(found).length > 0) {
      event.currentTarget.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return
    }

    if (!dirty) return

    const saved = await onSubmit(values)
    if (saved !== undefined) onClose()
  }

  return (
    <Modal
      title="Edit poster"
      onClose={onClose}
      footer={
        <>
          <Action variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Action>
          <Action
            type="submit"
            form="poster-edit-form"
            size="sm"
            disabled={isSaving || !dirty}
          >
            {isSaving ? 'Saving' : 'Save changes'}
          </Action>
        </>
      }
    >
      <form
        id="poster-edit-form"
        onSubmit={(event) => void submit(event)}
        className="space-y-5"
      >
        {serverError !== undefined && (
          <FormError message={toUserMessage(serverError)} />
        )}

        <div className="aspect-[16/9] overflow-hidden bg-[#f4f4f4]">
          <img
            src={poster.imageUrl}
            alt={poster.title ?? 'Poster image'}
            loading="lazy"
            className="h-full w-full object-cover object-center"
          />
        </div>

        <TextField
          name="poster-title"
          label="Title"
          maxLength={POSTER_LIMITS.title}
          value={values.title}
          onChange={(event) => setField('title', event.target.value)}
          hint="Optional. Leave blank for an image-only poster."
          error={errors.title}
          autoComplete="off"
        />

        <TextField
          name="poster-display-order"
          label="Display order"
          inputMode="numeric"
          value={values.displayOrder}
          onChange={(event) => setField('displayOrder', event.target.value)}
          hint="Lower numbers appear first. Ties keep creation order."
          error={errors.displayOrder}
        />
      </form>
    </Modal>
  )
}

export function PosterReplaceImageModal({
  poster,
  isSaving,
  serverError,
  onClose,
  onSubmit,
}: {
  poster: Poster
  isSaving: boolean
  serverError: unknown
  onClose: () => void
  onSubmit: (file: File) => Promise<Poster | undefined>
}) {
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | undefined>(undefined)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const found = validatePosterFile(file)
    setFileError(found)

    if (found !== undefined || file === null) {
      event.currentTarget.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return
    }

    const saved = await onSubmit(file)
    if (saved !== undefined) onClose()
  }

  return (
    <Modal
      title="Replace poster image"
      onClose={onClose}
      footer={
        <>
          <Action variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Action>
          <Action
            type="submit"
            form="poster-replace-form"
            size="sm"
            disabled={isSaving}
          >
            {isSaving ? 'Replacing' : 'Replace image'}
          </Action>
        </>
      }
    >
      <form
        id="poster-replace-form"
        onSubmit={(event) => void submit(event)}
        className="space-y-5"
      >
        {serverError !== undefined && (
          <FormError message={toUserMessage(serverError)} />
        )}

        <div className="aspect-[16/9] overflow-hidden bg-[#f4f4f4]">
          <img
            src={poster.imageUrl}
            alt={poster.title ?? 'Current poster image'}
            loading="lazy"
            className="h-full w-full object-cover object-center"
          />
        </div>

        <FileField
          id="replacement-poster-file"
          label="New poster image"
          error={fileError}
          onSelect={(selected) => {
            setFile(selected)
            setFileError(undefined)
          }}
        />

        <p className="text-[12.5px] leading-relaxed text-graphite">
          The new image replaces the current one in place. Title, display order
          and visibility stay unchanged.
        </p>
      </form>
    </Modal>
  )
}

export function DeletePosterModal({
  poster,
  isDeleting,
  error,
  onClose,
  onConfirm,
}: {
  poster: Poster
  isDeleting: boolean
  error: unknown
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  return (
    <Modal
      title="Delete this poster?"
      onClose={onClose}
      footer={
        <>
          <Action variant="ghost" size="sm" onClick={onClose} disabled={isDeleting}>
            Keep it
          </Action>
          <Action
            variant="warning"
            size="sm"
            onClick={() => void onConfirm()}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting' : 'Delete poster'}
          </Action>
        </>
      }
    >
      <div className="space-y-4">
        {error !== undefined && <FormError message={toUserMessage(error)} />}
        <p className="text-sm leading-relaxed text-graphite">
          <span className="font-medium text-ink">
            {poster.title === null || poster.title.trim() === ''
              ? 'This poster'
              : poster.title}
          </span>{' '}
          will be removed from the storefront and its Cloudinary image will be
          deleted. This cannot be undone.
        </p>
      </div>
    </Modal>
  )
}
