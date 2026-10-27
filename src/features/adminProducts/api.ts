import { apiDelete, apiGetList, apiGetOne, apiPatch, apiPost } from '@/lib/api/client'
import { API } from '@/lib/api/config'
import type {
  AdminProductQuery,
  Category,
  CreateProductRequest,
  Product,
  UpdateProductRequest,
  UUID,
} from '@/types/api'

/**
 * `/admin/products` and `/admin/categories`.
 *
 * The JWT is attached and 401s are handled by the session layer in
 * `lib/api/client`; nothing in this module touches auth, storage or headers.
 * Reads pass an `AbortSignal` through so `useAsyncResource` can cancel them;
 * writes rely on the mutation hook's own duplicate guard instead.
 */

export const fetchAdminProducts = (query: AdminProductQuery, signal?: AbortSignal): Promise<Product[]> =>
  apiGetList<Product>(API.adminProducts, { query: toQuery(query), signal })

/** `isActive` is a boolean; the transport's query type accepts strings only. */
const toQuery = (query: AdminProductQuery): Record<string, string | undefined> => ({
  search: query.search,
  status: query.status,
  isActive: query.isActive === undefined ? undefined : String(query.isActive),
  categoryId: query.categoryId,
})

export const fetchAdminProduct = (id: UUID, signal?: AbortSignal): Promise<Product> =>
  apiGetOne<Product>(`${API.adminProducts}/${id}`, { signal })

export const createAdminProduct = (body: CreateProductRequest, signal?: AbortSignal): Promise<Product> =>
  apiPost<Product>(API.adminProducts, body, { signal }).then(requireProduct)

export const updateAdminProduct = (
  id: UUID,
  body: UpdateProductRequest,
  signal?: AbortSignal,
): Promise<Product> => apiPatch<Product>(`${API.adminProducts}/${id}`, body, { signal }).then(requireProduct)

export const deleteAdminProduct = (id: UUID, signal?: AbortSignal): Promise<void> =>
  apiDelete<void>(`${API.adminProducts}/${id}`, { signal }).then(() => undefined)

let categoriesCache: Category[] | null = null
let categoriesInFlight: Promise<Category[]> | null = null

/**
 * `GET /admin/categories`, shared across every admin screen in the session.
 *
 * A product list, its filter and any open form all want the categories under the
 * same key, so the first caller starts one request and every other caller fans
 * out on the same promise — no signal is accepted because one consumer unmounting
 * must not cancel a read another consumer is still waiting on. A failure clears
 * the slot, so a retry performs a fresh request.
 */
export const fetchAdminCategories = (): Promise<Category[]> => {
  if (categoriesCache !== null) return Promise.resolve(categoriesCache)

  if (categoriesInFlight === null) {
    categoriesInFlight = apiGetList<Category>(API.adminCategories)
      .then((list) => {
        categoriesCache = list
        return list
      })
      .finally(() => {
        categoriesInFlight = null
      })
  }

  return categoriesInFlight
}

const requireProduct = (product: Product | undefined): Product => {
  if (!product) throw new Error('The catalogue did not return the saved product.')
  return product
}