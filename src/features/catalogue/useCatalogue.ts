import { ApiError } from '@/lib/api/errors'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import {
  fetchBuyableVariants,
  fetchCategories,
  fetchImagesForProducts,
  fetchProduct,
  fetchProductImages,
  fetchProducts,
} from './api'
import { toDetail, toPieces } from './present'
import type { Category, Product, UUID } from '@/types/api'
import type { CatalogueDetail, CataloguePiece } from '@/types'

/**
 * Read hooks for the catalogue.
 *
 * Each one states which of the API's three levels it needs, because that choice
 * is the expensive part: a collection costs one list plus one image read per
 * product, while a product page additionally costs two reads per variant. What
 * they share is the plumbing — cancellation, a truthful loading flag and a
 * `refetch` — from one implementation of `useAsyncResource`.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const useCategories = () =>
  useAsyncResource<Category[]>((signal) => fetchCategories(signal), [])

/**
 * The collection, as drawable pieces.
 *
 * Categories are read alongside the products so every card can print its
 * category without a second lookup, and images are fanned out per product because
 * the API has no list-images endpoint. Nothing here is filtered client-side on
 * anything but lifecycle: the collection shows what the catalogue marks as
 * sellable, in the order the server returned it.
 */
export const useCollection = () =>
  useAsyncResource<CataloguePiece[]>(async (signal) => {
    const [products, categories] = await Promise.all([fetchProducts(signal), fetchCategories(signal)])
    const images = await fetchImagesForProducts(products, signal)
    return toPieces(products, categories, images)
  }, [])

/**
 * One product with everything needed to buy it.
 *
 * `ref` accepts a uuid or a slug: links carry the uuid because that is what the
 * API addresses, but a slug is resolved through the list so a hand-written or
 * legacy link still lands on a product rather than 400-ing on a path parameter.
 */
export const useProductDetail = (ref: string | undefined) =>
  useAsyncResource<CatalogueDetail | undefined>(async (signal) => {
    if (!ref) return undefined

    const product = await resolveProduct(ref, signal)
    const [categories, images, variants] = await Promise.all([
      fetchCategories(signal),
      fetchProductImages(product.id, signal),
      fetchBuyableVariants(product.id, signal),
    ])

    return toDetail({
      product,
      category: categories.find((category) => category.id === product.categoryId),
      images,
      variants,
    })
  }, [ref])

const resolveProduct = async (ref: string, signal?: AbortSignal): Promise<Product> => {
  if (UUID_PATTERN.test(ref)) return fetchProduct(ref as UUID, signal)

  const products = await fetchProducts(signal)
  const match = products.find((product) => product.slug === ref)
  if (match) return match

  throw new ApiError('That piece is no longer in the collection.', { kind: 'notFound', status: 404 })
}

/**
 * Pieces from the same category, for the "pairs with" rail.
 *
 * The API offers no "related products" query, so this is derived from the
 * product list — but the category is narrowed *before* images are read, so a
 * product page costs one list plus three image reads rather than one per
 * product in the catalogue.
 */
export const useRelatedPieces = (categoryId: UUID | undefined, excludeId: UUID | undefined) =>
  useAsyncResource<CataloguePiece[]>(async (signal) => {
    if (!categoryId) return []

    const [products, categories] = await Promise.all([fetchProducts(signal), fetchCategories(signal)])
    const siblings = products
      .filter((product) => product.categoryId === categoryId && product.id !== excludeId)
      .slice(0, 3)

    const images = await fetchImagesForProducts(siblings, signal)
    return toPieces(siblings, categories, images)
  }, [categoryId, excludeId])
