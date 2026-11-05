import { Suspense } from 'react'
import { BrowserRouter, useRoutes } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { useAuth } from '@/features/auth/useAuth'
import { CartProvider } from '@/context/CartProvider'
import { UIProvider } from '@/context/UIProvider'
import { FeedbackProvider } from '@/context/FeedbackProvider'
import { CartActionsProvider } from '@/features/cart/CartActionsProvider'
import { WishlistActionsProvider } from '@/features/wishlist/WishlistActionsProvider'
import { AddressActionsProvider } from '@/features/addresses/AddressActionsProvider'
import { RouteFallback } from '@/app/RouteFallback'
import { routes } from '@/app/routes'

export default function App() {
  return (
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <FeedbackProvider>
          <AuthProvider>
            <CartProvider>
              <UIProvider>
                <SessionScopedProviders />
              </UIProvider>
            </CartProvider>
          </AuthProvider>
        </FeedbackProvider>
      </MotionConfig>
    </BrowserRouter>
  )
}
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
