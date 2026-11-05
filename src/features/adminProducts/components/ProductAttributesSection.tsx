import { useState } from 'react'
import type { FormEvent } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { EmptyState, ErrorState } from '@/components/account/States'
import { FormError, TextField } from '@/components/account/Field'
import { Modal } from '@/components/account/Modal'
import { Panel, PanelHeader } from '@/components/account/PageHeader'
import { Skeleton } from '@/components/account/Skeleton'
import {
  buildCreateProductAttributeRequest,
  buildUpdateProductAttributeRequest,
  PRODUCT_ATTRIBUTE_LIMITS,
  validateProductAttribute,
  type ProductAttributeFormValues,
  type ProductAttributeErrors,
} from '@/features/productAttributes/rules'
import {
  createProductAttribute,
  deleteProductAttribute,
  fetchProductAttributes,
  updateProductAttribute,
} from '@/features/productAttributes/api'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { useMutation } from '@/hooks/useMutation'
import { useFeedback } from '@/context/feedbackContext'
import { isApiError, toUserMessage } from '@/lib/api/errors'
import type { Product, ProductAttribute } from '@/types/api'

type AttributePanel =
  | { kind: 'create' }
  | { kind: 'edit'; attribute: ProductAttribute }
  | null

const duplicateAttributeMessage = (error: unknown): string =>
  isApiError(error) && error.kind === 'conflict'
    ? 'An attribute with this name already exists for this product.'
    : toUserMessage(error)

export function ProductAttributesSection({ product }: { product: Product }) {
  const attributes = useAsyncResource<ProductAttribute[]>(
    (signal) => fetchProductAttributes(product.id, signal),
    [product.id],
  )
  const { showFeedback, confirmFeedback } = useFeedback()
  const [panel, setPanel] = useState<AttributePanel>(null)

  const refresh = () => attributes.refetch()
  const createMutation = useMutation(
    (values: ProductAttributeFormValues) =>
      createProductAttribute(product.id, buildCreateProductAttributeRequest(values)),
    {
      onSuccess: () => {
      refresh()
      setPanel(null)
      showFeedback({
        type: 'success',
        title: 'Attribute added',
        message: 'The product attribute was added successfully.',
      })
      },
    },
  )
  const updateMutation = useMutation(
    (input: { attribute: ProductAttribute; values: ProductAttributeFormValues }) =>
      updateProductAttribute(
        product.id,
        input.attribute.id,
        buildUpdateProductAttributeRequest(input.values, input.attribute),
      ),
    {
      onSuccess: () => {
        refresh()
        setPanel(null)
        showFeedback({
          type: 'success',
          title: 'Attribute updated',
          message: 'Your product attribute changes were saved.',
        })
      },
    },
  )
  const deleteMutation = useMutation(
    (attribute: ProductAttribute) =>
      deleteProductAttribute(product.id, attribute.id).then(() => true),
    {
      onSuccess: () => {
        refresh()
        setPanel(null)
        showFeedback({
          type: 'success',
          title: 'Attribute deleted',
          message: 'The product attribute was deleted.',
        })
      },
      onError: (error) =>
        showFeedback({
          type: 'error',
          title: 'Could not delete attribute',
          message: toUserMessage(error),
        }),
    },
  )

  const openPanel = (next: AttributePanel) => {
    createMutation.reset()
    updateMutation.reset()
    deleteMutation.reset()
    setPanel(next)
  }

  const requestDelete = async (attribute: ProductAttribute) => {
    const confirmed = await confirmFeedback({
      type: 'warning',
      title: 'Delete this attribute?',
      message: `Delete ${attribute.attributeName} and its value, ${attribute.attributeValue}? This cannot be undone.`,
      confirmLabel: 'Delete attribute',
    })
    if (!confirmed) return

    await deleteMutation.run(attribute)
  }

  const list = attributes.data ?? []

  return (
    <Panel>
      <PanelHeader
        title="Product Attributes"
        hint="Descriptive product details shown to shoppers, such as material or country of origin."
        action={
          <Action size="sm" onClick={() => openPanel({ kind: 'create' })}>
            <Plus size={14} strokeWidth={1.8} aria-hidden />
            Add attribute
          </Action>
        }
      />

      {attributes.isLoading && (
        <div className="space-y-3 p-5" role="status" aria-busy="true">
          <span className="sr-only">Loading product attributes</span>
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      )}

      {!attributes.isLoading && attributes.error !== undefined && (
        <div className="p-5">
          <ErrorState message={toUserMessage(attributes.error)} onRetry={attributes.refetch} />
        </div>
      )}

      {!attributes.isLoading && attributes.error === undefined && list.length === 0 && (
        <div className="p-5">
          <EmptyState
            align="left"
            eyebrow="No attributes"
            title="This product has no descriptive attributes"
            description="Add details such as material, brand or country of origin."
            action={
              <Action size="sm" onClick={() => openPanel({ kind: 'create' })}>
                Add the first attribute
              </Action>
            }
          />
        </div>
      )}

      {!attributes.isLoading && attributes.error === undefined && list.length > 0 && (
        <ul className="divide-y divide-line">
          {list.map((attribute) => (
            <li
              key={attribute.id}
              className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
            >
              <dl className="grid min-w-0 flex-1 gap-1 sm:grid-cols-2 sm:gap-6">
                <div>
                  <dt className="text-[11px] font-medium tracking-[0.08em] text-graphite uppercase">
                    Attribute Name
                  </dt>
                  <dd className="mt-1 break-words text-[13px] font-medium text-ink">
                    {attribute.attributeName}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium tracking-[0.08em] text-graphite uppercase">
                    Attribute Value
                  </dt>
                  <dd className="mt-1 break-words text-[13px] text-graphite">
                    {attribute.attributeValue}
                  </dd>
                </div>
              </dl>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => openPanel({ kind: 'edit', attribute })}
                  aria-label={`Edit ${attribute.attributeName}`}
                  className="inline-flex size-9 items-center justify-center text-graphite transition-colors hover:bg-bone hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <Pencil size={15} strokeWidth={1.7} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => void requestDelete(attribute)}
                  aria-label={`Delete ${attribute.attributeName}`}
                  className="inline-flex size-9 items-center justify-center text-graphite transition-colors hover:bg-signal-soft hover:text-signal focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <Trash2 size={15} strokeWidth={1.7} aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {panel?.kind === 'create' && (
        <ProductAttributeFormModal
          attributes={list}
          isSaving={createMutation.isPending}
          serverError={createMutation.error}
          onClose={() => setPanel(null)}
          onSubmit={(values) => createMutation.run(values)}
        />
      )}
      {panel?.kind === 'edit' && (
        <ProductAttributeFormModal
          key={panel.attribute.id}
          attribute={panel.attribute}
          attributes={list}
          isSaving={updateMutation.isPending}
          serverError={updateMutation.error}
          onClose={() => setPanel(null)}
          onSubmit={(values) => updateMutation.run({ attribute: panel.attribute, values })}
        />
      )}
    </Panel>
  )
}

function ProductAttributeFormModal({
  attribute,
  attributes,
  isSaving,
  serverError,
  onClose,
  onSubmit,
}: {
  attribute?: ProductAttribute
  attributes: readonly ProductAttribute[]
  isSaving: boolean
  serverError: unknown
  onClose: () => void
  onSubmit: (values: ProductAttributeFormValues) => Promise<ProductAttribute | undefined>
}) {
  const [values, setValues] = useState<ProductAttributeFormValues>(() => ({
    attributeName: attribute?.attributeName ?? '',
    attributeValue: attribute?.attributeValue ?? '',
  }))
  const [errors, setErrors] = useState<ProductAttributeErrors>({})
  const isEditing = attribute !== undefined
  const dirty =
    !isEditing ||
    values.attributeName.trim().replace(/\s+/g, ' ') !== attribute.attributeName ||
    values.attributeValue.trim().replace(/\s+/g, ' ') !== attribute.attributeValue

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const found = validateProductAttribute(values, attributes, attribute?.id)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      event.currentTarget.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return
    }

    await onSubmit(values)
  }

  return (
    <Modal
      title={isEditing ? 'Edit product attribute' : 'New product attribute'}
      onClose={onClose}
      footer={
        <>
          <Action variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Action>
          <Action
            type="submit"
            form="product-attribute-form"
            size="sm"
            disabled={isSaving || !dirty}
          >
            {isSaving ? 'Saving' : isEditing ? 'Save changes' : 'Create attribute'}
          </Action>
        </>
      }
    >
      <form
        id="product-attribute-form"
        onSubmit={(event) => void submit(event)}
        className="space-y-5"
      >
        {serverError !== undefined && (
          <FormError message={duplicateAttributeMessage(serverError)} />
        )}
        <TextField
          name="product-attribute-name"
          label="Attribute Name"
          required
          maxLength={PRODUCT_ATTRIBUTE_LIMITS.attributeName}
          value={values.attributeName}
          onChange={(event) => {
            setValues((current) => ({ ...current, attributeName: event.target.value }))
            setErrors((current) => ({ ...current, attributeName: undefined }))
          }}
          error={errors.attributeName}
          autoComplete="off"
        />
        <TextField
          name="product-attribute-value"
          label="Attribute Value"
          required
          maxLength={PRODUCT_ATTRIBUTE_LIMITS.attributeValue}
          value={values.attributeValue}
          onChange={(event) => {
            setValues((current) => ({ ...current, attributeValue: event.target.value }))
            setErrors((current) => ({ ...current, attributeValue: undefined }))
          }}
          error={errors.attributeValue}
          autoComplete="off"
        />
      </form>
    </Modal>
  )
}
