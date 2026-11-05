import { describe, expect, it } from 'vitest'
import {
  buildDeliveryStaffRequest,
  EMPTY_DELIVERY_STAFF_FORM,
  validateDeliveryStaffForm,
} from './deliveryStaffForm'

describe('delivery staff form rules', () => {
  it('requires valid names, email, and password and bounds the optional phone', () => {
    expect(validateDeliveryStaffForm(EMPTY_DELIVERY_STAFF_FORM)).toMatchObject({
      firstName: expect.any(String),
      lastName: expect.any(String),
      email: expect.any(String),
      password: expect.any(String),
    })
    expect(
      validateDeliveryStaffForm({
        firstName: 'Ada',
        lastName: 'Courier',
        email: 'not-an-email',
        password: 'short',
        phone: '1'.repeat(31),
      }),
    ).toMatchObject({
      email: expect.any(String),
      password: expect.any(String),
      phone: expect.any(String),
    })
  })

  it('trims profile fields and omits an empty optional phone', () => {
    expect(
      buildDeliveryStaffRequest({
        firstName: ' Ada ',
        lastName: ' Courier ',
        email: ' ada@example.test ',
        password: 'a-secure-password',
        phone: ' ',
      }),
    ).toEqual({
      firstName: 'Ada',
      lastName: 'Courier',
      email: 'ada@example.test',
      password: 'a-secure-password',
    })
  })
})
