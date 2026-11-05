import { apiDelete, apiGetList, apiPatch, apiPost } from '@/lib/api/client'
import { API } from '@/lib/api/config'
import type {
  CreateProductAttributeRequest,
  ProductAttribute,
  UpdateProductAttributeRequest,
  UUID,
} from '@/types/api'

const attributesPath = (productId: UUID): string =>
  `${API.products}/${productId}/attributes`

const requireAttribute = (attribute: ProductAttribute | undefined): ProductAttribute => {
  if (attribute === undefined) {
    throw new Error('The catalogue did not return the saved product attribute.')
  }
  return attribute
}

export const fetchProductAttributes = (
  productId: UUID,
  signal?: AbortSignal,
): Promise<ProductAttribute[]> =>
  apiGetList<ProductAttribute>(attributesPath(productId), { signal })

export const createProductAttribute = async (
  productId: UUID,
  body: CreateProductAttributeRequest,
): Promise<ProductAttribute> =>
  requireAttribute(await apiPost<ProductAttribute>(attributesPath(productId), body))

export const updateProductAttribute = async (
  productId: UUID,
  attributeId: UUID,
  body: UpdateProductAttributeRequest,
): Promise<ProductAttribute> =>
  requireAttribute(
    await apiPatch<ProductAttribute>(`${attributesPath(productId)}/${attributeId}`, body),
  )

export const deleteProductAttribute = async (
  productId: UUID,
  attributeId: UUID,
): Promise<void> => {
  await apiDelete<void>(`${attributesPath(productId)}/${attributeId}`)
}
