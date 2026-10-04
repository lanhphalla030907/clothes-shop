import { useCallback, useEffect, useRef, useState } from 'react'
import { isAbortError } from '@/lib/api/errors'

/**
 * The single way this app fetches.
 *
 * Every data-driven page needs the same four things — a value, a loading flag, an
 * error and a way to try again — and every one of them needs the request to be
 * cancelled when the component goes away. Writing that by hand per page is how
 * dashboards end up with a `setState` after unmount and a spinner that never
 * stops.
 *
 * Guarantees:
 *
 * - **Cancellation.** The in-flight request is aborted on unmount and whenever
 *   `deps` change, so a fast navigation cannot land a stale response.
 * - **One request at a time.** `refetch` while a request is running aborts the
 *   old one rather than racing it, so the last answer is the only one applied.
 * - **A loading flag that means it.** `isLoading` is true only before the first
 *   result, so a background refresh does not blank out content the customer is
 *   already reading. `isRefreshing` covers that case.
 * - **No error for a cancellation.** An abort resolves quietly instead of
 *   poisoning the state with an error nobody can act on.
 */

export interface AsyncResource<T> {
  data: T | undefined
  error: unknown
  /** First load, with nothing to show yet. */
  isLoading: boolean
  /** A refresh over existing data — the page keeps rendering `data`. */
  isRefreshing: boolean
  refetch: () => void
}

export type Fetcher<T> = (signal: AbortSignal) => Promise<T>

export const useAsyncResource = <T>(
  fetcher: Fetcher<T>,
  deps: readonly unknown[],
): AsyncResource<T> => {
  const [data, setData] = useState<T | undefined>(undefined)
  const [error, setError] = useState<unknown>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [nonce, setNonce] = useState(0)

  /** Guards against applying a result from a superseded request. */
  const runId = useRef(0)
  /** Whether anything has ever loaded — read inside the effect, so it is a ref. */
  const hasData = useRef(false)

  const fetcherRef = useRef(fetcher)
  // Declared before the fetching effect on purpose: effects run in order, so by
  // the time the request fires it has already read the current closure. Writing
  // this during render instead would be a ref mutation mid-render, which React
  // reserves for initialisation.
  useEffect(() => {
    fetcherRef.current = fetcher
  })

  const refetch = useCallback(() => setNonce((value) => value + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    const id = runId.current + 1
    runId.current = id

    // A ref, not the state value: reading `data` here would need it in the
    // dependency list, and every result would then restart the request.
    const isFirstLoad = !hasData.current
    if (isFirstLoad) setIsLoading(true)
    else setIsRefreshing(true)

    fetcherRef.current(controller.signal).then(
      (result) => {
        if (runId.current !== id || controller.signal.aborted) return
        hasData.current = true
        setData(result)
        setError(undefined)
      },
      (cause: unknown) => {
        if (runId.current !== id || controller.signal.aborted || isAbortError(cause)) return
        setError(cause)
      },
    ).finally(() => {
      if (runId.current !== id) return
      setIsLoading(false)
      setIsRefreshing(false)
    })

    return () => controller.abort()
    // `fetcher` is deliberately absent: it is a new closure on every render and
    // including it would refetch in a loop. `deps` is the caller's statement of
    // what actually invalidates the result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  return { data, error, isLoading, isRefreshing, refetch }
}