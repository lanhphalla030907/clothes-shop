import { useEffect, useRef, useState, useCallback } from 'react'
import {
  fetchCategories,
  fetchImagesForProducts,
  fetchPublicProducts,
} from './api'
import { toPieces } from './present'
import type { CataloguePiece } from '@/types'
import type {
  ProductFilterOptions,
  PublicProductFilterParams,
} from '@/types/productsFilter'

const DEFAULT_FILTER_OPTIONS: ProductFilterOptions = {
  categories: [],
  priceRange: { min: 0, max: 0 },
  sizes: [],
  colors: [],
}

export interface UsePublicProductsResult {
  pieces: CataloguePiece[]
  total: number
  page: number
  limit: number
  totalPages: number
  filterOptions: ProductFilterOptions
  isLoading: boolean
  isFetching: boolean
  error: unknown
  refetch: () => void
}

export function usePublicProducts(
  params: PublicProductFilterParams,
): UsePublicProductsResult {
  const [data, setData] = useState<{
    pieces: CataloguePiece[]
    total: number
    page: number
    limit: number
    totalPages: number
    filterOptions: ProductFilterOptions
  }>({
    pieces: [],
    total: 0,
    page: params.page ?? 1,
    limit: params.limit ?? 12,
    totalPages: 0,
    filterOptions: DEFAULT_FILTER_OPTIONS,
  })

  const [isLoading, setIsLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState<unknown>(undefined)
  const [tick, setTick] = useState(0)

  const activeAbortRef = useRef<AbortController | null>(null)

  const refetch = useCallback(() => {
    setTick((prev) => prev + 1)
  }, [])

  useEffect(() => {
    if (activeAbortRef.current) {
      activeAbortRef.current.abort()
    }

    const controller = new AbortController()
    activeAbortRef.current = controller
    const signal = controller.signal

    setIsFetching(true)

    async function load() {
      try {
        const [response, categories] = await Promise.all([
          fetchPublicProducts(params, signal),
          fetchCategories(signal),
        ])

        if (signal.aborted) return

        const imagesMap = await fetchImagesForProducts(response.data, signal)
        if (signal.aborted) return

        const pieces = toPieces(response.data, categories, imagesMap)

        setData({
          pieces,
          total: response.total,
          page: response.page,
          limit: response.limit,
          totalPages: response.totalPages,
          filterOptions: response.filterOptions ?? DEFAULT_FILTER_OPTIONS,
        })
        setError(undefined)
      } catch (err: unknown) {
        if (signal.aborted) return
        setError(err)
      } finally {
        if (!signal.aborted) {
          setIsLoading(false)
          setIsFetching(false)
        }
      }
    }

    void load()

    return () => {
      controller.abort()
    }
  }, [
    params.search,
    params.category,
    params.minPrice,
    params.maxPrice,
    params.size,
    params.color,
    params.inStock,
    params.sortBy,
    params.page,
    params.limit,
    tick,
  ])

  return {
    pieces: data.pieces,
    total: data.total,
    page: data.page,
    limit: data.limit,
    totalPages: data.totalPages,
    filterOptions: data.filterOptions,
    isLoading,
    isFetching,
    error,
    refetch,
  }
}
