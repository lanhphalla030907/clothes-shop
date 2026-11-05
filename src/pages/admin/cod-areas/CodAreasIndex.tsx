import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { FormError, TextField } from '@/components/account/Field'
import { Modal } from '@/components/account/Modal'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { EmptyState, ErrorState } from '@/components/account/States'
import { Skeleton } from '@/components/account/Skeleton'
import { useFeedback } from '@/context/feedbackContext'
import {
  createCodArea,
  fetchAdminCodAreas,
  updateCodArea,
} from '@/features/codAreas/api'
import {
  buildCreateCodAreaRequest,
  buildUpdateCodAreaRequest,
  COD_AREA_LIMITS,
  validateCodArea,
} from '@/features/codAreas/rules'
import type { CodAreaErrors } from '@/features/codAreas/rules'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { useMutation } from '@/hooks/useMutation'
import { toUserMessage } from '@/lib/api/errors'
import type { CodArea, CodAreaFormValues, UpdateCodAreaRequest, UUID } from '@/types/api'

type FormState = { area: CodArea | undefined }

const EMPTY_FORM: CodAreaFormValues = { code: '', name: '' }
const EMPTY_AREAS: CodArea[] = []

export default function CodAreasIndex() {
  const { showFeedback, confirmFeedback } = useFeedback()
  const areas = useAsyncResource<CodArea[]>(
    (signal) => fetchAdminCodAreas(signal),
    [],
  )
  const [formState, setFormState] = useState<FormState | null>(null)
  const [values, setValues] = useState<CodAreaFormValues>(EMPTY_FORM)
  const [errors, setErrors] = useState<CodAreaErrors>({})
  const [search, setSearch] = useState('')

  const refresh = () => areas.refetch()
  const createMutation = useMutation(createCodArea, {
    onSuccess: () => {
      refresh()
      setFormState(null)
      showFeedback({
        type: 'success',
        title: 'COD area created',
        message: 'The area was saved with COD disabled until you enable it.',
      })
    },
  })
  const updateMutation = useMutation<[UUID, UpdateCodAreaRequest], CodArea>(
    (id, body) => updateCodArea(id, body),
    {
      onSuccess: () => {
        refresh()
        setFormState(null)
        showFeedback({
          type: 'success',
          title: 'COD area updated',
          message: 'The area configuration was saved.',
        })
      },
    },
  )

  const list = areas.data ?? EMPTY_AREAS
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    if (query === '') return list
    return list.filter((area) =>
      `${area.name} ${area.code}`.toLocaleLowerCase().includes(query),
    )
  }, [list, search])

  const openCreate = () => {
    createMutation.reset()
    updateMutation.reset()
    setValues(EMPTY_FORM)
    setErrors({})
    setFormState({ area: undefined })
  }

  const openEdit = (area: CodArea) => {
    createMutation.reset()
    updateMutation.reset()
    setValues({ code: area.code, name: area.name })
    setErrors({})
    setFormState({ area })
  }

  const closeForm = () => {
    if (isSaving) return
    setFormState(null)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationErrors = validateCodArea(values)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    if (formState?.area === undefined) {
      await createMutation.run(buildCreateCodAreaRequest(values))
      return
    }

    const body = buildUpdateCodAreaRequest(values, formState.area)
    if (Object.keys(body).length === 0) {
      setFormState(null)
      return
    }
    await updateMutation.run(formState.area.id, body)
  }

  const toggleEligibility = async (area: CodArea) => {
    const nextEnabled = !area.codEnabled
    if (!nextEnabled) {
      const confirmed = await confirmFeedback({
        type: 'warning',
        title: 'Disable COD for this area?',
        message: `Customers will no longer see ${area.name} in the COD-eligible area list. You can enable it again later.`,
        confirmLabel: 'Disable COD',
        cancelLabel: 'Keep enabled',
      })
      if (!confirmed) return
    }
    await updateMutation.run(area.id, { codEnabled: nextEnabled })
  }

  const isSaving = createMutation.isPending || updateMutation.isPending
  const formError = formState === null
    ? undefined
    : createMutation.error ?? updateMutation.error
  const listError = formState === null ? updateMutation.error : undefined

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Delivery"
        title="COD areas"
        description="Configure which explicitly identified areas are eligible for Cash on Delivery. An eligible order must also use an active provider that supports COD."
        action={
          <Action size="sm" onClick={openCreate}>
            <Plus size={15} strokeWidth={1.7} aria-hidden />
            New area
          </Action>
        }
      />

      {listError !== undefined && (
        <div className="space-y-3">
          <FormError message={toUserMessage(listError)} />
          <Action variant="outline" size="sm" onClick={() => updateMutation.reset()}>
            Dismiss
          </Action>
        </div>
      )}

      {areas.isLoading && (
        <div className="space-y-3" aria-label="Loading COD areas">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {!areas.isLoading && areas.error !== undefined && (
        <ErrorState message={toUserMessage(areas.error)} onRetry={areas.refetch} />
      )}

      {!areas.isLoading && areas.error === undefined && list.length === 0 && (
        <EmptyState
          align="left"
          eyebrow="No areas"
          title="No COD areas configured"
          description="Add an area using a verified canonical code. New areas start with COD disabled."
          action={<Action size="sm" onClick={openCreate}>New area</Action>}
        />
      )}

      {!areas.isLoading && areas.error === undefined && list.length > 0 && (
        <section aria-label="COD area list" className="space-y-4">
          <TextField
            name="cod-area-search"
            label="Search areas"
            placeholder="Search by area name or code"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            autoComplete="off"
          />
          <div className="flex items-center justify-between gap-4">
            <p className="text-[12px] text-graphite" aria-live="polite">
              {filtered.length} {filtered.length === 1 ? 'area' : 'areas'}
            </p>
            {areas.isRefreshing && (
              <span className="text-[12px] text-graphite" role="status">Refreshing…</span>
            )}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              align="left"
              eyebrow="No matches"
              title="No COD areas match that search"
              description="Try another area name or code."
            />
          ) : (
            <ul className="divide-y divide-line border border-line bg-paper">
              {filtered.map((area) => (
                <li
                  key={area.id}
                  className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:px-5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium text-ink">{area.name}</p>
                    <p className="mt-1 font-mono text-[12px] text-graphite">{area.code}</p>
                  </div>
                  <span
                    className={`w-fit rounded-full px-3 py-1 text-[12px] font-medium ${
                      area.codEnabled
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'bg-bone text-graphite'
                    }`}
                  >
                    {area.codEnabled ? 'COD enabled' : 'COD disabled'}
                  </span>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <Action
                      variant="outline"
                      size="sm"
                      disabled={isSaving}
                      aria-label={`Edit ${area.name}`}
                      onClick={() => openEdit(area)}
                    >
                      <Pencil size={14} aria-hidden />
                      Edit
                    </Action>
                    <Action
                      variant={area.codEnabled ? 'warning' : 'soft'}
                      size="sm"
                      disabled={isSaving}
                      aria-label={area.codEnabled ? `Disable COD for ${area.name}` : `Enable COD for ${area.name}`}
                      onClick={() => void toggleEligibility(area)}
                    >
                      {area.codEnabled ? 'Disable COD' : 'Enable COD'}
                    </Action>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {formState !== null && (
        <Modal
          title={formState.area === undefined ? 'Create COD area' : `Edit ${formState.area.name}`}
          onClose={closeForm}
          footer={
            <>
              <Action variant="outline" size="sm" disabled={isSaving} onClick={closeForm}>
                Cancel
              </Action>
              <Action
                type="submit"
                form="cod-area-form"
                size="sm"
                disabled={isSaving}
              >
                {isSaving
                  ? 'Saving…'
                  : formState.area === undefined
                    ? 'Create area'
                    : 'Save changes'}
              </Action>
            </>
          }
        >
          <form id="cod-area-form" noValidate onSubmit={(event) => void submit(event)} className="space-y-5">
            {formError !== undefined && <FormError message={toUserMessage(formError)} />}
            {formState.area === undefined ? (
              <TextField
                name="cod-area-code"
                label="Canonical area code"
                hint="Use a stable code; do not enter a customer-provided address phrase."
                value={values.code}
                onChange={(event) => setValues((current) => ({ ...current, code: event.target.value }))}
                error={errors.code}
                required
                maxLength={COD_AREA_LIMITS.code}
                autoComplete="off"
                disabled={isSaving}
              />
            ) : (
              <div className="space-y-1">
                <p className="text-[13px] font-medium text-ink">Canonical area code</p>
                <p className="font-mono text-[13px] text-graphite">{formState.area.code}</p>
                <p className="text-[12px] text-graphite">Area codes cannot be changed after creation.</p>
              </div>
            )}
            <TextField
              name="cod-area-name"
              label="Area name"
              value={values.name}
              onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
              error={errors.name}
              required
              maxLength={COD_AREA_LIMITS.name}
              autoComplete="off"
              disabled={isSaving}
            />
          </form>
        </Modal>
      )}
    </div>
  )
}
