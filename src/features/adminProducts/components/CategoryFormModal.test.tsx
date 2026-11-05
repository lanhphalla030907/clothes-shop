import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Category, CategoryFormValues } from '@/types/api'
import {
  removeAdminCategoryImage,
  uploadAdminCategoryImage,
} from '@/features/adminProducts/api'
import { CategoryFormModal } from './CategoryFormModal'

vi.mock('@/features/adminProducts/api', () => ({
  uploadAdminCategoryImage: vi.fn(),
  removeAdminCategoryImage: vi.fn(),
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

const uploadMock = vi.mocked(uploadAdminCategoryImage)
const removeMock = vi.mocked(removeAdminCategoryImage)

const category: Category = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Shirts',
  slug: 'shirts',
  description: null,
  parentId: null,
  isActive: true,
  imageUrl: 'https://example.com/shirts.jpg',
  publicId: 'categories/shirts',
  altText: 'Original alt text',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
}

const categories: Category[] = [category]

type RenderOptions = {
  isSaving?: boolean
  onSubmit?: (values: CategoryFormValues) => Promise<Category | undefined>
  onClose?: () => void
}

const renderModal = ({
  isSaving = false,
  onSubmit = vi.fn().mockResolvedValue(category),
  onClose = vi.fn(),
}: RenderOptions = {}) =>
  render(
    <CategoryFormModal
      category={category}
      categories={categories}
      isSaving={isSaving}
      serverError={undefined}
      onClose={onClose}
      onSubmit={onSubmit}
    />,
  )

const saveButton = () =>
  screen.getByRole('button', {
    name: /^(Save changes|Saving)$/,
  }) as HTMLButtonElement

beforeEach(() => {
  uploadMock.mockReset()
  removeMock.mockReset()
})

afterEach(cleanup)

describe('CategoryFormModal', () => {
  it('disables Save changes when nothing has changed', () => {
    renderModal()

    expect(saveButton().disabled).toBe(true)
  })

  it('enables Save changes when only a new image file is selected', async () => {
    const onSubmit = vi.fn().mockResolvedValue(category)
    uploadMock.mockResolvedValue(category)
    const onClose = vi.fn()
    renderModal({ onSubmit, onClose })

    const file = new File(['image'], 'shirts.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Image file'), {
      target: { files: [file] },
    })

    expect(saveButton().disabled).toBe(false)

    fireEvent.click(saveButton())

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(uploadMock).toHaveBeenCalledWith(category.id, {
        file,
        altText: 'Original alt text',
      }),
    )
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })

  it('enables Save changes when only the alt text has changed', () => {
    renderModal()

    fireEvent.change(screen.getByLabelText('Alt text'), {
      target: { value: 'A new description' },
    })

    expect(saveButton().disabled).toBe(false)
  })

  it('enables Save changes when only a category field has changed', () => {
    renderModal()

    fireEvent.change(screen.getByLabelText(/^Name/), {
      target: { value: 'Tops' },
    })

    expect(saveButton().disabled).toBe(false)
  })

  it('disables Save changes while the category save is pending', () => {
    const { rerender } = renderModal()

    fireEvent.change(screen.getByLabelText(/^Name/), {
      target: { value: 'Tops' },
    })
    expect(saveButton().disabled).toBe(false)

    rerender(
      <CategoryFormModal
        category={category}
        categories={categories}
        isSaving
        serverError={undefined}
        onClose={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(category)}
      />,
    )

    expect(saveButton().disabled).toBe(true)
  })

  it('disables Save changes while the image upload is pending', async () => {
    let resolveUpload: ((value: Category) => void) | undefined
    uploadMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpload = resolve
        }),
    )
    const onSubmit = vi.fn().mockResolvedValue(category)
    const onClose = vi.fn()
    renderModal({ onSubmit, onClose })

    const file = new File(['image'], 'shirts.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Image file'), {
      target: { files: [file] },
    })
    fireEvent.click(saveButton())

    await waitFor(() => expect(uploadMock).toHaveBeenCalledTimes(1))
    expect(saveButton().disabled).toBe(true)

    resolveUpload?.(category)
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })
})
