import type {
  CreateShippingProviderRequest,
  ShippingProvider,
  ShippingProviderFormValues,
  UpdateShippingProviderRequest,
} from '@/types/api'

export const SHIPPING_PROVIDER_LIMITS = {
  code: 50,
  name: 120,
  description: 500,
  feeWholeDigits: 10,
} as const

const CODE_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/
const FEE_PATTERN = /^\d{1,10}(?:\.\d{0,2})?$/

export type ShippingProviderErrors = Partial<
  Record<keyof ShippingProviderFormValues, string>
>

export const providerToFormValues = (
  provider: ShippingProvider,
): ShippingProviderFormValues => ({
  code: provider.code,
  name: provider.name,
  description: provider.description ?? '',
  baseFee: provider.baseFee,
  supportsCod: provider.supportsCod,
})

export const validateShippingProvider = (
  values: ShippingProviderFormValues,
): ShippingProviderErrors => {
  const errors: ShippingProviderErrors = {}
  const code = values.code.trim().toUpperCase()
  const name = values.name.trim()
  const description = values.description.trim()
  const fee = values.baseFee.trim()

  if (code.length === 0) errors.code = 'A provider code is required'
  else if (code.length > SHIPPING_PROVIDER_LIMITS.code) {
    errors.code = `Code must be ${SHIPPING_PROVIDER_LIMITS.code} characters or fewer`
  } else if (!CODE_PATTERN.test(code)) {
    errors.code = 'Use letters, numbers, and single hyphens between code parts'
  }

  if (name.length === 0) errors.name = 'A provider name is required'
  else if (name.length > SHIPPING_PROVIDER_LIMITS.name) {
    errors.name = `Name must be ${SHIPPING_PROVIDER_LIMITS.name} characters or fewer`
  }

  if (description.length > SHIPPING_PROVIDER_LIMITS.description) {
    errors.description = `Description must be ${SHIPPING_PROVIDER_LIMITS.description} characters or fewer`
  }

  if (fee.length === 0) errors.baseFee = 'A base fee is required'
  else if (!FEE_PATTERN.test(fee)) {
    errors.baseFee = 'Enter a non-negative fee with up to 2 decimal places'
  }

  return errors
}

const normalizeFee = (value: string): string => {
  const [whole = '', fraction = ''] = value.trim().split('.')
  return `${whole}.${fraction.padEnd(2, '0')}`
}

export const buildCreateShippingProviderRequest = (
  values: ShippingProviderFormValues,
): CreateShippingProviderRequest => ({
  code: values.code.trim().toUpperCase(),
  name: values.name.trim(),
  ...(values.description.trim() === '' ? {} : { description: values.description.trim() }),
  baseFee: normalizeFee(values.baseFee),
  supportsCod: values.supportsCod,
})

export const buildUpdateShippingProviderRequest = (
  values: ShippingProviderFormValues,
  provider: ShippingProvider,
): UpdateShippingProviderRequest => {
  const body: UpdateShippingProviderRequest = {}
  const next = buildCreateShippingProviderRequest(values)

  if (next.code !== provider.code) body.code = next.code
  if (next.name !== provider.name) body.name = next.name
  if (next.description !== (provider.description ?? undefined)) {
    body.description = next.description ?? null
  }
  if (next.baseFee !== provider.baseFee) body.baseFee = next.baseFee
  if (next.supportsCod !== provider.supportsCod) body.supportsCod = next.supportsCod

  return body
}
