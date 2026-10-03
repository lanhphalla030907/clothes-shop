import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { Layout } from '@/components/layout/Layout'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
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

const DashboardOverview = lazy(() => import('@/pages/dashboard/DashboardOverview'))
const DashboardOrders = lazy(() => import('@/pages/dashboard/DashboardOrders'))
const DashboardProducts = lazy(() => import('@/pages/dashboard/DashboardProducts'))
const DashboardCustomers = lazy(() => import('@/pages/dashboard/DashboardCustomers'))
const DashboardSettings = lazy(() => import('@/pages/dashboard/DashboardSettings'))

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

                {/* Admin runs its own shell — no storefront nav, footer or bag. */}
                <Route path="/dashboard" element={<DashboardLayout />}>
                  <Route index element={<DashboardOverview />} />
                  <Route path="orders" element={<DashboardOrders />} />
                  <Route path="products" element={<DashboardProducts />} />
                  <Route path="customers" element={<DashboardCustomers />} />
                  <Route path="settings" element={<DashboardSettings />} />
                </Route>
              </Routes>
            </Suspense>
          </UIProvider>
        </CartProvider>
      </MotionConfig>
    </BrowserRouter>
  )
}
