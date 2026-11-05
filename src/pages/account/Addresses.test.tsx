import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { useAddressActions } from '@/features/addresses/useAddressActions'
import { fetchCambodiaLocations } from '@/features/locations/api'
import Addresses from './Addresses'

vi.mock('@/features/addresses/useAddressActions', () => ({
  useAddressActions: vi.fn(),
}))

vi.mock('@/features/locations/api', () => ({
  fetchCambodiaLocations: vi.fn(),
}))

const addressActionsMock = vi.mocked(useAddressActions)
const fetchLocationsMock = vi.mocked(fetchCambodiaLocations)
const createMock = vi.fn()

const renderPage = () =>
  render(
    <MemoryRouter>
      <Addresses />
    </MemoryRouter>,
  )

describe('Cambodia address form', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.open = true
    }
    HTMLDialogElement.prototype.close = function close() {
      this.open = false
    }
    addressActionsMock.mockReturnValue({
      addresses: [],
      defaultAddress: undefined,
      isLoading: false,
      isRefreshing: false,
      error: undefined,
      refetch: vi.fn(),
      actionError: undefined,
      dismissActionError: vi.fn(),
      create: createMock,
      update: vi.fn(),
      makeDefault: vi.fn(),
      remove: vi.fn(),
      pendingIds: new Set(),
      isCreating: false,
    })
    createMock.mockResolvedValue(undefined)
    fetchLocationsMock.mockResolvedValue([
      {
        pcode: 'KH12',
        parentPcode: null,
        adminLevel: 1,
        nameEn: 'Phnom Penh',
        nameKm: null,
      },
    ])
  })

  afterEach(cleanup)

  it('loads province options and submits the selected P-code with exact free-text fields', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Add your first address' }))
    const form = within(screen.getByRole('dialog', { name: 'Add an address' }))

    fireEvent.change(form.getByLabelText('Label', { exact: false }), { target: { value: 'Home' } })
    fireEvent.change(form.getByLabelText('Recipient name', { exact: false }), { target: { value: 'Sophea' } })
    fireEvent.change(form.getByLabelText('Phone', { exact: false }), { target: { value: '+85512345678' } })
    fireEvent.change(form.getByLabelText('Street address', { exact: false }), { target: { value: 'Street 1' } })

    const province = form.getByLabelText('Province / municipality', { exact: false })
    await screen.findByRole('option', { name: 'Phnom Penh' })
    fireEvent.change(province, { target: { value: 'KH12' } })

    fireEvent.change(form.getByLabelText('District / Khan', { exact: false }), {
      target: { value: 'Khan Chamkar Mon' },
    })
    fireEvent.change(form.getByLabelText('Commune / Sangkat', { exact: false }), {
      target: { value: 'ស្រះចក' },
    })

    fireEvent.click(form.getByRole('button', { name: 'Add address' }))

    await waitFor(() => expect(createMock).toHaveBeenCalledOnce())
    expect(fetchLocationsMock).toHaveBeenCalledOnce()
    expect(fetchLocationsMock).toHaveBeenCalledWith(undefined, expect.any(AbortSignal))
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'Home',
        recipientName: 'Sophea',
        phone: '+85512345678',
        addressLine1: 'Street 1',
        countryCode: 'KH',
        administrativeLocationPcode: 'KH12',
        district: 'Khan Chamkar Mon',
        commune: 'ស្រះចក',
      }),
    )
    expect(createMock.mock.calls[0][0]).not.toHaveProperty('city')
    expect(createMock.mock.calls[0][0]).not.toHaveProperty('stateProvince')
  })
})
