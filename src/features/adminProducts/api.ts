import { apiDelete, apiGetList, apiGetOne, apiPatch, apiPost } from '@/lib/api/client'
import { API, UPLOAD_TIMEOUT_MS } from '@/lib/api/config'
import type {
  AdminProductQuery,
  Category,
  CreateCategoryRequest,
  CreateProductRequest,
  Product,
  UpdateCategoryRequest,
  UpdateProductRequest,
  UploadCategoryImageInput,
  UUID,
} from '@/types/api'

export type AdminBestSeller = {
  rank: number
  productId: string
  name: string
  image: string | null
  unitsSold: number
  revenue: unknown
}

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
let categoriesGeneration = 0

/**
 * `GET /admin/categories`, shared across every admin screen in the session.
 *
 * A product list, its filter and any open form all want the categories under the
 * same key, so the first caller starts one request and every other caller fans
 * out on the same promise — no signal is accepted because one consumer unmounting
 * must not cancel a read another consumer is still waiting on. A failure clears
 * the slot, so a retry performs a fresh request.
 *
 * Writes invalidate the cache (see {@link invalidateAdminCategories}) so a list
 * screen can refetch without being served the pre-write snapshot. A read that was
 * already in flight when the write landed is returned to its caller but is not
 * allowed to repopulate the cache.
 */
export const fetchAdminCategories = (): Promise<Category[]> => {
  if (categoriesCache !== null) return Promise.resolve(categoriesCache)

  if (categoriesInFlight === null) {
    const generation = categoriesGeneration
    const request = apiGetList<Category>(API.adminCategories).then((list) => {
      if (generation === categoriesGeneration) categoriesCache = list
      return list
    })

    categoriesInFlight = request
    request.then(
      () => {
        if (categoriesInFlight === request) categoriesInFlight = null
      },
      () => {
        if (categoriesInFlight === request) categoriesInFlight = null
      },
    )
  }

  return categoriesInFlight
}

export const invalidateAdminCategories = (): void => {
  categoriesGeneration += 1
  categoriesCache = null
  // Drop the shared in-flight slot as well: a refetch after a write must start a
  // new read instead of joining a request that began before the write.
  categoriesInFlight = null
}

export const createAdminCategory = async (body: CreateCategoryRequest): Promise<Category> => {
  const category = await apiPost<Category>(API.adminCategories, body)
  invalidateAdminCategories()
  return requireCategory(category)
}

export const updateAdminCategory = async (
  id: UUID,
  body: UpdateCategoryRequest,
): Promise<Category> => {
  const category = await apiPatch<Category>(`${API.adminCategories}/${id}`, body)
  invalidateAdminCategories()
  return requireCategory(category)
}

export const deleteAdminCategory = async (id: UUID): Promise<void> => {
  await apiDelete<void>(`${API.adminCategories}/${id}`)
  invalidateAdminCategories()
}

export const fetchAdminBestSellers = (limit = 10): Promise<AdminBestSeller[]> =>
  apiGetList<AdminBestSeller>(API.adminBestSellers, { query: { limit: String(limit) } })


export const uploadAdminCategoryImage = async (
  id: UUID,
  input: UploadCategoryImageInput,
): Promise<Category> => {
  const form = new FormData()
  form.append('file', input.file)
  if (input.altText !== undefined && input.altText.trim() !== '') {
    form.append('altText', input.altText.trim())
  }

  const category = await apiPost<Category>(
    `${API.adminCategories}/${id}/images/upload`,
    form,
    { timeoutMs: UPLOAD_TIMEOUT_MS },
  )
  invalidateAdminCategories()
  return requireCategory(category)
}

export const removeAdminCategoryImage = async (id: UUID): Promise<void> => {
  await apiDelete<void>(`${API.adminCategories}/${id}/images`)
  invalidateAdminCategories()
}

const requireProduct = (product: Product | undefined): Product => {
  if (!product) throw new Error('The catalogue did not return the saved product.')
  return product
}

const requireCategory = (category: Category | undefined): Category => {
  if (!category) throw new Error('The catalogue did not return the saved category.')
  return category
}

