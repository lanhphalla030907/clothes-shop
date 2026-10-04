import type { AddressFormValues } from '@/types/api'

/**
 * The address rules the server enforces, restated for the form.
 *
 * These constants and this validator are a **mirror**, not the source of truth:
 * `CreateAddressDto` and `UpdateAddressDto` decide what is valid, and the server
 * runs `forbidNonWhitelisted`, so anything this file lets through can still be
 * refused. The point of duplicating them is that a shopper should not have to
 * press "Save" to be told a label is 60 characters long.
 *
 * Every rule matches the server's, including its trimming behaviour: the server
 * trims *before* validating, so `"   "` is a missing label rather than a
 * three-space one, and lengths are measured on the trimmed value.
 */

/** Mirrors `address-field.rules.ts` on the server. */
export const ADDRESS_LIMITS = {
  label: 50,
  recipientName: 150,
  phone: 30,
  addressLine1: 255,
  addressLine2: 255,
  city: 100,
  stateProvince: 100,
  postalCode: 20,
} as const

/** ISO 3166-1 alpha-2, after uppercasing — the server normalises before matching. */
const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/

export type AddressField = keyof AddressFormValues
export type AddressErrors = Partial<Record<AddressField, string>>

const required = (value: string, label: string, max: number): string | undefined => {
  const trimmed = value.trim()
  if (trimmed.length === 0) return `${label} is required`
  if (trimmed.length > max) return `${label} must be ${max} characters or fewer`
  return undefined
}

const optional = (value: string, label: string, max: number): string | undefined => {
  const trimmed = value.trim()
  if (trimmed.length === 0) return undefined
  if (trimmed.length > max) return `${label} must be ${max} characters or fewer`
  return undefined
}

/**
 * Validates a whole form. Returns only the fields that failed, so the caller can
 * pass the object straight to `FormField` and focus the first invalid input.
 */
export const validateAddress = (values: AddressFormValues): AddressErrors => {
  const errors: AddressErrors = {}

  const assign = (field: AddressField, message: string | undefined) => {
    if (message) errors[field] = message
  }

  assign('label', required(values.label, 'A label', ADDRESS_LIMITS.label))
  assign('recipientName', required(values.recipientName, 'A recipient name', ADDRESS_LIMITS.recipientName))
  assign('phone', required(values.phone, 'A phone number', ADDRESS_LIMITS.phone))
  assign('addressLine1', required(values.addressLine1, 'A street address', ADDRESS_LIMITS.addressLine1))
  assign('addressLine2', optional(values.addressLine2, 'A second line', ADDRESS_LIMITS.addressLine2))
  assign('city', required(values.city, 'A city', ADDRESS_LIMITS.city))
  assign('stateProvince', optional(values.stateProvince, 'A state or province', ADDRESS_LIMITS.stateProvince))
  assign('postalCode', optional(values.postalCode, 'A postal code', ADDRESS_LIMITS.postalCode))

  if (!COUNTRY_CODE_PATTERN.test(values.countryCode.trim().toUpperCase())) {
    errors.countryCode = 'Use a two-letter country code, such as KH'
  }

  return errors
}

/** Country codes offered in the form. Free text stays possible — see below. */
export const COUNTRY_OPTIONS: { code: string; label: string }[] = [
  { code: 'KH', label: 'Cambodia' },
  { code: 'US', label: 'United States' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'AU', label: 'Australia' },
  { code: 'CA', label: 'Canada' },
  { code: 'DE', label: 'Germany' },
  { code: 'FR', label: 'France' },
  { code: 'JP', label: 'Japan' },
  { code: 'NL', label: 'Netherlands' },
  { code: 'SG', label: 'Singapore' },
]

/**
 * Normalises a country code the way the server does before it validates, so the
 * form and the stored row agree on the one canonical spelling.
 */
export const normalizeCountryCode = (value: string): string => value.trim().toUpperCase()