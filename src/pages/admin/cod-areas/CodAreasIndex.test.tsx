import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api/errors'
import type { CodArea } from '@/types/api'
import {
  createCodArea,
  fetchAdminCodAreas,
  updateCodArea,
} from '@/features/codAreas/api'
import CodAreasIndex from './CodAreasIndex'

const feedback = vi.hoisted(() => ({
  showFeedback: vi.fn(),
  confirmFeedback: vi.fn(),
}))

vi.mock('@/context/feedbackContext', () => ({
  useFeedback: () => feedback,
}))

vi.mock('@/features/codAreas/api', () => ({
  createCodArea: vi.fn(),
  fetchAdminCodAreas: vi.fn(),
  updateCodArea: vi.fn(),
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

const phnomPenh: CodArea = {
  id: 'area-1',
  code: 'PHNOM-PENH',
  name: 'Phnom Penh',
  codEnabled: true,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
}

const battambang: CodArea = {
  ...phnomPenh,
  id: 'area-2',
  code: 'BATTAMBANG',
  name: 'Battambang',
  codEnabled: false,
}

const fetchMock = vi.mocked(fetchAdminCodAreas)
const createMock = vi.mocked(createCodArea)
const updateMock = vi.mocked(updateCodArea)

beforeEach(() => {
  fetchMock.mockReset()
  createMock.mockReset()
  updateMock.mockReset()
  feedback.showFeedback.mockReset()
  feedback.confirmFeedback.mockReset()
  feedback.confirmFeedback.mockResolvedValue(true)
})

afterEach(cleanup)

describe('CodAreasIndex', () => {
  it('loads all configured areas and their COD states', async () => {
    fetchMock.mockResolvedValue([phnomPenh, battambang])
    render(<CodAreasIndex />)

    expect((await screen.findAllByText('Phnom Penh')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('BATTAMBANG').length).toBeGreaterThan(0)
    expect(screen.getAllByText('COD enabled').length).toBeGreaterThan(0)
    expect(screen.getAllByText('COD disabled').length).toBeGreaterThan(0)
  })

  it('shows loading and empty states', async () => {
    let resolveList: ((areas: CodArea[]) => void) | undefined
    fetchMock.mockImplementation(() => new Promise((resolve) => { resolveList = resolve }))
    render(<CodAreasIndex />)

    expect(screen.getByLabelText('Loading COD areas')).toBeTruthy()
    resolveList?.([])
    expect(await screen.findByText('No COD areas configured')).toBeTruthy()
  })

  it('shows API load errors with retry', async () => {
    fetchMock.mockRejectedValue(new ApiError('Network unavailable', { kind: 'network' }))
    render(<CodAreasIndex />)

    expect(await screen.findByText(/could not reach the studio/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
  })

  it('validates required fields before creating an area', async () => {
    fetchMock.mockResolvedValue([])
    render(<CodAreasIndex />)
    fireEvent.click((await screen.findAllByRole('button', { name: 'New area' }))[0])
    fireEvent.click(screen.getByRole('button', { name: 'Create area' }))

    expect(await screen.findByText('An area code is required')).toBeTruthy()
    expect(screen.getByText('An area name is required')).toBeTruthy()
    expect(createMock).not.toHaveBeenCalled()
  })

  it('creates an area and displays success feedback', async () => {
    fetchMock.mockResolvedValueOnce([]).mockResolvedValue([battambang])
    createMock.mockResolvedValue(battambang)
    render(<CodAreasIndex />)
    fireEvent.click((await screen.findAllByRole('button', { name: 'New area' }))[0])
    fireEvent.change(screen.getByLabelText(/Canonical area code/), {
      target: { value: ' battambang ' },
    })
    fireEvent.change(screen.getByLabelText(/Area name/), {
      target: { value: 'Battambang' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create area' }))

    await waitFor(() =>
      expect(createMock).toHaveBeenCalledWith({
        code: 'BATTAMBANG',
        name: 'Battambang',
      }),
    )
    expect(feedback.showFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success', title: 'COD area created' }),
    )
  })

  it('presents duplicate-code conflicts from the API', async () => {
    fetchMock.mockResolvedValue([])
    createMock.mockRejectedValue(
      new ApiError('A COD area with this code already exists', {
        kind: 'conflict',
        status: 409,
      }),
    )
    render(<CodAreasIndex />)
    fireEvent.click((await screen.findAllByRole('button', { name: 'New area' }))[0])
    fireEvent.change(screen.getByLabelText(/Canonical area code/), {
      target: { value: 'PHNOM-PENH' },
    })
    fireEvent.change(screen.getByLabelText(/Area name/), {
      target: { value: 'Phnom Penh' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create area' }))

    expect(await screen.findByText('A COD area with this code already exists')).toBeTruthy()
  })

  it('edits an area name and updates the list', async () => {
    fetchMock.mockResolvedValue([phnomPenh])
    updateMock.mockResolvedValue({ ...phnomPenh, name: 'Phnom Penh Capital' })
    render(<CodAreasIndex />)
    fireEvent.click((await screen.findAllByRole('button', { name: 'Edit Phnom Penh' }))[0])
    fireEvent.change(screen.getByLabelText(/Area name/), {
      target: { value: 'Phnom Penh Capital' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() =>
      expect(updateMock).toHaveBeenCalledWith('area-1', { name: 'Phnom Penh Capital' }),
    )
    expect(feedback.showFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'COD area updated' }),
    )
  })

  it('enables COD without a confirmation prompt', async () => {
    fetchMock.mockResolvedValue([battambang])
    updateMock.mockResolvedValue({ ...battambang, codEnabled: true })
    render(<CodAreasIndex />)
    fireEvent.click((await screen.findAllByRole('button', { name: 'Enable COD for Battambang' }))[0])

    await waitFor(() => expect(updateMock).toHaveBeenCalledWith('area-2', { codEnabled: true }))
    expect(feedback.confirmFeedback).not.toHaveBeenCalled()
  })

  it('confirms before disabling COD', async () => {
    fetchMock.mockResolvedValue([phnomPenh])
    updateMock.mockResolvedValue({ ...phnomPenh, codEnabled: false })
    render(<CodAreasIndex />)
    fireEvent.click((await screen.findAllByRole('button', { name: 'Disable COD for Phnom Penh' }))[0])

    await waitFor(() => expect(feedback.confirmFeedback).toHaveBeenCalled())
    await waitFor(() => expect(updateMock).toHaveBeenCalledWith('area-1', { codEnabled: false }))
  })
})
