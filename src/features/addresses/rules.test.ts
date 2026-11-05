import { describe, expect, it } from 'vitest'
import {
  addressToFormValues,
  addressFormValuesToRequest,
  EMPTY_ADDRESS_FORM,
  type AddressFormValues,
} from '@/types/api'
import { validateAddress } from './rules'

const cambodiaAddress = (
  overrides: Partial<AddressFormValues> = {},
): AddressFormValues => ({
  ...EMPTY_ADDRESS_FORM,
  label: 'Home',
  recipientName: 'Sophea',
  phone: '+85512345678',
  addressLine1: 'Street 1',
  provincePcode: 'KH12',
  district: 'Chamkar Mon',
  commune: 'ស្រះចក',
  ...overrides,
})

describe('Cambodia address fields', () => {
  it('requires a province and free-text district and commune', () => {
    expect(
      validateAddress(
        cambodiaAddress({ provincePcode: '', district: '', commune: '' }),
      ),
    ).toMatchObject({
      provincePcode: expect.any(String),
      district: expect.any(String),
      commune: expect.any(String),
    })
  })

  it('submits the province P-code and preserves Khmer text exactly', () => {
    expect(addressFormValuesToRequest(cambodiaAddress())).toMatchObject({
      countryCode: 'KH',
      administrativeLocationPcode: 'KH12',
      district: 'Chamkar Mon',
      commune: 'ស្រះចក',
    })
    expect(addressFormValuesToRequest(cambodiaAddress())).not.toHaveProperty('city')
    expect(addressFormValuesToRequest(cambodiaAddress())).not.toHaveProperty('stateProvince')
  })

  it('continues requiring free-text city outside Cambodia', () => {
    expect(
      validateAddress(
        cambodiaAddress({
          countryCode: 'GB',
          city: '',
          stateProvince: 'England',
          provincePcode: '',
          district: '',
          commune: '',
        }),
      ).city,
    ).toBe('A city is required')
  })

  it('keeps legacy Cambodia free text without silently assigning a province', () => {
    const form = addressToFormValues({
      id: '11111111-1111-4111-8111-111111111111',
      userId: '66666666-6666-4666-8666-666666666666',
      label: 'Home',
      recipientName: 'Sophea',
      phone: '+85512345678',
      addressLine1: 'Street 1',
      addressLine2: null,
      city: 'Old city text',
      stateProvince: 'Old province text',
      district: null,
      commune: null,
      administrativeLocationPcode: null,
      administrativeLocationPath: null,
      postalCode: null,
      countryCode: 'KH',
      isDefault: true,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    })

    expect(form).toMatchObject({
      provincePcode: '',
      district: 'Old province text',
      commune: 'Old city text',
    })
    expect(
      validateAddress(
        { ...form, provincePcode: '' },
      ).provincePcode,
    ).toBe('Select a province or municipality')
  })
})
