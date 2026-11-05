import { apiGetList } from '@/lib/api/client'
import { API } from '@/lib/api/config'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import type { Poster } from '@/types/api'

/**
 * The storefront's public poster feed: active posters only, already in display
 * order. Inactive posters are never rendered because the server excludes them.
 */
export const fetchActivePosters = (signal?: AbortSignal): Promise<Poster[]> =>
  apiGetList<Poster>(API.posters, { signal })

export const useActivePosters = () =>
  useAsyncResource<Poster[]>((signal) => fetchActivePosters(signal), [])
