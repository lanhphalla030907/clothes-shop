import { useState } from 'react'
import type { FormEvent } from 'react'
import { Action } from '@/components/ui/Action'
import { FormError, SelectField, TextAreaField, TextField } from '@/components/account/Field'
import {
  hasProductChanges,
  PRODUCT_LIMITS,
  PRODUCT_STATUS_OPTIONS,
  validateProduct,
  type ProductErrors,
} from '@/features/adminProducts/rules'
import { toUserMessage } from '@/lib/api/errors'
import {
  EMPTY_PRODUCT_FORM,
  productToFormValues,
  type Category,
  type Product,
  type ProductFormValues,
} from '@/types/api'

/**
 * Create and edit share one form: the fields and the limits are identical, and
 * an update is validated exactly as strictly as a create, so a form that could
 * only create could write a value the API would refuse.
 *
 * The server is the authority on what is stored. A successful submit therefore
 * re-seeds the form from the response (which carries normalised name, slug and
 * price), so the screen agrees with the record instead of with its local draft.
 */

type ProductFormProps = {
  /** The record being edited, or `undefined` when creating. */
  product: Product | undefined
  categories: readonly Category[]
  isSaving: boolean
  serverError: unknown
  submitLabel: string
  /** Returns the saved product, or `undefined` when the write was refused. */
  onSubmit: (values: ProductFormValues) => Promise<Product | undefined>
  onSaved: (saved: Product) => void
}

export function ProductForm({
  product,
  categories,
  isSaving,
  serverError,
  submitLabel,
  onSubmit,
  onSaved,
}: ProductFormProps) {
  const [values, setValues] = useState<ProductFormValues>(() =>
    product === undefined ? EMPTY_PRODUCT_FORM : productToFormValues(product),
  )
  const [errors, setErrors] = useState<ProductErrors>({})

  // Derived rather than stored: the record is the baseline, so what counts as
  // "changed" follows the server's response, not this form's own history.
  const dirty = product === undefined ? true : hasProductChanges(values, product)

  const set = <K extends keyof ProductFormValues>(field: K, value: ProductFormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }))
    // Clear the message as soon as the field it belongs to is edited.
    setErrors((current) => (current[field] === undefined ? current : { ...current, [field]: undefined }))
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const found = validateProduct(values, categories)
    setErrors(found)

    if (Object.keys(found).length > 0) {
      // Move focus to the first thing that needs attention.
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return
    }

    const saved = await onSubmit(values)
    if (saved === undefined) return

    setValues(productToFormValues(saved))
    onSaved(saved)
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-5">
      {serverError !== undefined && <FormError message={toUserMessage(serverError)} />}

      <TextField
        name="name"
        label="Name"
        required
        maxLength={PRODUCT_LIMITS.name}
        value={values.name}
        onChange={(event) => set('name', event.target.value)}
        error={errors.name}
        autoComplete="off"
      />

      <TextField
        name="slug"
        label="Slug"
        required
        maxLength={PRODUCT_LIMITS.slug}
        value={values.slug}
        onChange={(event) => set('slug', event.target.value)}
        hint="Lowercase letters, numbers and hyphens."
        error={errors.slug}
        autoComplete="off"
      />

      <TextAreaField
        name="description"
        label="Description"
        maxLength={PRODUCT_LIMITS.description}
        value={values.description}
        onChange={(event) => set('description', event.target.value)}
        hint="Shown on the product page. Leave blank to store none."
        error={errors.description}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          name="basePrice"
          label="Base price"
          required
          type="text"
          inputMode="decimal"
          placeholder="49.00"
          maxLength={12}
          value={values.basePrice}
          onChange={(event) => set('basePrice', event.target.value)}
          hint="Two decimal places — the price a single variant builds from."
          error={errors.basePrice}
          autoComplete="off"
        />

        <SelectField
          name="categoryId"
          label="Category"
          required
          value={values.categoryId}
          onChange={(event) => set('categoryId', event.target.value)}
          error={errors.categoryId}
        >
          {values.categoryId === '' && (
            <option value="" disabled>
              Choose a category
            </option>
          )}
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          name="status"
          label="Status"
          value={values.status}
          onChange={(event) => set('status', event.target.value as ProductFormValues['status'])}
          hint="Lifecycle — DRAFT, ACTIVE or ARCHIVED. Separate from Active below."
        >
          {PRODUCT_STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </SelectField>

        <label className="flex cursor-pointer items-start gap-3 border border-line bg-paper-pure px-4 py-3.5">
          <input
            type="checkbox"
            checked={values.isActive}
            onChange={(event) => set('isActive', event.target.checked)}
            aria-describedby="field-isActive-hint"
            className="mt-0.5 size-4 cursor-pointer accent-ink"
          />
          <span>
            <span className="block text-sm font-medium text-ink">Active</span>
            <span id="field-isActive-hint" className="mt-1 block text-xs leading-relaxed text-graphite">
              Whether the record is enabled at all — independent of Status.
            </span>
          </span>
        </label>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Action type="submit" size="sm" disabled={isSaving || !dirty}>
          {isSaving ? 'Saving' : submitLabel}
        </Action>
        {isSaving && (
          <span className="label-micro text-ash" role="status">
            Working…
          </span>
        )}
      </div>
    </form>
  )
}