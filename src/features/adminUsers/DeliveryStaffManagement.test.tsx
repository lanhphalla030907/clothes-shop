import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AdminUserPage, AdminUserRecord } from '@/types/api'
import DeliveryStaffManagement from './DeliveryStaffManagement'
import { createDeliveryStaff, fetchAdminUsers } from './api'

const feedback = vi.hoisted(() => ({ showFeedback: vi.fn() }))
vi.mock('@/context/feedbackContext', () => ({ useFeedback: () => feedback }))
vi.mock('./api', () => ({ createDeliveryStaff: vi.fn(), fetchAdminUsers: vi.fn() }))

const staff: AdminUserRecord = {
  id: 'staff-id', firstName: 'Ada', lastName: 'Courier', email: 'ada@example.test', phone: null,
  status: 'INACTIVE', role: 'DELIVERY_STAFF', emailVerifiedAt: null, lastLoginAt: null,
  createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z',
}
const page: AdminUserPage = { items: [staff], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } }
const fetchMock = vi.mocked(fetchAdminUsers)
const createMock = vi.mocked(createDeliveryStaff)

beforeEach(() => {
  fetchMock.mockReset(); createMock.mockReset(); feedback.showFeedback.mockReset()
  fetchMock.mockResolvedValue(page)
})
afterEach(cleanup)

describe('DeliveryStaffManagement', () => {
  it('lists delivery staff account status without rendering role controls', async () => {
    render(<DeliveryStaffManagement />)
    expect(await screen.findByText('Ada Courier')).toBeTruthy()
    expect(screen.getByText('INACTIVE')).toBeTruthy()
    expect(screen.queryByText('User roles')).toBeNull()
    expect(fetchMock).toHaveBeenCalledWith({ page: 1, limit: 10, role: 'DELIVERY_STAFF' }, expect.any(AbortSignal))
  })

  it('shows loading state while accounts are loading', () => {
    fetchMock.mockImplementation(() => new Promise(() => {}))
    render(<DeliveryStaffManagement />)
    expect(screen.getByLabelText('Loading delivery staff')).toBeTruthy()
  })

  it('validates required fields before creating an account', async () => {
    render(<DeliveryStaffManagement />)
    fireEvent.click(await screen.findByRole('button', { name: 'Create staff account' }))
    expect(screen.getAllByText('Enter at least 2 characters.')).toHaveLength(2)
    expect(createMock).not.toHaveBeenCalled()
  })

  it('creates active delivery staff and refreshes the account list', async () => {
    const created = { ...staff, status: 'ACTIVE' }
    createMock.mockResolvedValue(created)
    render(<DeliveryStaffManagement />)
    fireEvent.change(await screen.findByLabelText(/^First name/), { target: { value: 'Ada' } })
    fireEvent.change(screen.getByLabelText(/^Last name/), { target: { value: 'Courier' } })
    fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: 'ada@example.test' } })
    fireEvent.change(screen.getByLabelText(/^Temporary password/), { target: { value: 'a-secure-password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create staff account' }))
    await waitFor(() => expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ email: 'ada@example.test' })))
    expect(await screen.findByText(/is active delivery staff/i)).toBeTruthy()
    expect(feedback.showFeedback).toHaveBeenCalledWith(expect.objectContaining({ title: 'Delivery staff created' }))
  })
})
