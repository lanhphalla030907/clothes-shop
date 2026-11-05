import { useState } from 'react'
import type { FormEvent } from 'react'
import { Action } from '@/components/ui/Action'
import { FormError, SelectField, TextAreaField, TextField } from '@/components/account/Field'
import { Modal } from '@/components/account/Modal'
import {
  CATEGORY_LIMITS,
  categoryAndDescendantIds,
  categoryToFormValues,
  hasCategoryChanges,
  validateCategory,
  type CategoryErrors,
} from '@/features/adminProducts/catalogueRules'
import {
  removeAdminCategoryImage,
  uploadAdminCategoryImage,
} from '@/features/adminProducts/api'
import { useMutation } from '@/hooks/useMutation'
import { toUserMessage } from '@/lib/api/errors'
import {
  EMPTY_CATEGORY_FORM,
  type Category,
  type CategoryFormValues,
  type UUID,
} from '@/types/api'

type CategoryFormModalProps = {
  /** The category being edited, or `undefined` when creating. */
  category: Category | undefined
  categories: readonly Category[]
  isSaving: boolean
  serverError: unknown
  onClose: () => void
  /** Returns the saved category, or `undefined` when the write was refused. */
  onSubmit: (values: CategoryFormValues) => Promise<Category | undefined>
  /** Called after an image upload or removal succeeds, so the parent can refresh its list. */
  onImageSuccess?: () => void
}

export function CategoryFormModal({
  category,
  categories,
  isSaving,
  serverError,
  onClose,
  onSubmit,
  onImageSuccess,
}: CategoryFormModalProps) {
  const [values, setValues] = useState<CategoryFormValues>(() =>
    category === undefined ? EMPTY_CATEGORY_FORM : categoryToFormValues(category),
  )
  const [errors, setErrors] = useState<CategoryErrors>({})

  /** Local image state — starts from the category being edited. */
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageAltText, setImageAltText] = useState(category?.altText ?? '')
  const [imageErrors, setImageErrors] = useState<Record<string, string>>({})

  const dirty = category === undefined ? true : hasCategoryChanges(values, category)
  // A selected file or an edited alt text is an unsaved image change even when
  // the category fields themselves are untouched.
  const imageDirty =
    imageFile !== null || imageAltText !== (category?.altText ?? '')
  const hasChanges = dirty || imageDirty
  const forbiddenParents =
    category === undefined
      ? new Set<string>()
      : categoryAndDescendantIds(category.id, categories)
  const parentOptions = categories.filter(
    (option) =>
      (option.isActive || option.id === category?.parentId) &&
      !forbiddenParents.has(option.id),
  )

  const set = <K extends keyof CategoryFormValues>(
    field: K,
    value: CategoryFormValues[K],
  ) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) =>
      current[field] === undefined ? current : { ...current, [field]: undefined },
    )
  }

  const uploadImageMutation = useMutation(
    (input: { id: UUID; file: File; altText: string }) =>
      uploadAdminCategoryImage(input.id, { file: input.file, altText: input.altText }),
    {
      onSuccess: () => {
        setImageFile(null)
        setImageAltText('')
        setImageErrors({})
        onImageSuccess?.()
      },
      onError: (error) => {
        setImageErrors({ upload: toUserMessage(error) })
      },
    },
  )

  const removeImageMutation = useMutation(
    (id: UUID) => removeAdminCategoryImage(id),
    {
      onSuccess: () => {
        setImageAltText('')
        setImageErrors({})
        onImageSuccess?.()
      },
      onError: (error) => {
        setImageErrors({ remove: toUserMessage(error) })
      },
    },
  )

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const found = validateCategory(values, categories, category?.id)
    setErrors(found)

    if (Object.keys(found).length > 0) {
      event.currentTarget.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return
    }

    const saved = await onSubmit(values)
    if (saved === undefined) return

    // If an image was selected, upload it using the saved category's ID.
    // The upload runs after the category exists so the endpoint can find it.
    if (imageFile !== null) {
      const result = await uploadImageMutation.run({
        id: saved.id,
        file: imageFile,
        altText: imageAltText,
      })
      // If the upload failed, keep the modal open so the user can retry.
      // The category was already saved; retrying the upload must not
      // re-create or re-update the category.
      if (result === undefined) return
    }

    onClose()
  }

  const handleImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setImageFile(file)
    setImageErrors((current) => {
      if (current.file === undefined) return current
      const next = { ...current }
      delete next.file
      return next
    })
  }

  const hasImage = category?.imageUrl !== null && category?.imageUrl !== undefined
  const imagePending =
    uploadImageMutation.isPending || removeImageMutation.isPending

  return (
    <Modal
      title={category === undefined ? 'New category' : 'Edit category'}
      onClose={onClose}
      footer={
        <>
          <Action variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Action>
          <Action
            type="submit"
            form="category-form"
            size="sm"
            disabled={isSaving || imagePending || !hasChanges}
          >
            {isSaving ? 'Saving' : category === undefined ? 'Create category' : 'Save changes'}
          </Action>
        </>
      }
    >
      <form id="category-form" onSubmit={(event) => void submit(event)} className="space-y-5">
        {serverError !== undefined && <FormError message={toUserMessage(serverError)} />}

        <div
          className={`border border-line bg-paper-pure p-4 ${
            imagePending ? 'opacity-60' : ''
          }`}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="text-[13px] font-medium text-ink">Image</h3>
            {category !== undefined && hasImage && (
              <button
                type="button"
                onClick={() => {
                  removeImageMutation.reset()
                  void removeImageMutation.run(category.id)
                }}
                disabled={imagePending}
                className="inline-flex min-h-9 items-center gap-1.5 text-[12px] font-medium text-signal transition-colors hover:text-signal/80 disabled:opacity-40"
              >
                <span className="text-[11px]">Remove image</span>
              </button>
            )}
          </div>

          {category !== undefined && hasImage && category.imageUrl !== null && (
            <div className="relative aspect-[4/5] overflow-hidden bg-bone mb-3">
              <img
                src={category.imageUrl}
                alt={category.altText ?? category.name}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="category-image-file"
              className="block text-[13px] font-medium text-ink"
            >
              Image file
            </label>
            <input
              id="category-image-file"
              name="category-image-file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
              onChange={handleImageFileChange}
              aria-invalid={imageErrors.file !== undefined}
              className="mt-2 block w-full border border-line bg-paper-pure px-3 py-2.5 text-[13px] text-ink file:mr-3 file:border-0 file:bg-bone file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-ink"
            />
            {imageErrors.file !== undefined && (
              <p id="category-image-file-error" className="mt-1.5 text-[12.5px] text-signal">
                {imageErrors.file}
              </p>
            )}
            {imageErrors.upload !== undefined && (
              <p id="category-image-upload-error" className="mt-1.5 text-[12.5px] text-signal">
                {imageErrors.upload}
              </p>
            )}
            {imagePending && (
              <p className="mt-1.5 text-[12px] leading-relaxed text-graphite">
                {uploadImageMutation.isPending ? 'Uploading image…' : 'Removing image…'}
              </p>
            )}
            {imageFile === null && !hasImage && (
              <p className="mt-1.5 text-[12px] leading-relaxed text-ash">
                Choose an image file above, then upload.
              </p>
            )}
            {imageFile !== null && !imagePending && (
              <p className="mt-1.5 text-[12px] leading-relaxed text-graphite">
                The image will be uploaded when you save the category.
              </p>
            )}
          </div>

          <TextField
            name="category-image-alt-text"
            label="Alt text"
            maxLength={CATEGORY_LIMITS.description}
            value={imageAltText}
            onChange={(event) => setImageAltText(event.target.value)}
            hint="Describe the image for shoppers using a screen reader."
            error={imageErrors.altText}
          />
        </div>

        <TextField
          name="category-name"
          label="Name"
          required
          maxLength={CATEGORY_LIMITS.name}
          value={values.name}
          onChange={(event) => set('name', event.target.value)}
          error={errors.name}
          autoComplete="off"
        />

        <TextField
          name="category-slug"
          label="Slug"
          required
          maxLength={CATEGORY_LIMITS.slug}
          value={values.slug}
          onChange={(event) => set('slug', event.target.value)}
          hint="Lowercase letters, numbers and hyphens."
          error={errors.slug}
          autoComplete="off"
        />

        <TextAreaField
          name="category-description"
          label="Description"
          maxLength={CATEGORY_LIMITS.description}
          value={values.description}
          onChange={(event) => set('description', event.target.value)}
          hint="Optional. Leave blank to store none."
          error={errors.description}
        />

        <SelectField
          name="category-parent"
          label="Parent category"
          value={values.parentId}
          onChange={(event) => set('parentId', event.target.value)}
          hint="Only active categories can be parents. Leave empty for a root category."
          error={errors.parentId}
        >
          <option value="">No parent (root category)</option>
          {parentOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
              {option.isActive ? '' : ' (inactive)'}
            </option>
          ))}
        </SelectField>

        <label className="flex min-h-12 cursor-pointer items-start gap-3 border border-line bg-paper-pure px-4 py-3.5">
          <input
            type="checkbox"
            checked={values.isActive}
            onChange={(event) => set('isActive', event.target.checked)}
            className="mt-0.5 size-4 cursor-pointer accent-ink"
          />
          <span>
            <span className="block text-[13px] font-medium text-ink">Active</span>
            <span className="mt-1 block text-[13px] leading-relaxed text-graphite">
              Whether this section is visible on the storefront. Inactive categories remain
              editable here.
            </span>
          </span>
        </label>
      </form>
    </Modal>
  )
}
