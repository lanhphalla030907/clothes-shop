import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api/errors'
import type { Product, ProductAttribute } from '@/types/api'
import {
  createProductAttribute,
  deleteProductAttribute,
  fetchProductAttributes,
  updateProductAttribute,
} from '@/features/productAttributes/api'
import { FeedbackProvider } from '@/context/FeedbackProvider'
import { ProductAttributesSection } from './ProductAttributesSection'

vi.mock('@/features/productAttributes/api', () => ({
  createProductAttribute: vi.fn(),
  deleteProductAttribute: vi.fn(),
  fetchProductAttributes: vi.fn(),
  updateProductAttribute: vi.fn(),
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

const product: Product = {
  id: '11111111-1111-4111-8111-111111111111',
  categoryId: '33333333-3333-4333-8333-333333333333',
  name: 'Cotton Shirt',
  slug: 'cotton-shirt',
  description: null,
  basePrice: '25.00',
  status: 'ACTIVE',
  isActive: true,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
}

const attribute: ProductAttribute = {
  id: '22222222-2222-4222-8222-222222222222',
  productId: product.id,
  attributeName: 'Material',
  attributeValue: 'Cotton',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
}

const fetchAttributesMock = vi.mocked(fetchProductAttributes)
const createMock = vi.mocked(createProductAttribute)
const updateMock = vi.mocked(updateProductAttribute)
const deleteMock = vi.mocked(deleteProductAttribute)

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open')
  }
  fetchAttributesMock.mockReset()
  createMock.mockReset()
  updateMock.mockReset()
  deleteMock.mockReset()
})

afterEach(cleanup)

const renderSection = () =>
  render(
    <FeedbackProvider>
      <ProductAttributesSection product={product} />
    </FeedbackProvider>,
  )

describe('ProductAttributesSection', () => {
  it('loads and displays attributes, and supports create, edit, and confirmed deletion', async () => {
    fetchAttributesMock.mockResolvedValue([attribute])
    createMock.mockResolvedValue({ ...attribute, attributeName: 'Brand', attributeValue: 'FashionX' })
    updateMock.mockResolvedValue({ ...attribute, attributeValue: 'Organic cotton' })
    deleteMock.mockResolvedValue()

    renderSection()
    expect(await screen.findByText('Cotton')).toBeTruthy()
    expect(screen.getByText('Material')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Add attribute' }))
    fireEvent.change(screen.getByLabelText(/Attribute Name/), { target: { value: 'Brand' } })
    fireEvent.change(screen.getByLabelText(/Attribute Value/), { target: { value: 'FashionX' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create attribute' }))

    await waitFor(() => expect(createMock).toHaveBeenCalledWith(product.id, {
      attributeName: 'Brand',
      attributeValue: 'FashionX',
    }))
    expect(await screen.findByRole('dialog', { name: 'Attribute added' })).toBeTruthy()
    fireEvent.click(await screen.findByRole('button', { name: 'Okay' }))

    fireEvent.click(screen.getByRole('button', { name: 'Edit Material' }))
    fireEvent.change(screen.getByLabelText(/Attribute Value/), {
      target: { value: 'Organic cotton' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() =>
      expect(updateMock).toHaveBeenCalledWith(product.id, attribute.id, {
        attributeValue: 'Organic cotton',
      }),
    )

    expect(await screen.findByRole('dialog', { name: 'Attribute updated' })).toBeTruthy()
    fireEvent.click(await screen.findByRole('button', { name: 'Okay' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete Material' }))
    expect(await screen.findByRole('dialog', { name: 'Delete this attribute?' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Delete attribute' }))
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith(product.id, attribute.id))
    expect(await screen.findByRole('dialog', { name: 'Attribute deleted' })).toBeTruthy()
  })

  it('shows loading and empty states', async () => {
    let resolveAttributes: ((rows: ProductAttribute[]) => void) | undefined
    fetchAttributesMock.mockImplementation(
      () => new Promise((resolve) => { resolveAttributes = resolve }),
    )

    renderSection()
    expect(screen.getByText('Loading product attributes')).toBeTruthy()
    resolveAttributes?.([])
    expect(await screen.findByText('This product has no descriptive attributes')).toBeTruthy()
  })

  it('blocks case-insensitive duplicate names before submitting', async () => {
    fetchAttributesMock.mockResolvedValue([attribute])
    renderSection()
    await screen.findByText('Material')
    fireEvent.click(screen.getByRole('button', { name: 'Add attribute' }))
    fireEvent.change(screen.getByLabelText(/Attribute Name/), { target: { value: 'material' } })
    fireEvent.change(screen.getByLabelText(/Attribute Value/), { target: { value: 'Linen' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create attribute' }))
    expect(await screen.findByText(/already exists for this product/i)).toBeTruthy()
    expect(createMock).not.toHaveBeenCalled()
  })

  it('surfaces a duplicate-name response from the API', async () => {
    fetchAttributesMock.mockResolvedValue([])
    createMock.mockRejectedValue(
      new ApiError('A product attribute with this name already exists', {
        kind: 'conflict',
        status: 409,
      }),
    )

    renderSection()
    fireEvent.click(await screen.findByRole('button', { name: 'Add attribute' }))
    fireEvent.change(screen.getByLabelText(/Attribute Name/), { target: { value: 'material' } })
    fireEvent.change(screen.getByLabelText(/Attribute Value/), { target: { value: 'Linen' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create attribute' }))

    expect(
      await screen.findByText('An attribute with this name already exists for this product.'),
    ).toBeTruthy()
  })

  it('offers retry when loading fails', async () => {
    fetchAttributesMock.mockRejectedValue(new Error('offline'))
    renderSection()
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
  })

  it('shows a global error when a confirmed delete fails', async () => {
    fetchAttributesMock.mockResolvedValue([attribute])
    deleteMock.mockRejectedValue(
      new ApiError('Database unavailable', { kind: 'server', status: 500 }),
    )

    renderSection()
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Material' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Delete attribute' }))

    expect(await screen.findByRole('dialog', { name: 'Could not delete attribute' })).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toContain('Something went wrong on our side')
  })
})
