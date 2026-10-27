import { Suspense } from 'react'
import { BrowserRouter, useRoutes } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { useAuth } from '@/features/auth/useAuth'
import { CartProvider } from '@/context/CartProvider'
import { UIProvider } from '@/context/UIProvider'
import { CartActionsProvider } from '@/features/cart/CartActionsProvider'
import { WishlistActionsProvider } from '@/features/wishlist/WishlistActionsProvider'
import { AddressActionsProvider } from '@/features/addresses/AddressActionsProvider'
import { RouteFallback } from '@/app/RouteFallback'
import { routes } from '@/app/routes'

/**
 * Providers and the router. Everything route-shaped lives in `app/routes.tsx` so
 * this file stays a list of what wraps the app, not what it contains.
 *
 * `AuthProvider` sits above everything that reads a user, because the cart,
 * wishlist and address providers are keyed against the account it holds: when
 * the account changes — signed in, signed out, or a different person signing in
 * — the whole subtree is remounted rather than reconciled. That is what makes
 * "the previous shopper's bag is on screen" impossible instead of merely
 * unlikely: no state from the old key survives to be rendered.
 *
 * `CartProvider` is the storefront's local prototype bag and is still there for
 * the pre-existing demo pages under `/cart`. It has no relationship to the server
 * cart, which is why the two are named differently rather than merged.
 */
export default function App() {
  return (
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <CartProvider>
            <UIProvider>
              <SessionScopedProviders />
            </UIProvider>
          </CartProvider>
        </AuthProvider>
      </MotionConfig>
    </BrowserRouter>
  )
}

/**
 * The user-scoped providers, remounted whenever the signed-in account changes.
 *
 * Must be a component rather than a hook call inside `App`: the key has to come
 * from the auth context, and `App` renders above its provider.
 */
const SessionScopedProviders = () => {
  const { user } = useAuth()
  const scope = user?.id ?? 'signed-out'

  return (
    <CartActionsProvider key={scope}>
      <WishlistActionsProvider>
        <AddressActionsProvider>
          <Suspense fallback={<RouteFallback />}>
            <Routes />
          </Suspense>
        </AddressActionsProvider>
      </WishlistActionsProvider>
    </CartActionsProvider>
  )
}

/** `useRoutes` needs to be inside the router, hence this tiny wrapper. */
const Routes = () => useRoutes(routes)
