import { useState } from 'react'
import { Check, Pencil, Star, Trash2 } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { PageHeader, Panel } from '@/components/account/PageHeader'
import { FormError, SelectField, TextField } from '@/components/account/Field'
import { EmptyState, ErrorState, InlineNotice } from '@/components/account/States'
import { Modal } from '@/components/account/Modal'
import { SkeletonCard } from '@/components/account/Skeleton'
import { toCreateRequest, useAddresses } from '@/features/addresses/useAddresses'
import {
  ADDRESS_LIMITS,
  COUNTRY_OPTIONS,
  normalizeCountryCode,
  validateAddress,
  type AddressErrors,
} from '@/features/addresses/rules'
import { toUserMessage } from '@/lib/api/errors'
import {
  addressToFormValues,
  formatAddressLines,
  EMPTY_ADDRESS_FORM,
  type Address,
  type AddressFormValues,
} from '@/types/api'

/**
 * The address book.
 *
 * Two rules from the server shape this screen, and both are surfaced rather than
 * hidden:
 *
 * - the **first** address becomes the default automatically, so the create form
 *   never asks about it — asking would be asking a question the server has
 *   already answered;
 * - only one address can be default, and asking for "not default" on the current
 *   one is a conflict, so the "make default" control is simply **absent** on the
 *   address that already holds it.
 *
 * Client validation mirrors the server's field limits (`features/addresses/rules.ts`)
 * so a mistake is caught before a round trip, but the server remains the
 * authority: `forbidNonWhitelisted` means anything this form sends can still be
 * refused, and its message is what gets shown.
 */
export default function Addresses() {
  const book = useAddresses()
  const [editing, setEditing] = useState<Address | 'new' | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Address | null>(null)

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Account"
        title="Addresses"
        description="Saved on the studio server against your account. An order keeps its own copy, so editing an address here never changes where a past parcel went."
        action={
          <Action size="sm" onClick={() => setEditing('new')} withArrow>
            Add an address
          </Action>
        }
      />

      {book.actionError !== undefined && (
        <InlineNotice
          message={toUserMessage(book.actionError)}
          onDismiss={book.dismissActionError}
        />
      )}

      {book.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <SkeletonCard rows={2} />
          <SkeletonCard rows={2} />
        </div>
      ) : book.error ? (
        <ErrorState message={toUserMessage(book.error)} onRetry={book.refetch} />
      ) : book.addresses.length === 0 ? (
        <EmptyState
          eyebrow="No addresses"
          title="No delivery addresses yet"
          description="Checkout needs somewhere to send the parcel. The first address you add becomes your default automatically."
          action={
            <Action onClick={() => setEditing('new')} withArrow>
              Add your first address
            </Action>
          }
        />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {book.addresses.map((address) => (
            <li key={address.id}>
              <AddressCard
                address={address}
                isPending={book.pendingIds.has(address.id)}
                onEdit={() => setEditing(address)}
                onMakeDefault={() => void book.makeDefault(address.id)}
                onDelete={() => setPendingDelete(address)}
              />
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <AddressFormModal
          key={editing === 'new' ? 'new' : editing.id}
          address={editing === 'new' ? undefined : editing}
          isSaving={book.isCreating || (editing !== 'new' && book.pendingIds.has(editing.id))}
          serverError={book.actionError}
          onClose={() => setEditing(null)}
          onSubmit={async (values) => {
            if (editing === 'new') {
              const created = await book.create(toCreateRequest(values))
              if (created) setEditing(null)
              return
            }

            const updated = await book.update(editing.id, toCreateRequest(values))
            if (updated) setEditing(null)
          }}
        />
      )}

      {pendingDelete && (
        <Modal
          title="Delete this address?"
          onClose={() => setPendingDelete(null)}
          footer={
            <>
              <Action variant="ghost" size="sm" onClick={() => setPendingDelete(null)}>
                Keep it
              </Action>
              <Action
                size="sm"
                onClick={() => {
                  void book.remove(pendingDelete.id)
                  setPendingDelete(null)
                }}
              >
                Delete address
              </Action>
            </>
          }
        >
          <p className="text-sm leading-relaxed text-graphite">
            <span className="text-ink">{pendingDelete.label}</span> will be removed from your
            address book. Orders already placed keep their own copy of it, so no delivery history
            is affected.
          </p>
        </Modal>
      )}
    </div>
  )
}

type AddressCardProps = {
  address: Address
  isPending: boolean
  onEdit: () => void
  onMakeDefault: () => void
  onDelete: () => void
}

const AddressCard = ({ address, isPending, onEdit, onMakeDefault, onDelete }: AddressCardProps) => (
  <Panel className={`flex h-full flex-col p-6 ${isPending ? 'opacity-50' : ''}`}>
    <div className="flex items-start justify-between gap-4">
      <h2 className="label-micro text-ink">{address.label}</h2>
      {address.isDefault && (
        <span className="label-micro inline-flex items-center gap-1.5 border border-ink bg-ink px-2.5 py-1.5 text-paper">
          <Check size={11} strokeWidth={2} aria-hidden />
          Default
        </span>
      )}
    </div>

    <address className="mt-5 space-y-1 text-sm not-italic leading-relaxed text-graphite">
      <span className="block text-ink">{address.recipientName}</span>
      <span className="block">{address.phone}</span>
      {formatAddressLines(address).map((line) => (
        <span key={line} className="block">
          {line}
        </span>
      ))}
    </address>

    <div className="mt-auto flex flex-wrap items-center gap-4 pt-6">
      <button
        type="button"
        onClick={onEdit}
        disabled={isPending}
        className="label-micro inline-flex items-center gap-1.5 text-graphite transition-colors hover:text-ink disabled:opacity-40"
      >
        <Pencil size={11} strokeWidth={1.5} aria-hidden />
        Edit
      </button>

      {/* Absent, not disabled: asking the server to un-default the only default is
          a 409, so the control is not offered at all. */}
      {!address.isDefault && (
        <button
          type="button"
          onClick={onMakeDefault}
          disabled={isPending}
          className="label-micro inline-flex items-center gap-1.5 text-graphite transition-colors hover:text-ink disabled:opacity-40"
        >
          <Star size={11} strokeWidth={1.5} aria-hidden />
          Make default
        </button>
      )}

      <button
        type="button"
        onClick={onDelete}
        disabled={isPending}
        className="label-micro ml-auto inline-flex items-center gap-1.5 text-graphite transition-colors hover:text-signal disabled:opacity-40"
      >
        <Trash2 size={11} strokeWidth={1.5} aria-hidden />
        Delete
      </button>
    </div>
  </Panel>
)

type AddressFormModalProps = {
  address: Address | undefined
  isSaving: boolean
  serverError: unknown
  onClose: () => void
  onSubmit: (values: AddressFormValues) => Promise<void>
}

/** Ties the modal's footer button to the form rendered in its body. */
const ADDRESS_FORM_ID = 'address-form'

/**
 * Create and edit share one form because the fields and the limits are the same —
 * an update is validated exactly as strictly as a create, so a form that only knew
 * how to create would be a form that could write a value the API would refuse.
 */
const AddressFormModal = ({
  address,
  isSaving,
  serverError,
  onClose,
  onSubmit,
}: AddressFormModalProps) => {
  const [values, setValues] = useState<AddressFormValues>(() =>
    address ? addressToFormValues(address) : EMPTY_ADDRESS_FORM,
  )
  const [errors, setErrors] = useState<AddressErrors>({})

  const set = (field: keyof AddressFormValues) => (value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    // Clear the message as soon as the shopper edits the field it belongs to.
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current))
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()

    const found = validateAddress(values)
    setErrors(found)

    if (Object.keys(found).length > 0) {
      // Move focus to the first thing that needs attention.
      const first = document.querySelector<HTMLElement>('[aria-invalid="true"]')
      first?.focus()
      return
    }

    await onSubmit(values)
  }

  return (
    <Modal
      title={address ? `Edit ${address.label}` : 'Add an address'}
      onClose={onClose}
      footer={
        <>
          <Action variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Action>
          {/* `form=` rather than an onClick that fakes a submit event: this is a
              real submit button for the form below, so Enter and the button take
              the same validated path. */}
          <Action size="sm" type="submit" form={ADDRESS_FORM_ID} disabled={isSaving}>
            {isSaving ? 'Saving' : address ? 'Save changes' : 'Add address'}
          </Action>
        </>
      }
    >
      <form id={ADDRESS_FORM_ID} onSubmit={(event) => void submit(event)} className="space-y-5">
        {serverError !== undefined && <FormError message={toUserMessage(serverError)} />}

        <TextField
          name="label"
          label="Label"
          placeholder="Home, Studio, Parents"
          value={values.label}
          onChange={(event) => set('label')(event.target.value)}
          error={errors.label}
          maxLength={ADDRESS_LIMITS.label}
          required
          autoComplete="off"
        />

        <TextField
          name="recipientName"
          label="Recipient name"
          value={values.recipientName}
          onChange={(event) => set('recipientName')(event.target.value)}
          error={errors.recipientName}
          maxLength={ADDRESS_LIMITS.recipientName}
          required
          autoComplete="name"
        />

        <TextField
          name="phone"
          label="Phone"
          type="tel"
          value={values.phone}
          onChange={(event) => set('phone')(event.target.value)}
          error={errors.phone}
          maxLength={ADDRESS_LIMITS.phone}
          required
          autoComplete="tel"
        />

        <TextField
          name="addressLine1"
          label="Street address"
          value={values.addressLine1}
          onChange={(event) => set('addressLine1')(event.target.value)}
          error={errors.addressLine1}
          maxLength={ADDRESS_LIMITS.addressLine1}
          required
          autoComplete="address-line1"
        />

        <TextField
          name="addressLine2"
          label="Apartment, floor, unit (optional)"
          value={values.addressLine2}
          onChange={(event) => set('addressLine2')(event.target.value)}
          error={errors.addressLine2}
          maxLength={ADDRESS_LIMITS.addressLine2}
          autoComplete="address-line2"
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            name="city"
            label="City"
            value={values.city}
            onChange={(event) => set('city')(event.target.value)}
            error={errors.city}
            maxLength={ADDRESS_LIMITS.city}
            required
            autoComplete="address-level2"
          />
          <TextField
            name="stateProvince"
            label="State or province (optional)"
            value={values.stateProvince}
            onChange={(event) => set('stateProvince')(event.target.value)}
            error={errors.stateProvince}
            maxLength={ADDRESS_LIMITS.stateProvince}
            autoComplete="address-level1"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            name="postalCode"
            label="Postal code (optional)"
            value={values.postalCode}
            onChange={(event) => set('postalCode')(event.target.value)}
            error={errors.postalCode}
            maxLength={ADDRESS_LIMITS.postalCode}
            autoComplete="postal-code"
          />
          <SelectField
            name="countryCode"
            label="Country"
            value={values.countryCode}
            onChange={(event) => set('countryCode')(event.target.value)}
            error={errors.countryCode}
            required
            autoComplete="country"
          >
            {COUNTRY_OPTIONS.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
            {/* Keeps a code the form does not list selectable rather than silently
                resetting the field when the page re-renders it. */}
            {!COUNTRY_OPTIONS.some((option) => option.code === normalizeCountryCode(values.countryCode)) && (
              <option value={normalizeCountryCode(values.countryCode)}>
                {normalizeCountryCode(values.countryCode)}
              </option>
            )}
          </SelectField>
        </div>
      </form>
    </Modal>
  )
}
