import { useCallback, useRef, useState } from 'react'
import { useFeedback } from '@/context/feedbackContext'
import { isAbortError, isApiError } from '@/lib/api/errors'
import { createCheckoutQuote, placeOrder as submitCheckout } from './api'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import type {
  CheckoutQuote,
  CheckoutRequest,
  CreateCheckoutQuoteRequest,
  Order,
  UUID,
} from '@/types/api'

export type CheckoutSubmission =
  | { kind: 'success'; order: Order }
  | { kind: 'failure'; error: unknown; ambiguous: boolean }
  | { kind: 'busy' }

export interface CheckoutFlow {
  placeOrder: (body: CheckoutRequest) => Promise<CheckoutSubmission>
  isPlacing: boolean
  error: unknown
  placedOrder: Order | undefined
  reset: () => void
}

export const useCheckout = (): CheckoutFlow => {
  const [placedOrder, setPlacedOrder] = useState<Order | undefined>(undefined)
  const [isPlacing, setIsPlacing] = useState(false)
  const [error, setError] = useState<unknown>(undefined)
  const inFlight = useRef(false)
  const { showFeedback } = useFeedback()

  const submit = useCallback(
    async (body: CheckoutRequest): Promise<CheckoutSubmission> => {
      if (inFlight.current) return { kind: 'busy' }

      inFlight.current = true
      setIsPlacing(true)
      setError(undefined)

      try {
        const order = await submitCheckout(body)
        setPlacedOrder(order)
        showFeedback({
          type: 'success',
          title: 'Order placed',
          message: `Order ${order.orderNumber} was created.`,
        })
        return { kind: 'success', order }
      } catch (cause) {
        setError(cause)
        const ambiguous =
          !isApiError(cause) ||
          !['validation', 'unauthorized', 'notFound', 'conflict'].includes(cause.kind)
        return { kind: 'failure', error: cause, ambiguous }
      } finally {
        inFlight.current = false
        setIsPlacing(false)
      }
    },
    [showFeedback],
  )

  const reset = useCallback(() => {
    setPlacedOrder(undefined)
    setError(undefined)
  }, [])

  return {
    placeOrder: submit,
    isPlacing,
    error,
    placedOrder,
    reset,
  }
}

export interface CheckoutQuoteState {
  requestKey: string
  quote: CheckoutQuote | undefined
  error: unknown
  isLoading: boolean
  refetch: () => void
}

export const useCheckoutQuote = (
  request: CreateCheckoutQuoteRequest | undefined,
  requestKey: string,
): CheckoutQuoteState => {
  const [revision, setRevision] = useState(0)
  const resource = useAsyncResource<{
    requestKey: string
    quote: CheckoutQuote | undefined
    error: unknown
  } | undefined>(
    async (signal) => {
      if (!request) return undefined
      try {
        return {
          requestKey,
          quote: await createCheckoutQuote(request, signal),
          error: undefined,
        }
      } catch (cause) {
        if (isAbortError(cause)) throw cause
        return { requestKey, quote: undefined, error: cause }
      }
    },
    [request, requestKey, revision],
  )

  const refetch = useCallback(() => setRevision((value) => value + 1), [])
  const isPending = resource.isLoading || resource.isRefreshing
  const hasCurrentResult = resource.data?.requestKey === requestKey

  return {
    requestKey,
    quote:
      !isPending && hasCurrentResult ? resource.data?.quote : undefined,
    error:
      !isPending && hasCurrentResult ? resource.data?.error : undefined,
    isLoading: request !== undefined && (isPending || !hasCurrentResult),
    refetch,
  }
}

/** The address checkout should pre-select: the default, else the only one. */
export const preferredAddressId = (
  addresses: readonly { id: UUID; isDefault: boolean }[],
): UUID | undefined => {
  const preferred = addresses.find((address) => address.isDefault) ?? addresses[0]
  return preferred?.id
}