import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AdminUserPage, AdminUserRecord } from '@/types/api'
import UserRolesManagement from './UserRolesManagement'
import { changeUserRole, changeUserStatus, fetchAdminUsers } from './api'

const feedback = vi.hoisted(() => ({ showFeedback: vi.fn(), confirmFeedback: vi.fn() }))
vi.mock('@/context/feedbackContext', () => ({ useFeedback: () => feedback }))
vi.mock('./api', () => ({ changeUserRole: vi.fn(), changeUserStatus: vi.fn(), fetchAdminUsers: vi.fn() }))
vi.mock('@/components/account/Modal', () => ({ Modal: ({ children, footer }: { children: ReactNode, footer?: ReactNode }) => <div role="dialog">{children}{footer}</div> }))

const user: AdminUserRecord = {
  id: 'user-id', firstName: 'Grace', lastName: 'Hopper', email: 'grace@example.test', phone: null,
  status: 'ACTIVE', role: 'CUSTOMER', emailVerifiedAt: null, lastLoginAt: null,
  createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z',
}
const firstPage: AdminUserPage = { items: [user], pagination: { page: 1, limit: 10, total: 11, totalPages: 2 } }
const secondPage: AdminUserPage = { items: [{ ...user, id: 'user-2', firstName: 'Ada' }], pagination: { page: 2, limit: 10, total: 11, totalPages: 2 } }
const fetchMock = vi.mocked(fetchAdminUsers)
const statusMock = vi.mocked(changeUserStatus)
const roleMock = vi.mocked(changeUserRole)

beforeEach(() => {
  fetchMock.mockReset(); statusMock.mockReset(); roleMock.mockReset(); feedback.showFeedback.mockReset(); feedback.confirmFeedback.mockReset()
  feedback.confirmFeedback.mockResolvedValue(true)
  fetchMock.mockResolvedValueOnce(firstPage).mockResolvedValue(secondPage)
})
afterEach(cleanup)

describe('UserRolesManagement', () => {
  it('requests 10 users at a time and advances pages server-side', async () => {
    render(<UserRolesManagement />)
    expect(await screen.findByText('Grace Hopper')).toBeTruthy()
    expect(screen.getByText('11 users · 2 pages · Page 1')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText('Ada Hopper')).toBeTruthy()
    expect(fetchMock).toHaveBeenLastCalledWith({ page: 2, limit: 10 }, expect.any(AbortSignal))
  })

  it('confirms deactivation before changing account status', async () => {
    statusMock.mockResolvedValue({ ...user, status: 'INACTIVE' })
    render(<UserRolesManagement />)
    fireEvent.click(await screen.findByRole('button', { name: 'Deactivate' }))
    await waitFor(() => expect(feedback.confirmFeedback).toHaveBeenCalledWith(expect.objectContaining({ title: 'Deactivate account?' })))
    await waitFor(() => expect(statusMock).toHaveBeenCalledWith('user-id', 'INACTIVE'))
  })

  it('keeps the current page when a role is updated', async () => {
    roleMock.mockResolvedValue({ ...secondPage.items[0], role: 'ADMIN' })
    render(<UserRolesManagement />)
    fireEvent.click(await screen.findByRole('button', { name: 'Next' }))
    await screen.findByText('Ada Hopper')
    fireEvent.click(screen.getByRole('button', { name: 'Change role' }))
    fireEvent.change(screen.getByLabelText('New role'), { target: { value: 'ADMIN' } })
    fireEvent.click(screen.getByRole('button', { name: 'Review change' }))
    await waitFor(() => expect(roleMock).toHaveBeenCalledWith('user-2', 'ADMIN'))
    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith({ page: 2, limit: 10 }, expect.any(AbortSignal)))
  })
})
