import { Suspense } from 'react'
import { BrowserRouter, useRoutes } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { CartProvider } from '@/context/CartProvider'
import { UIProvider } from '@/context/UIProvider'
import { RouteFallback } from '@/app/RouteFallback'
import { routes } from '@/app/routes'

/**
 * Providers and the router. Everything route-shaped lives in `app/routes.tsx` so
 * this file stays a list of what wraps the app, not what it contains.
 *
 * `CartProvider` and `UIProvider` are the storefront's own prototype concerns —
 * the local bag and the drawer. They stay at the root because the storefront's
 * `CartDrawer` is mounted by the storefront layout, and keeping them here means
 * the account shell inherits no bag state it has no use for.
 */
export default function App() {
  return (
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <CartProvider>
          <UIProvider>
            <Suspense fallback={<RouteFallback />}>
              <Routes />
            </Suspense>
          </UIProvider>
        </CartProvider>
      </MotionConfig>
    </BrowserRouter>
  )
}

/** `useRoutes` needs to be inside the router, hence this tiny wrapper. */
const Routes = () => useRoutes(routes)
