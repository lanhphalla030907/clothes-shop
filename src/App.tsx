import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { Layout } from '@/components/layout/Layout'
import { CartProvider } from '@/context/CartProvider'
import { UIProvider } from '@/context/UIProvider'
import Home from '@/pages/Home'

/** Route-level code splitting keeps the landing payload lean. */
const Shop = lazy(() => import('@/pages/Shop'))
const ProductDetails = lazy(() => import('@/pages/ProductDetails'))
const Cart = lazy(() => import('@/pages/Cart'))
const Checkout = lazy(() => import('@/pages/Checkout'))
const Success = lazy(() => import('@/pages/Success'))
const About = lazy(() => import('@/pages/About'))
const NotFound = lazy(() => import('@/pages/NotFound'))

const RouteFallback = () => (
  <div className="grid min-h-[70svh] place-items-center" role="status" aria-live="polite">
    <span className="label-micro animate-pulse text-ash">Loading</span>
  </div>
)

export default function App() {
  return (
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <CartProvider>
          <UIProvider>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route element={<Layout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/shop" element={<Shop />} />
                  <Route path="/product/:id" element={<ProductDetails />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/success" element={<Success />} />
                  <Route path="/about" element={<About />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </Suspense>
          </UIProvider>
        </CartProvider>
      </MotionConfig>
    </BrowserRouter>
  )
}
