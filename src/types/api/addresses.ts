import type { CountryCode, ISODateTime, UUID } from './common'
import {
  administrativeLocationName,
  type AdministrativeLocationPath,
} from './administrativeLocations'



export interface Address {
  id: UUID
  userId: UUID
  /** Customer-facing name for the entry, such as `Home`. */
  label: string
  recipientName: string
  phone: string
  addressLine1: string
  addressLine2: string | null
  city: string | null
  stateProvince: string | null
  district: string | null
  commune: string | null
  administrativeLocationPcode: string | null
  administrativeLocationPath: AdministrativeLocationPath | null
  postalCode: string | null
  countryCode: CountryCode
  /** At most one address per user is ever `true`. */
  isDefault: boolean
  createdAt: ISODateTime
  updatedAt: ISODateTime
}


export interface CreateAddressRequest {
  label: string
  recipientName: string
  phone: string
  addressLine1: string
  addressLine2?: string | null
  city?: string
  stateProvince?: string | null
  district?: string
  commune?: string
  administrativeLocationPcode?: string
  postalCode?: string | null
  countryCode: CountryCode
  isDefault?: boolean
}
export interface UpdateAddressRequest {
  label?: string
  recipientName?: string
  phone?: string
  addressLine1?: string
  addressLine2?: string | null
  city?: string
  stateProvince?: string | null
  district?: string
  commune?: string
  administrativeLocationPcode?: string | null
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
  provincePcode: string
  districtPcode: string
  district: string
  communePcode: string
  commune: string
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
  provincePcode: '',
  districtPcode: '',
  district: '',
  communePcode: '',
  commune: '',
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
  city: address.countryCode === 'KH' ? '' : address.city ?? '',
  stateProvince: address.countryCode === 'KH' ? '' : address.stateProvince ?? '',
  provincePcode:
    address.administrativeLocationPath?.find((location) => location.adminLevel === 1)?.pcode ?? '',
  districtPcode:
    address.administrativeLocationPath?.find((location) => location.adminLevel === 2)?.pcode ?? '',
  // Legacy Cambodia rows may not have a canonical province P-code. Keep their
  // free-text columns editable, but never infer a P-code from either value.
  district:
    address.district ?? (address.countryCode === 'KH' ? address.stateProvince ?? '' : ''),
  communePcode:
    address.administrativeLocationPath?.find((location) => location.adminLevel === 3)?.pcode ?? '',
  commune: address.commune ?? (address.countryCode === 'KH' ? address.city ?? '' : ''),
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
): CreateAddressRequest => {
  const countryCode = values.countryCode.trim().toUpperCase() as CountryCode
  return {
    label: values.label,
    recipientName: values.recipientName,
    phone: values.phone,
    addressLine1: values.addressLine1,
    addressLine2: values.addressLine2.trim() === '' ? null : values.addressLine2,
    ...(countryCode === 'KH'
      ? {
          administrativeLocationPcode: values.provincePcode,
          districtPcode: values.districtPcode || undefined,
          communePcode: values.communePcode || undefined,
          district: values.district,
          commune: values.commune,
        }
      : {
          city: values.city,
          stateProvince: values.stateProvince.trim() === '' ? null : values.stateProvince,
        }),
    postalCode: values.postalCode.trim() === '' ? null : values.postalCode,
    countryCode,
  }
}

/** One line of an address, skipping the parts that are absent. */
export const formatAddressLines = (address: Address): string[] => {
  const path = address.administrativeLocationPath
  const locationLines =
    path?.length === 1 && address.countryCode === 'KH'
      ? [
          ...path.map((location) => `Province/Municipality: ${administrativeLocationName(location)}`),
          ...(address.district ? [`District: ${address.district}`] : []),
          ...(address.commune ? [`Commune: ${address.commune}`] : []),
        ]
      : path
        ? path.map((location) => {
            const label =
              location.adminLevel === 1
                ? 'Province/Municipality'
                : location.adminLevel === 2
                  ? 'District'
                  : 'Commune'
            return `${label}: ${administrativeLocationName(location)}`
          })
        : [address.city]

  return [
    address.addressLine1,
    address.addressLine2,
    ...locationLines,
    [
      ...(path?.length === 1 && address.countryCode === 'KH' ? [] : [address.stateProvince]),
      address.postalCode,
    ]
      .filter(Boolean)
      .join(' '),
    address.countryCode,
  ].filter((line): line is string => Boolean(line && line.trim() !== ''))
}
