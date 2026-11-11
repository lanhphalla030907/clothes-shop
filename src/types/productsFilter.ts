import type { Product } from './api'

export type PublicProductSortOption =
  | 'newest'
  | 'price_asc'
  | 'price_desc'
  | 'best_selling'

export interface CategoryFilterOption {
  id: string
  name: string
  slug: string
  count: number
}

export interface PriceRangeFilterOption {
  min: number
  max: number
}

export interface ProductFilterOptions {
  categories: CategoryFilterOption[]
  priceRange: PriceRangeFilterOption
  sizes: string[]
  colors: string[]
}

export interface PublicProductFilterParams {
  search?: string
  category?: string
  minPrice?: number
  maxPrice?: number
  size?: string
  color?: string
  inStock?: boolean
  sortBy?: PublicProductSortOption
  page?: number
  limit?: number
}

export interface PublicProductListResponse {
  data: Product[]
  total: number
  page: number
  limit: number
  totalPages: number
  filterOptions: ProductFilterOptions
}
