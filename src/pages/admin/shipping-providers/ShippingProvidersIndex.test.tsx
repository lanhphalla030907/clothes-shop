import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api/errors'
import type { ShippingProvider } from '@/types/api'
import {
  createShippingProvider,
  fetchAdminShippingProviders,
  updateShippingProvider,
} from '@/features/shippingProviders/api'
import ShippingProvidersIndex from './ShippingProvidersIndex'

const feedback = vi.hoisted(() => ({
  showFeedback: vi.fn(),
  confirmFeedback: vi.fn(),
}))

vi.mock('@/context/feedbackContext', () => ({
  useFeedback: () => feedback,
}))

vi.mock('@/features/shippingProviders/api', () => ({
  createShippingProvider: vi.fn(),
  fetchAdminShippingProviders: vi.fn(),
  updateShippingProvider: vi.fn(),
}))

vi.mock('@/components/account/Modal', () => ({
  Modal: ({
    title,
    children,
    footer,
  }: {
    title: string
    children: React.ReactNode
    footer?: React.ReactNode
  }) => (
    <div role="dialog" aria-label={title}>
      {children}
      {footer}
    </div>
  ),
}))

const activeProvider: ShippingProvider = {
  id: 'provider-1',
  code: 'JT-EXPRESS',
  name: 'J&T Express',
  description: 'Local parcel service',
  baseFee: '2.50',
  isActive: true,
  supportsCod: true,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
}

const inactiveProvider: ShippingProvider = {
  ...activeProvider,
  id: 'provider-2',
  code: 'VIRAK-BUNTHAM',
  name: 'Virak Buntham',
  isActive: false,
  supportsCod: false,
}

const fetchMock = vi.mocked(fetchAdminShippingProviders)
const createMock = vi.mocked(createShippingProvider)
const updateMock = vi.mocked(updateShippingProvider)

beforeEach(() => {
  fetchMock.mockReset()
  createMock.mockReset()
  updateMock.mockReset()
  feedback.showFeedback.mockReset()
  feedback.confirmFeedback.mockReset()
  feedback.confirmFeedback.mockResolvedValue(true)
})

afterEach(cleanup)

describe('ShippingProvidersIndex', () => {
  it('loads active and inactive provider records from the API', async () => {
    fetchMock.mockResolvedValue([activeProvider, inactiveProvider])
    render(<ShippingProvidersIndex />)

    expect((await screen.findAllByText('J&T Express')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Virak Buntham').length).toBeGreaterThan(0)
    expect(screen.getAllByText('JT-EXPRESS').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Inactive').length).toBeGreaterThan(0)
  })

  it('shows loading and empty states', async () => {
    let resolveList: ((providers: ShippingProvider[]) => void) | undefined
    fetchMock.mockImplementation(
      () => new Promise((resolve) => { resolveList = resolve }),
    )
    render(<ShippingProvidersIndex />)

    expect(screen.getByLabelText('Loading shipping providers')).toBeTruthy()
    resolveList?.([])
    expect(await screen.findByText('No shipping providers configured')).toBeTruthy()
  })

  it('shows an API loading failure with a retry action', async () => {
    fetchMock.mockRejectedValue(
      new ApiError('Network unavailable', { kind: 'network' }),
    )
    render(<ShippingProvidersIndex />)

    expect(await screen.findByText(/could not reach the studio/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
  })

  it('validates required fields before creating a provider', async () => {
    fetchMock.mockResolvedValue([])
    render(<ShippingProvidersIndex />)
    fireEvent.click((await screen.findAllByRole('button', { name: 'New provider' }))[0])
    fireEvent.click(screen.getByRole('button', { name: 'Create provider' }))

    expect(await screen.findByText('A provider code is required')).toBeTruthy()
    expect(screen.getByText('A provider name is required')).toBeTruthy()
    expect(createMock).not.toHaveBeenCalled()
  })

  it('creates a provider and displays success feedback', async () => {
    fetchMock.mockResolvedValueOnce([]).mockResolvedValue([activeProvider])
    createMock.mockResolvedValue(activeProvider)
    render(<ShippingProvidersIndex />)
    fireEvent.click((await screen.findAllByRole('button', { name: 'New provider' }))[0])
    fireEvent.change(screen.getByLabelText(/Provider code/), {
      target: { value: ' jt-express ' },
    })
    fireEvent.change(screen.getByLabelText(/Provider name/), {
      target: { value: 'J&T Express' },
    })
    fireEvent.change(screen.getByLabelText(/Base shipping fee \(USD\)/), {
      target: { value: '2.5' },
    })
    fireEvent.click(screen.getByLabelText(/Supports Cash on Delivery/))
    fireEvent.click(screen.getByRole('button', { name: 'Create provider' }))

    await waitFor(() =>
      expect(createMock).toHaveBeenCalledWith({
        code: 'JT-EXPRESS',
        name: 'J&T Express',
        baseFee: '2.50',
        supportsCod: true,
      }),
    )
    expect((await screen.findAllByText('J&T Express')).length).toBeGreaterThan(0)
    expect(feedback.showFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success', title: 'Shipping provider created' }),
    )
  })

  it('shows duplicate code errors from the server', async () => {
    fetchMock.mockResolvedValue([])
    createMock.mockRejectedValue(
      new ApiError('A shipping provider with this code already exists', {
        kind: 'conflict',
        status: 409,
      }),
    )
    render(<ShippingProvidersIndex />)
    fireEvent.click((await screen.findAllByRole('button', { name: 'New provider' }))[0])
    fireEvent.change(screen.getByLabelText(/Provider code/), {
      target: { value: 'JT-EXPRESS' },
    })
    fireEvent.change(screen.getByLabelText(/Provider name/), {
      target: { value: 'J&T Express' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create provider' }))

    expect(
      await screen.findByText('A shipping provider with this code already exists'),
    ).toBeTruthy()
  })

  it('edits provider data and refreshes the list', async () => {
    fetchMock.mockResolvedValue([activeProvider])
    updateMock.mockResolvedValue({ ...activeProvider, baseFee: '3.00' })
    render(<ShippingProvidersIndex />)
    fireEvent.click((await screen.findAllByRole('button', { name: 'Edit J&T Express' }))[0])
    fireEvent.change(screen.getByLabelText(/Base shipping fee \(USD\)/), {
      target: { value: '3' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() =>
      expect(updateMock).toHaveBeenCalledWith('provider-1', { baseFee: '3.00' }),
    )
    expect(feedback.showFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Shipping provider updated' }),
    )
  })

  it('requires confirmation before deactivating and updates activation state', async () => {
    fetchMock.mockResolvedValue([activeProvider])
    updateMock.mockResolvedValue({ ...activeProvider, isActive: false })
    render(<ShippingProvidersIndex />)
    fireEvent.click((await screen.findAllByRole('button', { name: 'Deactivate' }))[0])

    await waitFor(() => expect(feedback.confirmFeedback).toHaveBeenCalled())
    await waitFor(() =>
      expect(updateMock).toHaveBeenCalledWith('provider-1', { isActive: false }),
    )
  })
})
