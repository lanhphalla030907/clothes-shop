import { useState } from 'react'
import type { FormEvent } from 'react'
import { Action } from '@/components/ui/Action'
import { FormError, TextField } from '@/components/account/Field'
import { Modal } from '@/components/account/Modal'
import {
  OPTION_LIMITS,
  VARIANT_LIMITS,
  variantToFormValues,
  validateOption,
  validateVariant,
  type OptionErrors,
  type VariantErrors,
} from '@/features/adminProducts/catalogueRules'
import { toUserMessage } from '@/lib/api/errors'
import type {
  ProductVariant,
  VariantFormValues,
  VariantOptionRecord,
} from '@/types/api'

export function VariantFormModal({
  variant,
  isSaving,
  serverError,
  onClose,
  onSubmit,
}: {
  variant: ProductVariant | undefined
  isSaving: boolean
  serverError: unknown
  onClose: () => void
  onSubmit: (values: VariantFormValues) => Promise<ProductVariant | undefined>
}) {
  const [values, setValues] = useState<VariantFormValues>(() =>
    variant === undefined ? { sku: '', price: '', isActive: true } : variantToFormValues(variant),
  )
  const [errors, setErrors] = useState<VariantErrors>({})

  const dirty =
    variant === undefined ||
    values.sku !== variant.sku ||
    values.price !== variant.price ||
    values.isActive !== variant.isActive

  const set = <K extends keyof VariantFormValues>(field: K, value: VariantFormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) =>
      current[field] === undefined ? current : { ...current, [field]: undefined },
    )
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const found = validateVariant(values)
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
      title={variant === undefined ? 'New variant' : 'Edit variant'}
      onClose={onClose}
      footer={
        <>
          <Action variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Action>
          <Action
            type="submit"
            form="variant-form"
            size="sm"
            disabled={isSaving || !dirty}
          >
            {isSaving ? 'Saving' : variant === undefined ? 'Create variant' : 'Save changes'}
          </Action>
        </>
      }
    >
      <form id="variant-form" onSubmit={(event) => void submit(event)} className="space-y-5">
        {serverError !== undefined && <FormError message={toUserMessage(serverError)} />}

        <TextField
          name="variant-sku"
          label="SKU"
          required
          maxLength={VARIANT_LIMITS.sku}
          value={values.sku}
          onChange={(event) => set('sku', event.target.value)}
          hint="Uppercase letters and numbers, with single dots, underscores or hyphens between segments."
          error={errors.sku}
          autoComplete="off"
        />

        <TextField
          name="variant-price"
          label="Price"
          required
          inputMode="decimal"
          value={values.price}
          onChange={(event) => set('price', event.target.value)}
          hint="A positive amount with at most two decimal places."
          error={errors.price}
          autoComplete="off"
        />

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
              Whether this variant can be sold. The parent product must also be active.
            </span>
          </span>
        </label>
      </form>
    </Modal>
  )
}

export function DeleteVariantModal({
  variant,
  isDeleting,
  error,
  onClose,
  onConfirm,
}: {
  variant: ProductVariant
  isDeleting: boolean
  error: unknown
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  return (
    <Modal
      title="Delete this variant?"
      onClose={onClose}
      footer={
        <>
          <Action variant="ghost" size="sm" onClick={onClose} disabled={isDeleting}>
            Keep it
          </Action>
          <Action size="sm" onClick={() => void onConfirm()} disabled={isDeleting}>
            {isDeleting ? 'Deleting' : 'Delete variant'}
          </Action>
        </>
      }
    >
      <div className="space-y-4">
        {error !== undefined && <FormError message={toUserMessage(error)} />}
        <p className="text-sm leading-relaxed text-graphite">
          <span className="font-mono text-ink">{variant.sku}</span> and its options and stock row
          will be removed. If a cart, wishlist or order still references it, the server refuses the
          delete rather than breaking that record; the reason is shown here.
        </p>
      </div>
    </Modal>
  )
}

export function OptionFormModal({
  option,
  isSaving,
  serverError,
  onClose,
  onSubmit,
}: {
  option: VariantOptionRecord | undefined
  isSaving: boolean
  serverError: unknown
  onClose: () => void
  onSubmit: (values: { optionName: string; optionValue: string }) => Promise<
    VariantOptionRecord | undefined
  >
}) {
  const [optionName, setOptionName] = useState(option?.optionName ?? '')
  const [optionValue, setOptionValue] = useState(option?.optionValue ?? '')
  const [errors, setErrors] = useState<OptionErrors>({})

  const dirty =
    option === undefined ||
    optionName.trim().replace(/\s+/g, ' ') !== option.optionName ||
    optionValue.trim().replace(/\s+/g, ' ') !== option.optionValue

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const found = validateOption(optionName, optionValue)
    setErrors(found)

    if (Object.keys(found).length > 0) {
      event.currentTarget.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return
    }

    const saved = await onSubmit({ optionName, optionValue })
    if (saved !== undefined) onClose()
  }

  return (
    <Modal
      title={option === undefined ? 'New option' : 'Edit option'}
      onClose={onClose}
      footer={
        <>
          <Action variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Action>
          <Action
            type="submit"
            form="option-form"
            size="sm"
            disabled={isSaving || !dirty}
          >
            {isSaving ? 'Saving' : option === undefined ? 'Create option' : 'Save changes'}
          </Action>
        </>
      }
    >
      <form id="option-form" onSubmit={(event) => void submit(event)} className="space-y-5">
        {serverError !== undefined && <FormError message={toUserMessage(serverError)} />}

        <TextField
          name="option-name"
          label="Option name"
          required
          maxLength={OPTION_LIMITS.name}
          value={optionName}
          onChange={(event) => {
            setOptionName(event.target.value)
            setErrors((current) =>
              current.optionName === undefined ? current : { ...current, optionName: undefined },
            )
          }}
          hint="For example Size or Colour. Unique within the variant."
          error={errors.optionName}
          autoComplete="off"
        />

        <TextField
          name="option-value"
          label="Option value"
          required
          maxLength={OPTION_LIMITS.value}
          value={optionValue}
          onChange={(event) => {
            setOptionValue(event.target.value)
            setErrors((current) =>
              current.optionValue === undefined ? current : { ...current, optionValue: undefined },
            )
          }}
          hint="For example Medium or Black."
          error={errors.optionValue}
          autoComplete="off"
        />
      </form>
    </Modal>
  )
}

export function DeleteOptionModal({
  option,
  isDeleting,
  error,
  onClose,
  onConfirm,
}: {
  option: VariantOptionRecord
  isDeleting: boolean
  error: unknown
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  return (
    <Modal
      title="Delete this option?"
      onClose={onClose}
      footer={
        <>
          <Action variant="ghost" size="sm" onClick={onClose} disabled={isDeleting}>
            Keep it
          </Action>
          <Action size="sm" onClick={() => void onConfirm()} disabled={isDeleting}>
            {isDeleting ? 'Deleting' : 'Delete option'}
          </Action>
        </>
      }
    >
      <div className="space-y-4">
        {error !== undefined && <FormError message={toUserMessage(error)} />}
        <p className="text-sm leading-relaxed text-graphite">
          <span className="text-ink">{option.optionName}</span>: {option.optionValue} will be
          removed from this variant. The variant and its stock row are not affected.
        </p>
      </div>
    </Modal>
  )
}
