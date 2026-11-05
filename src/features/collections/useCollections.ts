import { useAsyncResource } from '@/hooks/useAsyncResource'
import { fetchCollectionDetail, fetchCollections } from './api'

export const useCollections = (limit?: number) =>
  useAsyncResource((signal) => fetchCollections(limit, signal), [limit])

export const useCollectionDetail = (slug: string | undefined, page: number) =>
  useAsyncResource(
    (signal) => slug ? fetchCollectionDetail(slug, page, 12, signal) : Promise.resolve(undefined),
    [slug, page],
  )
