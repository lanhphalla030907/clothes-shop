import type { CountryCode, ISODateTime, UUID } from './common'

/**
 * `GET/POST/PATCH/DELETE /addresses`, plus `POST /addresses/:id/default`.
 *
 * Nullability is preserved exactly as the server sends it: `addressLine2`,
 * `stateProvince` and `postalCode` are `null` when absent rather than `''`,
 * because "not supplied" and "supplied as blank" are different facts and the
 * forms need to tell them apart.
 *
 * There is no nested `user` object and no email — an address book is the
 * caller's own data.
 */

export interface Address {
  id: UUID
  userId: UUID
  /** Customer-facing name for the entry, such as `Home`. */
  label: string
  recipientName: string
  phone: string
  addressLine1: string
  addressLine2: string | null
  city: string
  stateProvince: string | null
  postalCode: string | null
  countryCode: CountryCode
  /** At most one address per user is ever `true`. */
  isDefault: boolean
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

/**
 * `POST /addresses`.
 *
 * `isDefault` is optional and defaults to `false`; the server promotes the first
 * address on its own, so a client never has to know that rule.
 */
export interface CreateAddressRequest {
  label: string
  recipientName: string
  phone: string
  addressLine1: string
  addressLine2?: string | null
  city: string
  stateProvince?: string | null
  postalCode?: string | null
  countryCode: CountryCode
  isDefault?: boolean
}

/**
 * `PATCH /addresses/:id`.
 *
 * Every field is optional and every field is validated as strictly as on create
 * — an update must not be able to write a value `POST` would have refused.
 *
 * `isDefault` is a request to *move* the single default slot, not a column:
 * `true` demotes the incumbent, `false` is rejected with 409 while this address
 * currently holds it.
 */
export interface UpdateAddressRequest {
  label?: string
  recipientName?: string
  phone?: string
  addressLine1?: string
  addressLine2?: string | null
  city?: string
  stateProvince?: string | null
  postalCode?: string | null
  countryCode?: CountryCode
  isDefault?: boolean
}

/** A form's value: an empty optional field is `''` until it is submitted. */
export interface AddressFormValues {
  label: string
  recipientName: string
  phone: string
  addressLine1: string
  addressLine2: string
  city: string
  stateProvince: string
  postalCode: string
  countryCode: string
}

export const EMPTY_ADDRESS_FORM: AddressFormValues = {
  label: '',
  recipientName: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  stateProvince: '',
  postalCode: '',
  countryCode: 'KH',
}

/** Maps a stored address back into editable form values. */
export const addressToFormValues = (address: Address): AddressFormValues => ({
  label: address.label,
  recipientName: address.recipientName,
  phone: address.phone,
  addressLine1: address.addressLine1,
  addressLine2: address.addressLine2 ?? '',
  city: address.city,
  stateProvince: address.stateProvince ?? '',
  postalCode: address.postalCode ?? '',
  countryCode: address.countryCode,
})

/**
 * Turns form values into a request body.
 *
 * Blank optional fields become `null`, which is how the server is told to store
 * "absent" — and is also what the server itself does with `''`, so the two
 * spellings cannot diverge.
 */
export const addressFormValuesToRequest = (
  values: AddressFormValues,
): CreateAddressRequest => ({
  label: values.label,
  recipientName: values.recipientName,
  phone: values.phone,
  addressLine1: values.addressLine1,
  addressLine2: values.addressLine2.trim() === '' ? null : values.addressLine2,
  city: values.city,
  stateProvince: values.stateProvince.trim() === '' ? null : values.stateProvince,
  postalCode: values.postalCode.trim() === '' ? null : values.postalCode,
  countryCode: values.countryCode,
})

/** One line of an address, skipping the parts that are absent. */
export const formatAddressLines = (address: Address): string[] =>
  [
    address.addressLine1,
    address.addressLine2,
    address.city,
    [address.stateProvince, address.postalCode].filter(Boolean).join(' '),
    address.countryCode,
  ].filter((line): line is string => Boolean(line && line.trim() !== ''))