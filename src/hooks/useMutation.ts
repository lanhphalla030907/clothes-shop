import { useCallback, useEffect, useRef, useState } from 'react'
import { isAbortError } from '@/lib/api/errors'

/**
 * The write-side counterpart to `useAsyncResource`.
 *
 * Two properties matter more than convenience here, and both come from money
 * moving or stock being reserved:
 *
 * - **No duplicate submits.** A second call while one is in flight is refused
 *   rather than queued, so a double-tapped "Place order" cannot create two
 *   orders. The same guard covers a retry after a slow response.
 * - **Unmount-safe state.** Navigating away mid-request updates nothing.
 *
 * The caller is expected to disable its button from `isPending` as well — the
 * guard makes a double submit harmless, the disabled button makes it obvious.
 */

export interface Mutation<TArgs extends unknown[], TResult> {
  run: (...args: TArgs) => Promise<TResult | undefined>
  isPending: boolean
  error: unknown
  reset: () => void
}

export const useMutation = <TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
  { onSuccess }: { onSuccess?: (result: TResult) => void } = {},
): Mutation<TArgs, TResult> => {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<unknown>(undefined)

  const inFlight = useRef(false)
  const mounted = useRef(true)

  const actionRef = useRef(action)
  const onSuccessRef = useRef(onSuccess)

  // Kept current from an effect rather than during render: `run` is only ever
  // called from an event handler, by which point these have been refreshed, and a
  // mid-render ref write is not something React lets you rely on.
  useEffect(() => {
    actionRef.current = action
    onSuccessRef.current = onSuccess
  })

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const run = useCallback(async (...args: TArgs): Promise<TResult | undefined> => {
    if (inFlight.current) return undefined
    inFlight.current = true
    setIsPending(true)
    setError(undefined)

    try {
      const result = await actionRef.current(...args)
      if (mounted.current) onSuccessRef.current?.(result)
      return result
    } catch (cause) {
      // A cancellation is a caller decision, not a failure to report.
      if (mounted.current && !isAbortError(cause)) setError(cause)
      return undefined
    } finally {
      inFlight.current = false
      if (mounted.current) setIsPending(false)
    }
  }, [])

  const reset = useCallback(() => setError(undefined), [])

  return { run, isPending, error, reset }
}