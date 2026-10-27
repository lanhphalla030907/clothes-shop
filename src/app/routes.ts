import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'
import { RequireAuth } from '@/app/guards'
import { AccountLayout } from '@/layouts/AccountLayout'
import { StorefrontLayout } from '@/layouts/StorefrontLayout'
import { adminRoutes } from '@/app/adminRoutes'

const Home = lazy(() => import('@/pages/public/Home'))
const Shop = lazy(() => import('@/pages/public/Shop'))
const ProductDetails = lazy(() => import('@/pages/public/ProductDetails'))
const Cart = lazy(() => import('@/pages/public/Cart'))
const Checkout = lazy(() => import('@/pages/public/Checkout'))
const Success = lazy(() => import('@/pages/public/Success'))
const About = lazy(() => import('@/pages/public/About'))
const Login = lazy(() => import('@/pages/public/Login'))
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
      { path: '/checkout', Component: Checkout },
      { path: '/success', Component: Success },
      { path: '/about', Component: About },
      { path: '/login', Component: Login },
      { path: '*', Component: NotFound },
    ],
  },
  ...adminRoutes,
  {
    path: '/dashboard',
    Component: RequireAuth,
    children: [
      {
        Component: AccountLayout,
        children: [
          { index: true, Component: Overview },
          { path: 'orders', Component: Orders },
          { path: 'orders/:id', Component: OrderDetail },
          { path: 'wishlist', Component: Wishlist },
          { path: 'bag', Component: Bag },
          { path: 'addresses', Component: Addresses },
          { path: 'checkout', Component: AccountCheckout },
          { path: 'checkout/:orderId', Component: AccountCheckout },
          { path: 'profile', Component: Profile },
        ],
      },
    ],
  },
]
