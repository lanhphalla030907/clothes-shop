import type { ReactNode } from 'react'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PostersIndex from './PostersIndex'
import {
  createAdminPoster,
  deleteAdminPoster,
  fetchAdminPosters,
  replaceAdminPosterImage,
  updateAdminPoster,
} from '@/features/adminPosters/api'
import { FeedbackProvider } from '@/context/FeedbackProvider'
import type { Poster } from '@/types/api'

vi.mock('@/features/adminPosters/api', () => ({
  fetchAdminPosters: vi.fn(),
  createAdminPoster: vi.fn(),
  updateAdminPoster: vi.fn(),
  replaceAdminPosterImage: vi.fn(),
  deleteAdminPoster: vi.fn(),
}))

vi.mock('@/components/account/Modal', () => ({
  Modal: ({
    title,
    children,
    footer,
  }: {
    title: string
    children: ReactNode
    footer?: ReactNode
  }) => (
    <div role="dialog" aria-label={title}>
      {children}
      {footer}
    </div>
  ),
}))

const fetchMock = vi.mocked(fetchAdminPosters)
const createMock = vi.mocked(createAdminPoster)
const updateMock = vi.mocked(updateAdminPoster)
const deleteMock = vi.mocked(deleteAdminPoster)
const replaceMock = vi.mocked(replaceAdminPosterImage)

const poster = (overrides: Partial<Poster> = {}): Poster => ({
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Spring campaign',
  imageUrl: 'https://example.com/spring.jpg',
  publicId: 'posters/spring',
  isActive: true,
  displayOrder: 0,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  ...overrides,
})

const renderPage = () =>
  render(
    <MemoryRouter>
      <FeedbackProvider>
        <PostersIndex />
      </FeedbackProvider>
    </MemoryRouter>,
  )

beforeEach(() => {
  vi.clearAllMocks()
  // jsdom does not implement the native <dialog> methods used by FeedbackProvider.
  HTMLDialogElement.prototype.showModal = vi.fn()
  HTMLDialogElement.prototype.close = vi.fn()
  fetchMock.mockResolvedValue([poster()])
  updateMock.mockImplementation(async (id, body) => ({
    ...poster(),
    ...body,
    id,
  }))
  createMock.mockResolvedValue(poster())
  deleteMock.mockResolvedValue(undefined)
  replaceMock.mockResolvedValue(poster())
})

afterEach(cleanup)

describe('Poster management', () => {
  it('renders uploaded posters with their image preview and active state', async () => {
    renderPage()

    expect(await screen.findByText('Spring campaign')).toBeTruthy()
    expect(screen.getByAltText('Spring campaign').getAttribute('src')).toBe(
      'https://example.com/spring.jpg',
    )
    expect(screen.getByText('Active')).toBeTruthy()
    expect(screen.getByText('1 poster · 1 active')).toBeTruthy()
  })

  it('shows the empty carousel state when there are no posters', async () => {
    fetchMock.mockResolvedValue([])

    renderPage()

    expect(await screen.findByText('The homepage carousel is empty')).toBeTruthy()
  })

  it('surfaces a failed list read with a retry action', async () => {
    fetchMock.mockRejectedValue(new Error('offline'))

    renderPage()

    expect(await screen.findByText('Something went wrong')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
  })

  it('deactivates a poster through the metadata route', async () => {
    renderPage()

    await screen.findByText('Spring campaign')
    fireEvent.click(
      screen.getByRole('button', { name: 'Deactivate Spring campaign' }),
    )

    await waitFor(() =>
      expect(updateMock).toHaveBeenCalledWith(poster().id, { isActive: false }),
    )
  })

  it('uploads a poster as a multipart create with title and order', async () => {
    renderPage()

    await screen.findByText('Spring campaign')
    fireEvent.click(screen.getByRole('button', { name: 'Upload poster' }))

    const dialog = screen.getByRole('dialog', { name: 'Upload poster' })
    const file = new File(['image-bytes'], 'landscape.jpg', {
      type: 'image/jpeg',
    })

    fireEvent.change(within(dialog).getByLabelText(/Poster image/), {
      target: { files: [file] },
    })
    fireEvent.change(within(dialog).getByLabelText('Title'), {
      target: { value: 'Autumn campaign' },
    })
    fireEvent.change(within(dialog).getByLabelText('Display order'), {
      target: { value: '4' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Upload poster' }))

    await waitFor(() =>
      expect(createMock).toHaveBeenCalledWith({
        file,
        title: 'Autumn campaign',
        displayOrder: 4,
      }),
    )
  })

  it('deletes only after the confirmation dialog is accepted', async () => {
    renderPage()

    await screen.findByText('Spring campaign')
    fireEvent.click(screen.getByRole('button', { name: 'Delete Spring campaign' }))

    const dialog = screen.getByRole('dialog', { name: 'Delete this poster?' })
    expect(deleteMock).not.toHaveBeenCalled()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete poster' }))

    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith(poster().id))
  })

  it('replaces an image through the nested upload route', async () => {
    renderPage()

    await screen.findByText('Spring campaign')
    fireEvent.click(screen.getByRole('button', { name: 'Replace image' }))

    const dialog = screen.getByRole('dialog', { name: 'Replace poster image' })
    const file = new File(['replacement'], 'replacement.jpg', {
      type: 'image/jpeg',
    })

    fireEvent.change(within(dialog).getByLabelText(/New poster image/), {
      target: { files: [file] },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Replace image' }))

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith(poster().id, { file }),
    )
  })
})
