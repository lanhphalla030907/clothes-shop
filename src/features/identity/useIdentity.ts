import { useCallback, useEffect, useState } from 'react'
import { ensureIdentity, identityAdapter, type Identity } from '@/lib/api/identity'

/**
 * React's view of the identity adapter.
 *
 * Deliberately **not** a context provider. The adapter is a module singleton with
 * its own `subscribe`, so every consumer reads the same instance without a
 * provider wrapping the tree — one less thing to thread through, and no way for a
 * component to end up talking to a different identity than the HTTP layer.
 *
 * The adapter bootstraps lazily. This hook kicks that off on mount for anything
 * that needs to *display* an identity (the account header, the profile page);
 * features that only need to *send* one already call `ensure()` inside the
 * transport, so they never depend on this hook having mounted first.
 */

export interface IdentityState {
  identity: Identity | undefined
  isReady: boolean
  error: unknown
  retry: () => void
}

export const useIdentity = (): IdentityState => {
  const [identity, setIdentity] = useState<Identity | undefined>(() => identityAdapter.current() ?? undefined)
  const [error, setError] = useState<unknown>(undefined)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    // A reset from another component must be reflected here too.
    const unsubscribe = identityAdapter.subscribe(() => {
      setIdentity(identityAdapter.current() ?? undefined)
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    let active = true

    ensureIdentity().then(
      (resolved) => {
        if (!active) return
        setIdentity(resolved)
        setError(undefined)
      },
      (cause: unknown) => {
        if (!active) return
        setError(cause)
      },
    )

    return () => {
      active = false
    }
  }, [attempt])

  const retry = useCallback(() => {
    setError(undefined)
    setAttempt((value) => value + 1)
  }, [])

  return { identity, isReady: identity !== undefined && error === undefined, error, retry }
}

/** `"Alex Morgan"` — the name to greet someone with, if there is one. */
export const displayName = (identity: Identity | undefined): string => {
  if (!identity) return ''
  return `${identity.firstName} ${identity.lastName}`.trim()
}
