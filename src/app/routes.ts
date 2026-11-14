import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'
import { RequireAuth, RequireDeliveryStaffRoute } from '@/app/guards'
import { AccountSectionLayout } from '@/layouts/AccountSectionLayout'
import { StorefrontLayout } from '@/layouts/StorefrontLayout'
import { adminRoutes } from '@/app/adminRoutes'

const Home = lazy(() => import('@/pages/public/Home'))
const ProductsPage = lazy(() => import('@/pages/public/ProductsPage'))
const ProductDetails = lazy(() => import('@/pages/public/ProductDetails'))
const CollectionDetails = lazy(() => import('@/pages/public/CollectionDetails'))
const Cart = lazy(() => import('@/pages/public/Cart'))
const Checkout = lazy(() => import('@/pages/public/Checkout'))
const Success = lazy(() => import('@/pages/public/Success'))
const About = lazy(() => import('@/pages/public/About'))
const Login = lazy(() => import('@/pages/public/Login'))
const Register = lazy(() => import('@/pages/public/Register'))
const ForgotPassword = lazy(() => import('@/pages/public/ForgotPassword'))
const ResetPassword = lazy(() => import('@/pages/public/ResetPassword'))
const NotFound = lazy(() => import('@/pages/public/NotFound'))

const Overview = lazy(() => import('@/pages/account/Overview'))
const Orders = lazy(() => import('@/pages/account/Orders'))
const OrderDetail = lazy(() => import('@/pages/account/OrderDetail'))
const Wishlist = lazy(() => import('@/pages/account/Wishlist'))
const Bag = lazy(() => import('@/pages/account/Bag'))
const Addresses = lazy(() => import('@/pages/account/Addresses'))
const AccountCheckout = lazy(() => import('@/pages/account/Checkout'))
const Profile = lazy(() => import('@/pages/account/Profile'))
const AccountFeedback = lazy(() => import('@/pages/account/Feedback'))
const Notifications = lazy(() => import('@/pages/account/Notifications'))
const DeliveryDashboard = lazy(() => import('@/pages/delivery/DeliveryDashboard'))

export const routes: RouteObject[] = [
  {
    Component: StorefrontLayout,
    children: [
      { path: '/', Component: Home },
      { path: '/shop', Component: ProductsPage },
      { path: '/products', Component: ProductsPage },
      { path: '/product/:id', Component: ProductDetails },
      { path: '/collections/:slug', Component: CollectionDetails },
      { path: '/cart', Component: Cart },
      { path: '/checkout', Component: Checkout },
      { path: '/success', Component: Success },
      { path: '/about', Component: About },
      { path: '/login', Component: Login },
      { path: '/register', Component: Register },
      { path: '/forgot-password', Component: ForgotPassword },
      { path: '/reset-password', Component: ResetPassword },
      {
        path: '/notifications',
        Component: RequireAuth,
        children: [{ index: true, Component: Notifications }],
      },
      {
        path: '/account',
        Component: RequireAuth,
        children: [
          {
            Component: AccountSectionLayout,
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
              { path: 'feedback', Component: AccountFeedback },
            ],
          },
        ],
      },
      { path: '*', Component: NotFound },
    ],
  },
  ...adminRoutes,
  {
    path: '/delivery',
    Component: RequireDeliveryStaffRoute,
    children: [{ index: true, Component: DeliveryDashboard }],
  },
]
