import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api/errors'
import type { AdminUserRecord, DeliveryStaff } from '@/types/api'
import DeliveryStaffManagement from './DeliveryStaffManagement'
import { createDeliveryStaff } from './api'
import { fetchActiveDeliveryStaff } from '@/features/delivery/api'

const feedback = vi.hoisted(() => ({ showFeedback: vi.fn() }))

vi.mock('@/context/feedbackContext', () => ({
  useFeedback: () => feedback,
}))

vi.mock('./api', () => ({
  createDeliveryStaff: vi.fn(),
}))

vi.mock('@/features/delivery/api', () => ({
  fetchActiveDeliveryStaff: vi.fn(),
}))

const staffMember: DeliveryStaff = {
  id: 'staff-id',
  firstName: 'Ada',
  lastName: 'Courier',
  email: 'ada@example.test',
}

const createdUser: AdminUserRecord = {
  ...staffMember,
  phone: null,
  status: 'ACTIVE',
  role: 'DELIVERY_STAFF',
  emailVerifiedAt: null,
  lastLoginAt: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
}

const fetchMock = vi.mocked(fetchActiveDeliveryStaff)
const createMock = vi.mocked(createDeliveryStaff)

beforeEach(() => {
  fetchMock.mockReset()
  createMock.mockReset()
  feedback.showFeedback.mockReset()
})

afterEach(cleanup)

describe('DeliveryStaffManagement', () => {
  it('lists active staff and offers no role selector', async () => {
    fetchMock.mockResolvedValue([staffMember])
    render(<DeliveryStaffManagement />)

    expect(await screen.findByText('Ada Courier')).toBeTruthy()
    expect(screen.getByText('ada@example.test')).toBeTruthy()
    expect(screen.queryByLabelText(/role/i)).toBeNull()
  })

  it('shows loading state while the staff list is loading', () => {
    fetchMock.mockImplementation(() => new Promise(() => {}))
    render(<DeliveryStaffManagement />)

    expect(screen.getByLabelText('Loading active delivery staff')).toBeTruthy()
  })

  it('validates required fields before making a request', async () => {
    fetchMock.mockResolvedValue([])
    render(<DeliveryStaffManagement />)

    fireEvent.click(
      await screen.findByRole('button', { name: 'Create staff account' }),
    )

    expect(screen.getAllByText('Enter at least 2 characters.')).toHaveLength(2)
    expect(screen.getByText('Enter an email address.')).toBeTruthy()
    expect(screen.getByText('Use at least 8 characters.')).toBeTruthy()
    expect(createMock).not.toHaveBeenCalled()
  })

  it('creates staff, reports success, and refreshes the active staff list', async () => {
    fetchMock.mockResolvedValueOnce([]).mockResolvedValue([staffMember])
    createMock.mockResolvedValue(createdUser)
    render(<DeliveryStaffManagement />)

    fireEvent.change(await screen.findByLabelText(/^First name/), {
      target: { value: 'Ada' },
    })
    fireEvent.change(screen.getByLabelText(/^Last name/), {
      target: { value: 'Courier' },
    })
    fireEvent.change(screen.getByLabelText(/^Email/), {
      target: { value: 'ada@example.test' },
    })
    fireEvent.change(screen.getByLabelText(/^Temporary password/), {
      target: { value: 'a-secure-password' },
    })
    fireEvent.change(screen.getByLabelText('Phone (optional)'), {
      target: { value: '+15555550100' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create staff account' }))

    await waitFor(() =>
      expect(createMock).toHaveBeenCalledWith({
        firstName: 'Ada',
        lastName: 'Courier',
        email: 'ada@example.test',
        password: 'a-secure-password',
        phone: '+15555550100',
      }),
    )
    expect(await screen.findByText(/is active delivery staff/i)).toBeTruthy()
    expect(await screen.findByText('Ada Courier')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(feedback.showFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success', title: 'Delivery staff created' }),
    )
  })

  it('shows duplicate-email API errors', async () => {
    fetchMock.mockResolvedValue([])
    createMock.mockRejectedValue(
      new ApiError('A user with this email already exists', {
        kind: 'conflict',
        status: 409,
      }),
    )
    render(<DeliveryStaffManagement />)

    fireEvent.change(await screen.findByLabelText(/^First name/), {
      target: { value: 'Ada' },
    })
    fireEvent.change(screen.getByLabelText(/^Last name/), {
      target: { value: 'Courier' },
    })
    fireEvent.change(screen.getByLabelText(/^Email/), {
      target: { value: 'ada@example.test' },
    })
    fireEvent.change(screen.getByLabelText(/^Temporary password/), {
      target: { value: 'a-secure-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create staff account' }))

    expect(
      await screen.findByText('A user with this email already exists'),
    ).toBeTruthy()
  })

  it('disables submission and announces the pending creation', async () => {
    fetchMock.mockResolvedValue([])
    let finishCreate: ((result: AdminUserRecord) => void) | undefined
    createMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishCreate = resolve
        }),
    )
    render(<DeliveryStaffManagement />)

    fireEvent.change(await screen.findByLabelText(/^First name/), {
      target: { value: 'Ada' },
    })
    fireEvent.change(screen.getByLabelText(/^Last name/), {
      target: { value: 'Courier' },
    })
    fireEvent.change(screen.getByLabelText(/^Email/), {
      target: { value: 'ada@example.test' },
    })
    fireEvent.change(screen.getByLabelText(/^Temporary password/), {
      target: { value: 'a-secure-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create staff account' }))

    const pending = screen.getByRole('button', { name: 'Creating…' })
    expect((pending as HTMLButtonElement).disabled).toBe(true)
    finishCreate?.(createdUser)
    await screen.findByText(/is active delivery staff/i)
  })
})
