import type { CodAreaFormValues, CreateCodAreaRequest, UpdateCodAreaRequest } from '@/types/api'
import type { CodArea } from '@/types/api'

export const COD_AREA_LIMITS = {
  code: 50,
  name: 120,
} as const

const CODE_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/

export type CodAreaErrors = Partial<Record<keyof CodAreaFormValues, string>>

export const validateCodArea = (values: CodAreaFormValues): CodAreaErrors => {
  const errors: CodAreaErrors = {}
  const code = values.code.trim().toUpperCase()
  const name = values.name.trim()

  if (code.length === 0) errors.code = 'An area code is required'
  else if (code.length > COD_AREA_LIMITS.code) {
    errors.code = `Code must be ${COD_AREA_LIMITS.code} characters or fewer`
  } else if (!CODE_PATTERN.test(code)) {
    errors.code = 'Use letters, numbers, and single hyphens between code parts'
  }

  if (name.length === 0) errors.name = 'An area name is required'
  else if (name.length > COD_AREA_LIMITS.name) {
    errors.name = `Name must be ${COD_AREA_LIMITS.name} characters or fewer`
  }

  return errors
}

export const buildCreateCodAreaRequest = (
  values: CodAreaFormValues,
): CreateCodAreaRequest => ({
  code: values.code.trim().toUpperCase(),
  name: values.name.trim(),
})

export const buildUpdateCodAreaRequest = (
  values: CodAreaFormValues,
  area: CodArea,
): UpdateCodAreaRequest => {
  const name = values.name.trim()
  return name === area.name ? {} : { name }
}
