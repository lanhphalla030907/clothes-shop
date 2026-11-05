import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Plus, RefreshCw, Truck } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { FormError, TextField } from '@/components/account/Field'
import { EmptyState, ErrorState, InlineNotice } from '@/components/account/States'
import { Skeleton } from '@/components/account/Skeleton'
import { useFeedback } from '@/context/feedbackContext'
import { createDeliveryStaff } from '@/features/adminUsers/api'
import {
  buildDeliveryStaffRequest,
  EMPTY_DELIVERY_STAFF_FORM,
  validateDeliveryStaffForm,
} from '@/features/adminUsers/deliveryStaffForm'
import type {
  DeliveryStaffFormErrors,
  DeliveryStaffFormValues,
} from '@/features/adminUsers/deliveryStaffForm'
import { fetchActiveDeliveryStaff } from '@/features/delivery/api'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { useMutation } from '@/hooks/useMutation'
import { toUserMessage } from '@/lib/api/errors'
import type { DeliveryStaff } from '@/types/api'

export default function DeliveryStaffManagement() {
  const { showFeedback } = useFeedback()
  const staff = useAsyncResource<DeliveryStaff[]>(
    (signal) => fetchActiveDeliveryStaff(signal),
    [],
  )
  const [values, setValues] = useState<DeliveryStaffFormValues>(
    EMPTY_DELIVERY_STAFF_FORM,
  )
  const [errors, setErrors] = useState<DeliveryStaffFormErrors>({})
  const [successMessage, setSuccessMessage] = useState('')

  const createMutation = useMutation(createDeliveryStaff, {
    onSuccess: (user) => {
      staff.refetch()
      setValues(EMPTY_DELIVERY_STAFF_FORM)
      setErrors({})
      setSuccessMessage(`${user.firstName} ${user.lastName} is active delivery staff.`)
      showFeedback({
        type: 'success',
        title: 'Delivery staff created',
        message: `${user.firstName} ${user.lastName} can now receive delivery assignments.`,
      })
    },
  })

  const update = (field: keyof DeliveryStaffFormValues) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setValues((current) => ({ ...current, [field]: event.target.value }))
      setErrors((current) => ({ ...current, [field]: undefined }))
      setSuccessMessage('')
      createMutation.reset()
    }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (createMutation.isPending) return

    const nextErrors = validateDeliveryStaffForm(values)
    setErrors(nextErrors)
    setSuccessMessage('')
    if (Object.keys(nextErrors).length > 0) return

    await createMutation.run(buildDeliveryStaffRequest(values))
  }

  const list = staff.data ?? []

  return (
    <section
      className="border border-line bg-paper"
      aria-labelledby="delivery-staff-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
        <div>
          <p className="eyebrow text-graphite">Delivery operations</p>
          <h2
            id="delivery-staff-heading"
            className="mt-2 text-[17px] font-semibold text-ink"
          >
            Delivery staff
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-graphite">
            Create active courier accounts and view staff eligible for assignments.
          </p>
        </div>
        <Action
          size="sm"
          variant="outline"
          onClick={staff.refetch}
          disabled={staff.isRefreshing}
        >
          <RefreshCw
            size={14}
            strokeWidth={1.7}
            aria-hidden
            className={staff.isRefreshing ? 'animate-spin' : ''}
          />
          Refresh
        </Action>
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
        <div className="border-b border-line p-5 sm:p-6 lg:border-b-0 lg:border-r">
          <h3 className="text-[14px] font-semibold text-ink">
            Active delivery staff
          </h3>
          {staff.isLoading ? (
            <div
              className="mt-4 space-y-3"
              aria-label="Loading active delivery staff"
              role="status"
            >
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : staff.error !== undefined ? (
            <div className="mt-4">
              <ErrorState
                message={toUserMessage(staff.error)}
                onRetry={staff.refetch}
              />
            </div>
          ) : list.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                align="left"
                eyebrow="No active staff"
                title="No delivery staff yet"
                description="Create an account to make a courier available for assignment."
                className="px-4 py-8"
              />
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-line-soft">
              {list.map((member) => (
                <li
                  key={member.id}
                  className="flex min-w-0 items-center gap-3 py-3"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-bone text-graphite">
                    <Truck size={16} strokeWidth={1.6} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-ink">
                      {member.firstName} {member.lastName}
                    </span>
                    <span className="block truncate text-[12px] text-graphite">
                      {member.email}
                    </span>
                  </span>
                  <span className="shrink-0 border border-line px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-graphite">
                    Active
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-5 sm:p-6">
          <h3 className="text-[14px] font-semibold text-ink">
            Create delivery staff
          </h3>
          <p className="mt-1 text-[13px] leading-relaxed text-graphite">
            The account is created as active delivery staff. Role and status are
            controlled by the server.
          </p>

          <form onSubmit={submit} noValidate className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="First name"
                name="firstName"
                autoComplete="given-name"
                required
                value={values.firstName}
                onChange={update('firstName')}
                error={errors.firstName}
              />
              <TextField
                label="Last name"
                name="lastName"
                autoComplete="family-name"
                required
                value={values.lastName}
                onChange={update('lastName')}
                error={errors.lastName}
              />
            </div>
            <TextField
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={values.email}
              onChange={update('email')}
              error={errors.email}
            />
            <TextField
              label="Temporary password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={values.password}
              onChange={update('password')}
              error={errors.password}
              hint="Use 8–128 characters."
            />
            <TextField
              label="Phone (optional)"
              name="phone"
              type="tel"
              autoComplete="tel"
              value={values.phone}
              onChange={update('phone')}
              error={errors.phone}
            />

            {createMutation.error !== undefined && (
              <FormError message={toUserMessage(createMutation.error)} />
            )}
            {successMessage !== '' && (
              <InlineNotice message={successMessage} tone="success" />
            )}

            <Action type="submit" size="sm" disabled={createMutation.isPending}>
              <Plus size={15} strokeWidth={1.7} aria-hidden />
              {createMutation.isPending ? 'Creating…' : 'Create staff account'}
            </Action>
          </form>
        </div>
      </div>
    </section>
  )
}
