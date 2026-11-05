import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchAdminUser } from '@/features/adminUsers/api'
import type { AdminUserRecord } from '@/types/api'
import CustomerLookup from './CustomerLookup'

vi.mock('@/features/adminUsers/api', () => ({ fetchAdminUser: vi.fn() }))

const fetchAdminUserMock = vi.mocked(fetchAdminUser)

const record: AdminUserRecord = {
  id: '75a28c31-1124-4439-840a-48182a0fba7d',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  phone: null,
  status: 'ACTIVE',
  role: 'CUSTOMER',
  emailVerifiedAt: '2026-10-01T00:00:00.000Z',
  lastLoginAt: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-02T00:00:00.000Z',
}

const renderAt = (entry: string) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <CustomerLookup />
    </MemoryRouter>,
  )

beforeEach(() => {
  fetchAdminUserMock.mockReset()
})

afterEach(cleanup)

describe('CustomerLookup', () => {
  it('loads the one user record by the id in the query string', async () => {
    fetchAdminUserMock.mockResolvedValue(record)

    renderAt(`/admin/customers?id=${record.id}`)

    expect(await screen.findByRole('heading', { name: 'Ada Lovelace' })).toBeTruthy()
    expect(screen.getByText('ada@example.com')).toBeTruthy()
    expect(screen.getByText(record.id)).toBeTruthy()
    expect(fetchAdminUserMock).toHaveBeenCalledWith(record.id, expect.any(AbortSignal))
  })

  it('does not call the API for a malformed id', () => {
    renderAt('/admin/customers?id=not-a-uuid')

    expect(screen.getByText(/not a complete UUID/i)).toBeTruthy()
    expect(fetchAdminUserMock).not.toHaveBeenCalled()
  })

  it('shows the empty lookup state and never invents a customer list', () => {
    renderAt('/admin/customers')

    expect(screen.getByText('No customer loaded')).toBeTruthy()
    expect(screen.getByText(/no customer list or search endpoint/i)).toBeTruthy()
    expect(fetchAdminUserMock).not.toHaveBeenCalled()
  })
})
