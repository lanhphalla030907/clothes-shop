import { useAsyncResource } from '@/hooks/useAsyncResource'
import { fetchAdminCategories, fetchAdminProducts } from './api'
import type { AdminProductQuery, Category, Product } from '@/types/api'

/**
 * Read hooks for product management.
 *
 * The list refetches whenever a filter term changes; each filter is a primitive,
 * so the effect stays stable and a request cannot be restarted by a re-render
 * that changed nothing.
 */
export const useAdminProducts = (query: AdminProductQuery) =>
  useAsyncResource<Product[]>((signal) => fetchAdminProducts(query, signal), [
    query.search,
    query.status,
    query.isActive,
    query.categoryId,
  ])

export const useAdminCategories = () =>
  useAsyncResource<Category[]>(() => fetchAdminCategories(), [])