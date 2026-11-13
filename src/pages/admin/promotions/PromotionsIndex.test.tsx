import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api/errors'
import type { Promotion, PromotionUsagePage } from '@/types/api'
import {
  activatePromotion,
  archivePromotion,
  createPromotion,
  fetchAdminPromotions,
  fetchPromotionUsages,
  pausePromotion,
  updatePromotion,
} from '@/features/promotions/api'
import {
  fromLocalDateTimeInput,
  toLocalDateTimeInput,
} from '@/features/promotions/form'
import PromotionsIndex from './PromotionsIndex'

const feedback = vi.hoisted(() => ({
  showFeedback: vi.fn(),
  confirmFeedback: vi.fn(),
}))

vi.mock('@/context/feedbackContext', () => ({
  useFeedback: () => feedback,
}))

vi.mock('@/features/promotions/api', () => ({
  fetchAdminPromotions: vi.fn(),
  createPromotion: vi.fn(),
  updatePromotion: vi.fn(),
  activatePromotion: vi.fn(),
  pausePromotion: vi.fn(),
  archivePromotion: vi.fn(),
  fetchPromotionUsages: vi.fn(),
}))

const fetchMock = vi.mocked(fetchAdminPromotions)
const createMock = vi.mocked(createPromotion)
const updateMock = vi.mocked(updatePromotion)
const activateMock = vi.mocked(activatePromotion)
const pauseMock = vi.mocked(pausePromotion)
const archiveMock = vi.mocked(archivePromotion)
const usagesMock = vi.mocked(fetchPromotionUsages)

const promotion = (overrides: Partial<Promotion> = {}): Promotion => ({
  id: '11111111-1111-4111-8111-111111111111',
  code: 'SAVE10',
  name: 'Save 10%',
  description: null,
  kind: 'COUPON',
  discountType: 'PERCENTAGE',
  percentOff: '10.00',
  amountOff: null,
  minSubtotal: '0.00',
  maxDiscount: null,
  startsAt: '2026-11-06T12:00:00.000Z',
  endsAt: null,
  isActive: true,
  usageLimitTotal: null,
  usageLimitPerUser: null,
  priority: 0,
  archivedAt: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  ...overrides,
})

const page = (items: Promotion[]) => ({
  items,
  pagination: { page: 1, limit: 20, total: items.length, totalPages: items.length > 0 ? 1 : 0 },
})

const usagePage = (): PromotionUsagePage => ({
  items: [
    {
      id: 'usage-1',
      promotionId: promotion().id,
      orderId: 'order-1',
      orderNumber: 'ORD-1',
      userId: 'user-1',
      user: {
        id: 'user-1',
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.test',
      },
      discountAmount: '5.00',
      subtotalAtUse: '50.00',
      createdAt: '2026-11-06T00:00:00.000Z',
    },
  ],
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
})

beforeEach(() => {
  // jsdom does not implement the native <dialog> methods used by Modal.
  // showModal must also set `open`, otherwise the dialog stays display:none and
  // role queries cannot see its contents.
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open')
  }

  fetchMock.mockReset()
  createMock.mockReset()
  updateMock.mockReset()
  activateMock.mockReset()
  pauseMock.mockReset()
  archiveMock.mockReset()
  usagesMock.mockReset()
  feedback.showFeedback.mockReset()
  feedback.confirmFeedback.mockReset()
  feedback.confirmFeedback.mockResolvedValue(true)

  // One implementation serves the list read and the three status-count reads,
  // which all share this endpoint.
  fetchMock.mockResolvedValue(page([promotion()]))
  createMock.mockResolvedValue(promotion())
  updateMock.mockResolvedValue(promotion())
  activateMock.mockResolvedValue(promotion({ isActive: true }))
  pauseMock.mockResolvedValue(promotion({ isActive: false }))
  archiveMock.mockResolvedValue(
    promotion({ isActive: false, archivedAt: '2026-11-06T12:00:00.000Z' }),
  )
  usagesMock.mockResolvedValue(usagePage())
})

afterEach(cleanup)

const openNewPromotion = async () => {
  fireEvent.click((await screen.findAllByRole('button', { name: 'New promotion' }))[0])
}

describe('PromotionsIndex', () => {
  it('loads the initial promotion list', async () => {
    render(<PromotionsIndex />)

    expect(await screen.findByText('Save 10%')).toBeTruthy()
    expect(screen.getByText('SAVE10')).toBeTruthy()
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 20, archived: false }),
      expect.any(AbortSignal),
    )
  })

  it('shows the loading state until the first response arrives', async () => {
    const resolvers: Array<(value: ReturnType<typeof page>) => void> = []
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvers.push(resolve)
        }),
    )

    render(<PromotionsIndex />)

    expect(screen.getByText('Loading promotions…')).toBeTruthy()
    resolvers.forEach((resolve) => resolve(page([promotion()])))
    expect(await screen.findByText('Save 10%')).toBeTruthy()
  })

  it('surfaces a failed list read with retry', async () => {
    fetchMock.mockRejectedValue(
      new ApiError('Network unavailable', { kind: 'network' }),
    )

    render(<PromotionsIndex />)

    expect(await screen.findByText('Something went wrong')).toBeTruthy()
    expect(screen.getByText(/could not reach the studio/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
  })

  it('creates a percentage promotion with the expected payload', async () => {
    render(<PromotionsIndex />)
    await openNewPromotion()

    fireEvent.change(screen.getByLabelText(/^Name/), {
      target: { value: 'Summer sale' },
    })
    fireEvent.change(screen.getByLabelText(/Coupon code/), {
      target: { value: ' summer10 ' },
    })
    fireEvent.change(screen.getByLabelText(/Percent off/), {
      target: { value: '10.00' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save promotion' }))

    await waitFor(() =>
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Summer sale',
          code: 'summer10',
          discountType: 'PERCENTAGE',
          percentOff: '10.00',
          amountOff: null,
        }),
      ),
    )
    expect(feedback.showFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success', title: 'Promotion updated' }),
    )
  })

  it('creates a fixed-amount promotion and clears the percentage', async () => {
    render(<PromotionsIndex />)
    await openNewPromotion()

    fireEvent.change(screen.getByLabelText(/^Name/), {
      target: { value: 'Five dollars off' },
    })
    fireEvent.change(screen.getByLabelText(/Coupon code/), {
      target: { value: 'SAVE5' },
    })
    fireEvent.change(screen.getByLabelText('Discount type'), {
      target: { value: 'FIXED_AMOUNT' },
    })
    fireEvent.change(screen.getByLabelText(/Amount off/), {
      target: { value: '5.00' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save promotion' }))

    await waitFor(() =>
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          discountType: 'FIXED_AMOUNT',
          percentOff: null,
          amountOff: '5.00',
        }),
      ),
    )
  })

  it('creates a free-shipping automatic promotion without discount fields', async () => {
    render(<PromotionsIndex />)
    await openNewPromotion()

    fireEvent.change(screen.getByLabelText(/^Name/), {
      target: { value: 'Free delivery' },
    })
    fireEvent.change(screen.getByLabelText('Promotion type'), {
      target: { value: 'AUTOMATIC' },
    })
    fireEvent.change(screen.getByLabelText('Discount type'), {
      target: { value: 'FREE_SHIPPING' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save promotion' }))

    await waitFor(() =>
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'AUTOMATIC',
          code: null,
          discountType: 'FREE_SHIPPING',
          percentOff: null,
          amountOff: null,
        }),
      ),
    )
  })

  it('edits a promotion without shifting its start time', async () => {
    const existing = promotion()
    render(<PromotionsIndex />)
    await screen.findByText('Save 10%')

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    const start = screen.getByLabelText('Start date') as HTMLInputElement
    expect(start.value).toBe(toLocalDateTimeInput(existing.startsAt))

    fireEvent.change(screen.getByLabelText(/^Name/), {
      target: { value: 'Save ten percent' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save promotion' }))

    await waitFor(() =>
      expect(updateMock).toHaveBeenCalledWith(
        existing.id,
        expect.objectContaining({
          name: 'Save ten percent',
          startsAt: fromLocalDateTimeInput(start.value),
        }),
      ),
    )
    expect(fromLocalDateTimeInput(start.value)).toBe(existing.startsAt)
  })

  it('pauses an active promotion', async () => {
    render(<PromotionsIndex />)
    await screen.findByText('Save 10%')

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))

    await waitFor(() => expect(pauseMock).toHaveBeenCalledWith(promotion().id))
    expect(feedback.showFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'The promotion was paused.' }),
    )
  })

  it('activates a paused promotion', async () => {
    fetchMock.mockResolvedValue(page([promotion({ isActive: false })]))
    render(<PromotionsIndex />)
    await screen.findByText('Save 10%')

    fireEvent.click(screen.getByRole('button', { name: 'Activate' }))

    await waitFor(() => expect(activateMock).toHaveBeenCalledWith(promotion().id))
    expect(feedback.showFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'The promotion is active.' }),
    )
  })

  it('archives only after the confirmation is accepted', async () => {
    render(<PromotionsIndex />)
    await screen.findByText('Save 10%')

    fireEvent.click(screen.getByRole('button', { name: 'Archive' }))

    expect(feedback.confirmFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Archive promotion?' }),
    )
    await waitFor(() => expect(archiveMock).toHaveBeenCalledWith(promotion().id))
  })

  it('does not archive when the confirmation is declined', async () => {
    feedback.confirmFeedback.mockResolvedValue(false)
    render(<PromotionsIndex />)
    await screen.findByText('Save 10%')

    fireEvent.click(screen.getByRole('button', { name: 'Archive' }))

    await waitFor(() => expect(feedback.confirmFeedback).toHaveBeenCalled())
    expect(archiveMock).not.toHaveBeenCalled()
  })

  it('loads promotion usage history', async () => {
    render(<PromotionsIndex />)
    await screen.findByText('Save 10%')

    fireEvent.click(screen.getByRole('button', { name: 'Usage' }))

    expect(await screen.findByText(/ORD-1/)).toBeTruthy()
    expect(screen.getByText(/ada@example.test/)).toBeTruthy()
    expect(usagesMock).toHaveBeenCalledWith(
      promotion().id,
      1,
      expect.any(AbortSignal),
    )
  })

  it('shows an API mutation error', async () => {
    createMock.mockRejectedValue(
      new ApiError('A promotion with this code already exists', {
        kind: 'conflict',
        status: 409,
      }),
    )
    render(<PromotionsIndex />)
    await openNewPromotion()

    fireEvent.change(screen.getByLabelText(/^Name/), {
      target: { value: 'Duplicate' },
    })
    fireEvent.change(screen.getByLabelText(/Coupon code/), {
      target: { value: 'SAVE10' },
    })
    fireEvent.change(screen.getByLabelText(/Percent off/), {
      target: { value: '10' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save promotion' }))

    expect(
      await screen.findByText('A promotion with this code already exists'),
    ).toBeTruthy()
    expect(feedback.showFeedback).not.toHaveBeenCalled()
  })

  it('rejects an invalid percentage before calling the API', async () => {
    render(<PromotionsIndex />)
    await openNewPromotion()

    fireEvent.change(screen.getByLabelText(/^Name/), {
      target: { value: 'Too much' },
    })
    fireEvent.change(screen.getByLabelText(/Coupon code/), {
      target: { value: 'TOOMUCH' },
    })
    fireEvent.change(screen.getByLabelText(/Percent off/), {
      target: { value: '150' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save promotion' }))

    expect(
      await screen.findByText('Enter a percentage greater than 0 and at most 100.'),
    ).toBeTruthy()
    expect(createMock).not.toHaveBeenCalled()
  })
})
