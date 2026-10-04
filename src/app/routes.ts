import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'
import { AccountLayout } from '@/layouts/AccountLayout'
import { StorefrontLayout } from '@/layouts/StorefrontLayout'

/**
 * The route table, in one place, as plain data.
 *
 * ## Why `Component:` and not `element={<Page />}`
 *
 * `Component` needs no JSX, so this file is a `.ts` of data with no components in
 * it — which is also why the two layouts can be imported directly instead of
 * wrapped. The trade is that a route is a *component reference*, so a page cannot
 * be given per-route props here; that has never been needed.
 *
 * Split by shell because that is the real structural difference between the two
 * halves of the app: the storefront chrome knows about the local prototype bag,
 * the account chrome knows about the server cart, and they must never render each
 * other's navigation.
 *
 * Everything except the landing page is code-split, and the account routes are
 * split per screen so the first dashboard paint is not paying for the checkout
 * form and the QR panel.
 */

const Home = lazy(() => import('@/pages/public/Home'))
const Shop = lazy(() => import('@/pages/public/Shop'))
const ProductDetails = lazy(() => import('@/pages/public/ProductDetails'))
const Cart = lazy(() => import('@/pages/public/Cart'))
const Checkout = lazy(() => import('@/pages/public/Checkout'))
const Success = lazy(() => import('@/pages/public/Success'))
const About = lazy(() => import('@/pages/public/About'))
const NotFound = lazy(() => import('@/pages/public/NotFound'))

const Overview = lazy(() => import('@/pages/account/Overview'))
const Orders = lazy(() => import('@/pages/account/Orders'))
const OrderDetail = lazy(() => import('@/pages/account/OrderDetail'))
const Wishlist = lazy(() => import('@/pages/account/Wishlist'))
const Bag = lazy(() => import('@/pages/account/Bag'))
const Addresses = lazy(() => import('@/pages/account/Addresses'))
const AccountCheckout = lazy(() => import('@/pages/account/Checkout'))
const Profile = lazy(() => import('@/pages/account/Profile'))

export const routes: RouteObject[] = [
  {
    Component: StorefrontLayout,
    children: [
      { path: '/', Component: Home },
      { path: '/shop', Component: Shop },
      { path: '/product/:id', Component: ProductDetails },
      { path: '/cart', Component: Cart },
      // The public checkout is the pre-existing local demo flow, with its card
      // form and its fake order. It is not the account checkout; that one lives
      // under /dashboard/checkout and takes a real address and a real payment.
      { path: '/checkout', Component: Checkout },
      { path: '/success', Component: Success },
      { path: '/about', Component: About },
      { path: '*', Component: NotFound },
    ],
  },
  {
    path: '/dashboard',
    Component: AccountLayout,
    children: [
      { index: true, Component: Overview },
      { path: 'orders', Component: Orders },
      // A sibling of `orders`, not a child: React Router ranks the static segment
      // first on its own, so no ordering trickery is needed here.
      { path: 'orders/:id', Component: OrderDetail },
      { path: 'wishlist', Component: Wishlist },
      { path: 'bag', Component: Bag },
      { path: 'addresses', Component: Addresses },
      { path: 'checkout', Component: AccountCheckout },
      { path: 'checkout/:orderId', Component: AccountCheckout },
      { path: 'profile', Component: Profile },
    ],
  },
]
