import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import {
  fetchAdminCodEligibility,
  updateAdminCodEligibility,
} from '@/features/locations/api'
import type { AdminCodEligibility } from '@/types/api'
import CodEligibilityIndex from './CodEligibilityIndex'

vi.mock('@/features/locations/api', () => ({
  fetchAdminCodEligibility: vi.fn(),
  updateAdminCodEligibility: vi.fn(),
}))

const fetchEligibilityMock = vi.mocked(fetchAdminCodEligibility)
const updateEligibilityMock = vi.mocked(updateAdminCodEligibility)

vi.mock('@/context/feedbackContext', () => ({
  useFeedback: () => ({
    showFeedback: vi.fn(),
    confirmFeedback: vi.fn().mockResolvedValue(true),
  }),
}))

const province: AdminCodEligibility = {
  pcode: 'KH12',
  parentPcode: null,
  adminLevel: 1,
  nameEn: 'Phnom Penh',
  nameKm: null,
  codEnabledOverride: null,
  codEnabled: false,
}

const district: AdminCodEligibility = {
  pcode: 'KH1201',
  parentPcode: 'KH12',
  adminLevel: 2,
  nameEn: 'Chamkar Mon',
  nameKm: null,
  codEnabledOverride: null,
  codEnabled: false,
}

const renderPage = () =>
  render(
    <MemoryRouter>
      <CodEligibilityIndex />
    </MemoryRouter>,
  )

describe('address-based COD eligibility admin page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchEligibilityMock.mockResolvedValue([province])
    updateEligibilityMock.mockResolvedValue({
      ...province,
      codEnabledOverride: true,
      codEnabled: true,
    })
  })

  afterEach(cleanup)

  it('loads province eligibility and enables a province with its stable code', async () => {
    fetchEligibilityMock
      .mockResolvedValueOnce([province])
      .mockResolvedValueOnce([{ ...province, codEnabledOverride: true, codEnabled: true }])

    renderPage()

    expect(await screen.findByText('Phnom Penh')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Enable' }))

    await waitFor(() => {
      expect(updateEligibilityMock).toHaveBeenCalledWith('KH12', {
        codEnabledOverride: true,
      })
    })
    expect(await screen.findByText(/Effective: COD enabled/)).toBeTruthy()
  })

  it('does not let subareas become eligible while the province is disabled', async () => {
    fetchEligibilityMock
      .mockResolvedValueOnce([province])
      .mockResolvedValueOnce([district])

    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Manage subareas for Phnom Penh' }))

    expect(await screen.findByText('Chamkar Mon')).toBeTruthy()
    expect(screen.getByText(/Enable the province before a subarea/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Enable' }).hasAttribute('disabled')).toBe(true)
  })
})
