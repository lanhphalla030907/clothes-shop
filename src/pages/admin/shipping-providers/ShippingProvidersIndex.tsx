import { useState } from 'react'
import type { FormEvent } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { FormError, TextAreaField, TextField } from '@/components/account/Field'
import { Modal } from '@/components/account/Modal'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { EmptyState, ErrorState } from '@/components/account/States'
import { Skeleton } from '@/components/account/Skeleton'
import { useFeedback } from '@/context/feedbackContext'
import {
  createShippingProvider,
  fetchAdminShippingProviders,
  updateShippingProvider,
} from '@/features/shippingProviders/api'
import {
  buildCreateShippingProviderRequest,
  buildUpdateShippingProviderRequest,
  providerToFormValues,
  SHIPPING_PROVIDER_LIMITS,
  validateShippingProvider,
} from '@/features/shippingProviders/rules'
import type { ShippingProviderErrors } from '@/features/shippingProviders/rules'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { useMutation } from '@/hooks/useMutation'
import { toUserMessage } from '@/lib/api/errors'
import { formatMoney } from '@/lib/money'
import type {
  ShippingProvider,
  ShippingProviderFormValues,
  UpdateShippingProviderRequest,
  UUID,
} from '@/types/api'

type FormState = { provider: ShippingProvider | undefined }

const EMPTY_FORM: ShippingProviderFormValues = {
  code: '',
  name: '',
  description: '',
  baseFee: '0.00',
  supportsCod: false,
}

export default function ShippingProvidersIndex() {
  const { showFeedback, confirmFeedback } = useFeedback()
  const providers = useAsyncResource<ShippingProvider[]>(
    (signal) => fetchAdminShippingProviders(signal),
    [],
  )
  const [formState, setFormState] = useState<FormState | null>(null)

  const refresh = () => providers.refetch()
  const createMutation = useMutation(createShippingProvider, {
    onSuccess: () => {
      refresh()
      setFormState(null)
      showFeedback({
        type: 'success',
        title: 'Shipping provider created',
        message: 'The provider is saved and ready to manage.',
      })
    },
  })
  const updateMutation = useMutation<
    [UUID, UpdateShippingProviderRequest],
    ShippingProvider
  >((id, body) => updateShippingProvider(id, body), {
    onSuccess: () => {
      refresh()
      setFormState(null)
      showFeedback({
        type: 'success',
        title: 'Shipping provider updated',
        message: 'Your provider changes were saved.',
      })
    },
  })

  const list = providers.data ?? []

  const openCreate = () => {
    createMutation.reset()
    updateMutation.reset()
    setFormState({ provider: undefined })
  }

  const openEdit = (provider: ShippingProvider) => {
    createMutation.reset()
    updateMutation.reset()
    setFormState({ provider })
  }

  const submit = async (
    values: ShippingProviderFormValues,
  ): Promise<ShippingProvider | undefined> => {
    if (formState?.provider === undefined) {
      return createMutation.run(buildCreateShippingProviderRequest(values))
    }

    const body = buildUpdateShippingProviderRequest(values, formState.provider)
    if (Object.keys(body).length === 0) return formState.provider
    return updateMutation.run(formState.provider.id, body)
  }

  const toggleActive = async (provider: ShippingProvider) => {
    const nextActive = !provider.isActive
    if (!nextActive) {
      const confirmed = await confirmFeedback({
        type: 'warning',
        title: 'Deactivate shipping provider?',
        message: `${provider.name} will no longer be offered to customers. You can activate it again later.`,
        confirmLabel: 'Deactivate',
        cancelLabel: 'Keep active',
      })
      if (!confirmed) return
    }

    await updateMutation.run(provider.id, { isActive: nextActive })
  }

  const isSaving = createMutation.isPending || updateMutation.isPending
  const toggleError =
    formState === null && updateMutation.error !== undefined
      ? updateMutation.error
      : undefined

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Delivery"
        title="Shipping providers"
        description="Manage the delivery providers and base fees offered to customers. Provider choices are loaded from the backend."
        action={
          <Action size="sm" onClick={openCreate}>
            <Plus size={15} strokeWidth={1.7} aria-hidden />
            New provider
          </Action>
        }
      />

      {toggleError !== undefined && (
        <div className="space-y-3">
          <FormError message={toUserMessage(toggleError)} />
          <Action
            variant="outline"
            size="sm"
            onClick={() => updateMutation.reset()}
          >
            Dismiss
          </Action>
        </div>
      )}

      {providers.isLoading && (
        <div className="space-y-3" aria-label="Loading shipping providers">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {!providers.isLoading && providers.error !== undefined && (
        <ErrorState
          message={toUserMessage(providers.error)}
          onRetry={providers.refetch}
        />
      )}

      {!providers.isLoading &&
        providers.error === undefined &&
        list.length === 0 && (
          <EmptyState
            align="left"
            eyebrow="No providers"
            title="No shipping providers configured"
            description="Create a provider to make a delivery option available for future checkout integration."
            action={
              <Action size="sm" onClick={openCreate}>
                New provider
              </Action>
            }
          />
        )}

      {!providers.isLoading &&
        providers.error === undefined &&
        list.length > 0 && (
          <section aria-label="Shipping provider list" className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-[12px] text-graphite" aria-live="polite">
                {list.length} {list.length === 1 ? 'provider' : 'providers'}
              </p>
              {providers.isRefreshing && (
                <span className="text-[12px] text-graphite" role="status">
                  Refreshing…
                </span>
              )}
            </div>

            <div className="border border-line bg-paper">
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-line">
                      <Column>Name</Column>
                      <Column>Code</Column>
                      <Column>Base fee</Column>
                      <Column>Cash on delivery</Column>
                      <Column>Status</Column>
                      <Column className="text-right">Actions</Column>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-soft">
                    {list.map((provider) => (
                      <tr key={provider.id}>
                        <td className="px-5 py-4">
                          <span className="text-[13.5px] font-medium text-ink">
                            {provider.name}
                          </span>
                          {provider.description && (
                            <span className="mt-1 block max-w-sm text-[12.5px] leading-relaxed text-graphite">
                              {provider.description}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 font-mono text-[12px] text-graphite">
                          {provider.code}
                        </td>
                        <td className="px-4 py-4 font-mono text-[13px] tabular-nums text-ink">
                          {formatMoney(provider.baseFee)}
                        </td>
                        <td className="px-4 py-4 text-[13px] text-graphite">
                          {provider.supportsCod ? 'Supported' : 'Not supported'}
                        </td>
                        <td className="px-4 py-4">
                          <ProviderStatus isActive={provider.isActive} />
                        </td>
                        <td className="px-5 py-4">
                          <ProviderActions
                            provider={provider}
                            isPending={updateMutation.isPending}
                            onEdit={() => openEdit(provider)}
                            onToggle={() => void toggleActive(provider)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-line-soft md:hidden">
                {list.map((provider) => (
                  <li key={provider.id} className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink">{provider.name}</p>
                        <p className="mt-1 font-mono text-[11px] text-graphite">{provider.code}</p>
                      </div>
                      <ProviderStatus isActive={provider.isActive} />
                    </div>
                    {provider.description && (
                      <p className="text-[13px] leading-relaxed text-graphite">
                        {provider.description}
                      </p>
                    )}
                    <dl className="space-y-1 text-[13px]">
                      <div className="flex justify-between gap-4">
                        <dt className="text-graphite">Base fee</dt>
                        <dd className="font-mono tabular-nums text-ink">
                          {formatMoney(provider.baseFee)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-graphite">Cash on delivery</dt>
                        <dd className="text-ink">
                          {provider.supportsCod ? 'Supported' : 'Not supported'}
                        </dd>
                      </div>
                    </dl>
                    <ProviderActions
                      provider={provider}
                      isPending={updateMutation.isPending}
                      onEdit={() => openEdit(provider)}
                      onToggle={() => void toggleActive(provider)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

      {formState !== null && (
        <ShippingProviderFormModal
          key={formState.provider?.id ?? 'new'}
          provider={formState.provider}
          isSaving={isSaving}
          serverError={
            formState.provider === undefined
              ? createMutation.error
              : updateMutation.error
          }
          onClose={() => {
            if (!isSaving) setFormState(null)
          }}
          onSubmit={submit}
        />
      )}
    </div>
  )
}

function Column({
  children,
  className = '',
}: {
  children: string
  className?: string
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 text-[12px] font-medium text-graphite first:pl-5 last:pr-5 ${className}`}
    >
      {children}
    </th>
  )
}

function ProviderStatus({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2 py-1 text-[11px] font-medium ${
        isActive
          ? 'border-success/25 bg-success-soft text-success'
          : 'border-line bg-bone text-graphite'
      }`}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  )
}

function ProviderActions({
  provider,
  isPending,
  onEdit,
  onToggle,
}: {
  provider: ShippingProvider
  isPending: boolean
  onEdit: () => void
  onToggle: () => void
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex min-h-10 items-center gap-2 px-2 text-[12px] font-medium text-graphite transition-colors hover:bg-bone hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2"
        aria-label={`Edit ${provider.name}`}
      >
        <Pencil size={14} aria-hidden />
        Edit
      </button>
      <Action
        variant={provider.isActive ? 'outline' : 'ghost'}
        size="sm"
        disabled={isPending}
        onClick={onToggle}
      >
        {provider.isActive ? 'Deactivate' : 'Activate'}
      </Action>
    </div>
  )
}

function ShippingProviderFormModal({
  provider,
  isSaving,
  serverError,
  onClose,
  onSubmit,
}: {
  provider: ShippingProvider | undefined
  isSaving: boolean
  serverError: unknown
  onClose: () => void
  onSubmit: (
    values: ShippingProviderFormValues,
  ) => Promise<ShippingProvider | undefined>
}) {
  const [values, setValues] = useState<ShippingProviderFormValues>(() =>
    provider === undefined ? EMPTY_FORM : providerToFormValues(provider),
  )
  const [errors, setErrors] = useState<ShippingProviderErrors>({})
  const isEditing = provider !== undefined

  const set = <K extends keyof ShippingProviderFormValues>(
    field: K,
    value: ShippingProviderFormValues[K],
  ) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) =>
      current[field] === undefined ? current : { ...current, [field]: undefined },
    )
  }

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const found = validateShippingProvider(values)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      event.currentTarget
        .querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus()
      return
    }

    const saved = await onSubmit(values)
    if (saved !== undefined) onClose()
  }

  return (
    <Modal
      title={isEditing ? 'Edit shipping provider' : 'New shipping provider'}
      onClose={onClose}
      footer={
        <>
          <Action variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Action>
          <Action
            type="submit"
            form="shipping-provider-form"
            size="sm"
            disabled={isSaving}
          >
            {isSaving ? 'Saving' : isEditing ? 'Save changes' : 'Create provider'}
          </Action>
        </>
      }
    >
      <form
        id="shipping-provider-form"
        noValidate
        onSubmit={(event) => void submitForm(event)}
        className="space-y-5"
      >
        {serverError !== undefined && (
          <FormError message={toUserMessage(serverError)} />
        )}
        <TextField
          name="shipping-provider-code"
          label="Provider code"
          required
          maxLength={SHIPPING_PROVIDER_LIMITS.code}
          value={values.code}
          onChange={(event) => set('code', event.target.value)}
          error={errors.code}
          hint="Letters and numbers, with single hyphens between words."
          autoComplete="off"
        />
        <TextField
          name="shipping-provider-name"
          label="Provider name"
          required
          maxLength={SHIPPING_PROVIDER_LIMITS.name}
          value={values.name}
          onChange={(event) => set('name', event.target.value)}
          error={errors.name}
          autoComplete="organization"
        />
        <TextAreaField
          name="shipping-provider-description"
          label="Description"
          maxLength={SHIPPING_PROVIDER_LIMITS.description}
          value={values.description}
          onChange={(event) => set('description', event.target.value)}
          error={errors.description}
          hint="Optional delivery information shown with the provider."
        />
        <TextField
          name="shipping-provider-base-fee"
          label="Base shipping fee (USD)"
          required
          inputMode="decimal"
          maxLength={13}
          value={values.baseFee}
          onChange={(event) => set('baseFee', event.target.value)}
          error={errors.baseFee}
          hint="Use a non-negative amount with up to two decimal places."
        />
        <label className="flex min-h-12 cursor-pointer items-start gap-3 border border-line bg-paper-pure px-4 py-3.5">
          <input
            type="checkbox"
            checked={values.supportsCod}
            onChange={(event) => set('supportsCod', event.target.checked)}
            className="mt-0.5 size-4 cursor-pointer accent-ink"
          />
          <span>
            <span className="block text-[13px] font-medium text-ink">
              Supports Cash on Delivery
            </span>
            <span className="mt-1 block text-[13px] leading-relaxed text-graphite">
              This is provider capability metadata only. COD checkout and payment collection
              are not enabled in this phase.
            </span>
          </span>
        </label>
      </form>
    </Modal>
  )
}
