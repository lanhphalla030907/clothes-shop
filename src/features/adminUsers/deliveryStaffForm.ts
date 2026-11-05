import type { CreateDeliveryStaffRequest } from '@/types/api'

export interface DeliveryStaffFormValues {
  firstName: string
  lastName: string
  email: string
  password: string
  phone: string
}

export type DeliveryStaffFormErrors = Partial<
  Record<keyof DeliveryStaffFormValues, string>
>

export const EMPTY_DELIVERY_STAFF_FORM: DeliveryStaffFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phone: '',
}

export const validateDeliveryStaffForm = (
  values: DeliveryStaffFormValues,
): DeliveryStaffFormErrors => {
  const errors: DeliveryStaffFormErrors = {}
  const firstName = values.firstName.trim()
  const lastName = values.lastName.trim()
  const email = values.email.trim()

  if (firstName.length < 2) errors.firstName = 'Enter at least 2 characters.'
  else if (firstName.length > 100) errors.firstName = 'Use 100 characters or fewer.'

  if (lastName.length < 2) errors.lastName = 'Enter at least 2 characters.'
  else if (lastName.length > 100) errors.lastName = 'Use 100 characters or fewer.'

  if (email.length === 0) errors.email = 'Enter an email address.'
  else if (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid email address.'
  }

  if (values.password.length < 8) errors.password = 'Use at least 8 characters.'
  else if (values.password.length > 128) {
    errors.password = 'Use 128 characters or fewer.'
  }

  if (values.phone.length > 30) errors.phone = 'Use 30 characters or fewer.'

  return errors
}

export const buildDeliveryStaffRequest = (
  values: DeliveryStaffFormValues,
): CreateDeliveryStaffRequest => ({
  firstName: values.firstName.trim(),
  lastName: values.lastName.trim(),
  email: values.email.trim(),
  password: values.password,
  ...(values.phone.trim() === '' ? {} : { phone: values.phone.trim() }),
})
