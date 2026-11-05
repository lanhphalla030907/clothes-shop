import { useState } from 'react'
import type { FormEvent } from 'react'
import { Action } from '@/components/ui/Action'
import { FormError, TextField } from '@/components/account/Field'
import { Modal } from '@/components/account/Modal'
import {
  ALLOWED_IMAGE_TYPES,
  IMAGE_LIMITS,
  hasImageMetadataChanges,
  imageToFormValues,
  validateImageMetadata,
  validateImageUpload,
  type ImageMetadataErrors,
  type ImageUploadErrors,
} from '@/features/adminProducts/catalogueRules'
import { toUserMessage } from '@/lib/api/errors'
import {
  EMPTY_IMAGE_METADATA,
  type ImageMetadataFormValues,
  type ImageUploadFormValues,
  type ProductImage,
} from '@/types/api'

const PrimaryCheckbox = ({
  checked,
  disabled,
  onChange,
  hint,
}: {
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
  hint: string
}) => (
  <label
    className={`flex min-h-12 items-start gap-3 border border-line bg-paper-pure px-4 py-3.5 ${
      disabled === true ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
    }`}
  >
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(event) => onChange(event.target.checked)}
      className="mt-0.5 size-4 accent-ink disabled:cursor-not-allowed"
    />
    <span>
      <span className="block text-[13px] font-medium text-ink">Primary image</span>
      <span className="mt-1 block text-[13px] leading-relaxed text-graphite">{hint}</span>
    </span>
  </label>
)

export function ImageUploadModal({
  defaultPrimary,
  isSaving,
  serverError,
  onClose,
  onSubmit,
}: {
  defaultPrimary: boolean
  isSaving: boolean
  serverError: unknown
  onClose: () => void
  onSubmit: (values: ImageUploadFormValues) => Promise<ProductImage | undefined>
}) {
  const [values, setValues] = useState<ImageUploadFormValues>({
    file: null,
    altText: '',
    sortOrder: '0',
    isPrimary: defaultPrimary,
  })
  const [errors, setErrors] = useState<ImageUploadErrors>({})

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const found = validateImageUpload(values.file, values.altText, values.sortOrder)
    setErrors(found)

    if (Object.keys(found).length > 0) {
      event.currentTarget.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return
    }

    const saved = await onSubmit(values)
    if (saved !== undefined) onClose()
  }

  return (
    <Modal
      title="Upload image"
      onClose={onClose}
      footer={
        <>
          <Action variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Action>
          <Action type="submit" form="image-upload-form" size="sm" disabled={isSaving}>
            {isSaving ? 'Uploading' : 'Upload image'}
          </Action>
        </>
      }
    >
      <form id="image-upload-form" onSubmit={(event) => void submit(event)} className="space-y-5">
        {serverError !== undefined && <FormError message={toUserMessage(serverError)} />}

        <div>
          <label
            htmlFor="image-file"
            className="block text-[13px] font-medium text-ink"
          >
            Image file <span className="text-signal">*</span>
          </label>
          <input
            id="image-file"
            name="image-file"
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(',')}
            onChange={(event) => {
              setValues((current) => ({ ...current, file: event.target.files?.[0] ?? null }))
              setErrors((current) =>
                current.file === undefined ? current : { ...current, file: undefined },
              )
            }}
            aria-invalid={errors.file !== undefined}
            aria-describedby={errors.file === undefined ? 'image-file-hint' : 'image-file-error'}
            className="mt-2 block w-full border border-line bg-paper-pure px-3 py-2.5 text-[13px] text-ink file:mr-3 file:border-0 file:bg-bone file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-ink"
          />
          {errors.file !== undefined ? (
            <p id="image-file-error" className="mt-1.5 text-[12.5px] text-signal">
              {errors.file}
            </p>
          ) : (
            <p id="image-file-hint" className="mt-1.5 text-[12px] leading-relaxed text-graphite">
              JPEG, PNG, WebP, AVIF or GIF. Maximum 5 MB. The file is sent to Cloudinary and stored
              under the product upload folder.
            </p>
          )}
        </div>

        <TextField
          name="image-alt-text"
          label="Alt text"
          maxLength={IMAGE_LIMITS.altText}
          value={values.altText}
          onChange={(event) =>
            setValues((current) => ({ ...current, altText: event.target.value }))
          }
          hint="Describe the image for shoppers using a screen reader."
          error={errors.altText}
        />

        <TextField
          name="image-sort-order"
          label="Sort order"
          inputMode="numeric"
          value={values.sortOrder}
          onChange={(event) =>
            setValues((current) => ({ ...current, sortOrder: event.target.value }))
          }
          hint="Zero is first. Ties are allowed."
          error={errors.sortOrder}
        />

        <PrimaryCheckbox
          checked={values.isPrimary}
          onChange={(checked) => setValues((current) => ({ ...current, isPrimary: checked }))}
          hint="Promoting this image demotes the current primary in the same transaction."
        />
      </form>
    </Modal>
  )
}

export function ImageMetadataModal({
  image,
  defaultPrimary,
  isSaving,
  serverError,
  onClose,
  onSubmit,
}: {
  /** Omit when adding an image by URL. */
  image: ProductImage | undefined
  defaultPrimary: boolean
  isSaving: boolean
  serverError: unknown
  onClose: () => void
  onSubmit: (values: ImageMetadataFormValues) => Promise<ProductImage | undefined>
}) {
  const [values, setValues] = useState<ImageMetadataFormValues>(() => {
    if (image !== undefined) return imageToFormValues(image)
    return { ...EMPTY_IMAGE_METADATA, isPrimary: defaultPrimary }
  })
  const [errors, setErrors] = useState<ImageMetadataErrors>({})

  const primaryLocked = image?.isPrimary === true
  const dirty = image === undefined || hasImageMetadataChanges(values, image)

  const set = <K extends keyof ImageMetadataFormValues>(
    field: K,
    value: ImageMetadataFormValues[K],
  ) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) =>
      current[field] === undefined ? current : { ...current, [field]: undefined },
    )
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const found = validateImageMetadata(values)
    setErrors(found)

    if (Object.keys(found).length > 0) {
      event.currentTarget.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return
    }

    const saved = await onSubmit(values)
    if (saved !== undefined) onClose()
  }

  return (
    <Modal
      title={image === undefined ? 'Add image by URL' : 'Edit image'}
      onClose={onClose}
      footer={
        <>
          <Action variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Action>
          <Action
            type="submit"
            form="image-metadata-form"
            size="sm"
            disabled={isSaving || !dirty}
          >
            {isSaving ? 'Saving' : image === undefined ? 'Add image' : 'Save changes'}
          </Action>
        </>
      }
    >
      <form
        id="image-metadata-form"
        onSubmit={(event) => void submit(event)}
        className="space-y-5"
      >
        {serverError !== undefined && <FormError message={toUserMessage(serverError)} />}

        <TextField
          name="image-url"
          label="Image URL"
          required
          maxLength={IMAGE_LIMITS.url}
          value={values.imageUrl}
          onChange={(event) => set('imageUrl', event.target.value)}
          hint="A complete http:// or https:// URL."
          error={errors.imageUrl}
          autoComplete="off"
        />

        <TextField
          name="image-public-id"
          label="Public id"
          required
          maxLength={IMAGE_LIMITS.publicId}
          value={values.publicId}
          onChange={(event) => set('publicId', event.target.value)}
          hint="The storage identifier for this asset."
          error={errors.publicId}
          autoComplete="off"
        />

        <TextField
          name="image-alt-text"
          label="Alt text"
          maxLength={IMAGE_LIMITS.altText}
          value={values.altText}
          onChange={(event) => set('altText', event.target.value)}
          hint="Optional. Describe the image for shoppers using a screen reader."
          error={errors.altText}
        />

        <TextField
          name="image-sort-order"
          label="Sort order"
          inputMode="numeric"
          value={values.sortOrder}
          onChange={(event) => set('sortOrder', event.target.value)}
          hint="Zero is first. Ties are allowed."
          error={errors.sortOrder}
        />

        <PrimaryCheckbox
          checked={values.isPrimary}
          disabled={primaryLocked}
          onChange={(checked) => set('isPrimary', checked)}
          hint={
            primaryLocked
              ? 'This is the primary image. Promote another image first before clearing it.'
              : 'Promoting this image demotes the current primary in the same transaction.'
          }
        />
      </form>
    </Modal>
  )
}

export function DeleteImageModal({
  image,
  isDeleting,
  error,
  onClose,
  onConfirm,
}: {
  image: ProductImage
  isDeleting: boolean
  error: unknown
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  return (
    <Modal
      title="Delete this image?"
      onClose={onClose}
      footer={
        <>
          <Action variant="ghost" size="sm" onClick={onClose} disabled={isDeleting}>
            Keep it
          </Action>
          <Action size="sm" onClick={() => void onConfirm()} disabled={isDeleting}>
            {isDeleting ? 'Deleting' : 'Delete image'}
          </Action>
        </>
      }
    >
      <div className="space-y-4">
        {error !== undefined && <FormError message={toUserMessage(error)} />}
        <p className="text-sm leading-relaxed text-graphite">
          The image record will be removed. A primary image cannot be deleted until another image is
          promoted in its place; that refusal is shown here verbatim.
        </p>
        <p className="break-all font-mono text-[12px] text-graphite">{image.publicId}</p>
      </div>
    </Modal>
  )
}
