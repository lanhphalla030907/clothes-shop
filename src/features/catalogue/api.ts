import { apiGetList, apiGetOne } from '@/lib/api/client'
import { API } from '@/lib/api/config'
import { isApiError } from '@/lib/api/errors'
import type {
  CatalogueVariant,
  Category,
  Inventory,
  Product,
  ProductImage,
  ProductVariant,
  UUID,
  VariantOption,
  VariantOptionRecord,
} from '@/types/api'

/**
 * Every catalogue read, in one module.
 *
 * ## The catalogue is three levels deep
 *
 * `GET /products` returns bare products — no images, no variants, no stock — so
 * anything that draws a product has to read its sub-collections as well. These
 * stay separate functions with one caller each on purpose: which of them a screen
 * needs is a decision only that screen can make, and composing them here would
 * force the collection to pay for the product page.
 *
 * Prices are never computed here. `basePrice`, `price` and every `lineTotal` are
 * read from the response, so the figure on screen is the figure the server holds.
 */

export const fetchCategories = (signal?: AbortSignal): Promise<Category[]> =>
  apiGetList<Category>(API.categories, { signal })

export const fetchProducts = (signal?: AbortSignal): Promise<Product[]> =>
  apiGetList<Product>(API.products, { signal })

export const fetchProduct = (id: UUID, signal?: AbortSignal): Promise<Product> =>
  apiGetOne<Product>(`${API.products}/${id}`, { signal })

export const fetchProductImages = (productId: UUID, signal?: AbortSignal): Promise<ProductImage[]> =>
  apiGetList<ProductImage>(`${API.products}/${productId}/images`, { signal })

export const fetchVariants = (productId: UUID, signal?: AbortSignal): Promise<ProductVariant[]> =>
  apiGetList<ProductVariant>(`${API.products}/${productId}/variants`, { signal })

export const fetchVariantOptions = (
  productId: UUID,
  variantId: UUID,
  signal?: AbortSignal,
): Promise<VariantOptionRecord[]> =>
  apiGetList<VariantOptionRecord>(
    `${API.products}/${productId}/variants/${variantId}/options`,
    { signal },
  )

/**
 * Stock for one variant, or `null` when it has no inventory row.
 *
 * A 404 here is the API saying "this variant was never stocked", which is a fact
 * about the catalogue rather than a failure — so it resolves to `null`. Anything
 * else is re-thrown, because quietly reporting "no stock" for an unreachable
 * inventory endpoint would hide a broken deployment behind an honest-looking
 * number. The cart endpoint is still the authority when the line is written.
 */
export const fetchVariantStock = async (
  productId: UUID,
  variantId: UUID,
  signal?: AbortSignal,
): Promise<number | null> => {
  try {
    const inventory = await apiGetOne<Inventory>(
      `${API.products}/${productId}/variants/${variantId}/inventory`,
      { signal },
    )
    return inventory.available
  } catch (error) {
    if (isApiError(error) && error.kind === 'notFound') return null
    throw error
  }
}

/**
 * The buyable variants of a product: options and stock joined onto each row.
 *
 * Options and stock are two reads per variant, so they are issued together and
 * awaited together — a product page with a dozen variants costs one request plus
 * two per variant, and all of them share the caller's abort signal.
 *
 * Inactive variants are dropped rather than shown greyed out: the API reserves
 * `isActive` for staging a variant that is not yet for sale, and a shopper cannot
 * act on one either way.
 */
export const fetchBuyableVariants = async (
  productId: UUID,
  signal?: AbortSignal,
): Promise<CatalogueVariant[]> => {
  const variants = await fetchVariants(productId, signal)

  return Promise.all(
    variants
      .filter((variant) => variant.isActive)
      .map(async (variant): Promise<CatalogueVariant> => {
        const [records, available] = await Promise.all([
          fetchVariantOptions(productId, variant.id, signal),
          fetchVariantStock(productId, variant.id, signal),
        ])

        return {
          ...variant,
          available,
          options: records.map(toOption),
        }
      }),
  )
}

/**
 * Images for a whole collection, read one product at a time.
 *
 * There is no list-images endpoint, so a grid that shows photography has to ask
 * per product. The fan-out shares one abort signal: a fast filter change cancels
 * every outstanding read at once, rather than letting a stale set of images land
 * after the new set and leave plates showing the wrong garment.
 */
export const fetchImagesForProducts = async (
  products: readonly Product[],
  signal?: AbortSignal,
): Promise<Map<UUID, ProductImage[]>> => {
  const entries = await Promise.all(
    products.map(async (product) => [product.id, await fetchProductImages(product.id, signal)] as const),
  )
  return new Map(entries)
}

/** Option rows reduced to the name/value pair every screen actually reads. */
const toOption = (record: VariantOptionRecord): VariantOption => ({
  optionName: record.optionName,
  optionValue: record.optionValue,
})

/**
 * Variants read once per product for the life of the tab.
 *
 * Quick add needs a variant id, and the collection endpoint does not carry one,
 * so the first quick add on a card pays for the read and every later one does not.
 *
 * No abort signal, deliberately: a cached entry is shared, and one component
 * unmounting must not cancel a read another is about to reuse. The cached answer
 * is only ever used to name a variant — the cart re-reads price and stock for
 * itself when the line is written — so a value that went stale costs a caption,
 * never a transaction. Failures are evicted, so one network blip cannot disable
 * quick add for the rest of the session.
 */
const variantCache = new Map<UUID, Promise<ProductVariant[]>>()

export const loadVariantsOnce = (productId: UUID): Promise<ProductVariant[]> => {
  const cached = variantCache.get(productId)
  if (cached) return cached

  const request = fetchVariants(productId)
  variantCache.set(productId, request)
  void request.catch(() => {
    if (variantCache.get(productId) === request) variantCache.delete(productId)
  })

  return request
}
