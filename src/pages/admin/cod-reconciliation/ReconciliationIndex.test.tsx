import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ApiError } from '@/lib/api/errors'
import type {
  AdminCodReconciliationRun,
  AdminCodReconciliationRunHistory,
} from '@/types/api'
import {
  fetchAdminCodReconciliationRuns,
  triggerAdminCodReconciliation,
} from '@/features/adminCodReconciliation/api'
import ReconciliationIndex from './ReconciliationIndex'

const feedback = vi.hoisted(() => ({ showFeedback: vi.fn() }))

vi.mock('@/context/feedbackContext', () => ({
  useFeedback: () => feedback,
}))

vi.mock('@/features/adminCodReconciliation/api', () => ({
  fetchAdminCodReconciliationRuns: vi.fn(),
  triggerAdminCodReconciliation: vi.fn(),
}))

const run: AdminCodReconciliationRun = {
  id: 'run-1',
  triggerType: 'manual',
  status: 'completed',
  windowStart: '2026-10-01T00:00:00.000Z',
  windowEnd: '2026-10-02T00:00:00.000Z',
  processedCount: 2,
  matchedCount: 1,
  discrepancyCount: 1,
  uncollectedCount: 1,
  errorMessage: null,
  startedAt: '2026-10-02T01:00:00.000Z',
  completedAt: '2026-10-02T01:01:00.000Z',
  createdAt: '2026-10-02T01:00:00.000Z',
}

const history: AdminCodReconciliationRunHistory = {
  items: [run],
  page: 1,
  limit: 20,
  total: 1,
  totalPages: 1,
}

const fetchMock = vi.mocked(fetchAdminCodReconciliationRuns)
const triggerMock = vi.mocked(triggerAdminCodReconciliation)

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue(history)
  triggerMock.mockReset()
  feedback.showFeedback.mockReset()
})

afterEach(cleanup)

describe('Admin COD reconciliation dashboard', () => {
  it('renders real run history and labels page-derived statistics accurately', async () => {
    render(
      <MemoryRouter>
        <ReconciliationIndex />
      </MemoryRouter>,
    )

    expect(await screen.findAllByText('run-1')).toHaveLength(1)
    expect(screen.getByText('Runs matching filters')).toBeTruthy()
    expect(screen.getByText('Completed on this page')).toBeTruthy()
    expect(screen.getByText('Failed on this page')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledWith(
      { page: 1, limit: 20, status: undefined, triggerType: undefined, startDate: undefined, endDate: undefined },
      expect.any(AbortSignal),
    )
  })

  it('shows an empty state and allows retry after a load error', async () => {
    fetchMock.mockRejectedValueOnce(new ApiError('Unavailable', { kind: 'network' }))
    render(
      <MemoryRouter>
        <ReconciliationIndex />
      </MemoryRouter>,
    )

    expect(await screen.findByText(/could not reach the studio/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findAllByText('run-1')).toHaveLength(1)
  })

  it('submits a UTC date, shows success feedback, and refreshes history', async () => {
    triggerMock.mockResolvedValue({
      run,
      counters: {
        processedCount: 2,
        matchedCount: 1,
        discrepancyCount: 1,
        uncollectedCount: 1,
      },
      discrepancyBreakdown: {
        missingCollections: 1,
        amountMismatches: 0,
        currencyMismatches: 0,
      },
    })
    render(
      <MemoryRouter>
        <ReconciliationIndex />
      </MemoryRouter>,
    )

    await screen.findAllByText('run-1')
    const dateInput = screen.getByLabelText(/UTC date/) as HTMLInputElement
    fireEvent.change(dateInput, { target: { value: '2026-10-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Run reconciliation' }))

    await waitFor(() =>
      expect(triggerMock).toHaveBeenCalledWith({ date: '2026-10-01' }),
    )
    expect(feedback.showFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success', title: 'Reconciliation completed' }),
    )
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
  })

  it('submits an explicit half-open UTC window', async () => {
    triggerMock.mockResolvedValue({
      run,
      counters: {
        processedCount: 2,
        matchedCount: 1,
        discrepancyCount: 1,
        uncollectedCount: 1,
      },
      discrepancyBreakdown: {
        missingCollections: 1,
        amountMismatches: 0,
        currencyMismatches: 0,
      },
    })
    render(
      <MemoryRouter>
        <ReconciliationIndex />
      </MemoryRouter>,
    )

    await screen.findAllByText('run-1')
    fireEvent.click(screen.getByLabelText('Custom UTC window'))
    fireEvent.change(screen.getByLabelText(/Window start \(UTC\)/), {
      target: { value: '2026-10-01' },
    })
    fireEvent.change(screen.getByLabelText(/Window end \(UTC, exclusive\)/), {
      target: { value: '2026-10-04' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Run reconciliation' }))

    await waitFor(() =>
      expect(triggerMock).toHaveBeenCalledWith({
        windowStart: '2026-10-01T00:00:00.000Z',
        windowEnd: '2026-10-04T00:00:00.000Z',
      }),
    )
  })

  it('shows a useful duplicate conflict without treating it as success', async () => {
    triggerMock.mockRejectedValue(
      new ApiError('A reconciliation run already exists for the requested window', {
        kind: 'conflict',
        status: 409,
      }),
    )
    render(
      <MemoryRouter>
        <ReconciliationIndex />
      </MemoryRouter>,
    )

    await screen.findAllByText('run-1')
    fireEvent.click(screen.getByRole('button', { name: 'Run reconciliation' }))

    expect(
      await screen.findByText('A reconciliation run already exists for the requested window'),
    ).toBeTruthy()
    expect(feedback.showFeedback).not.toHaveBeenCalled()
  })

  it('validates explicit windows before calling the API', async () => {
    render(
      <MemoryRouter>
        <ReconciliationIndex />
      </MemoryRouter>,
    )

    await screen.findAllByText('run-1')
    fireEvent.click(screen.getByLabelText('Custom UTC window'))
    fireEvent.change(screen.getByLabelText(/Window start \(UTC\)/), {
      target: { value: '2026-10-05' },
    })
    fireEvent.change(screen.getByLabelText(/Window end \(UTC, exclusive\)/), {
      target: { value: '2026-10-04' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Run reconciliation' }))

    expect(await screen.findByText(/exclusive end after the start/i)).toBeTruthy()
    expect(triggerMock).not.toHaveBeenCalled()
  })
})
