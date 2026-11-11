import type { RouteObject } from 'react-router-dom'
import { RequireAdminRoute } from '@/app/adminGuard'
import { AdminLayout } from '@/layouts/admin/AdminLayout'
import { lazy } from 'react'

const CodDashboard = lazy(() => import('@/pages/admin/cod-dashboard/CodDashboard'))
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))
const FinanceDashboard = lazy(() => import('@/pages/admin/finance/FinanceDashboard'))
const OrdersIndex = lazy(() => import('@/pages/admin/orders/OrdersIndex'))
const OrderDetail = lazy(() => import('@/pages/admin/orders/OrderDetail'))
const ProductsIndex = lazy(() => import('@/pages/admin/products/ProductsIndex'))
const ProductNew = lazy(() => import('@/pages/admin/products/ProductNew'))
const ProductEdit = lazy(() => import('@/pages/admin/products/ProductEdit'))
const ProductImagesIndex = lazy(() => import('@/pages/admin/product-images/ProductImagesIndex'))
const ProductVariantsIndex = lazy(() => import('@/pages/admin/product-variants/ProductVariantsIndex'))
const CategoriesIndex = lazy(() => import('@/pages/admin/categories/CategoriesIndex'))
const PostersIndex = lazy(() => import('@/pages/admin/posters/PostersIndex'))
const CollectionsIndex = lazy(() => import('@/pages/admin/collections/CollectionsIndex'))
const CustomersIndex = lazy(() => import('@/pages/admin/customers/CustomersIndex'))
const CustomerDetail = lazy(() => import('@/pages/admin/customers/CustomerDetail'))
const ShippingProvidersIndex = lazy(() => import('@/pages/admin/shipping-providers/ShippingProvidersIndex'))
const CodAreasIndex = lazy(() => import('@/pages/admin/cod-areas/CodEligibilityIndex'))
const ReconciliationIndex = lazy(() => import('@/pages/admin/cod-reconciliation/ReconciliationIndex'))
const ReconciliationRunDetail = lazy(() => import('@/pages/admin/cod-reconciliation/RunDetail'))
const PromotionsIndex = lazy(() => import('@/pages/admin/promotions/PromotionsIndex'))
const DeliveryStaffIndex = lazy(() => import('@/pages/admin/delivery-staff/DeliveryStaffIndex'))
const FeedbackIndex = lazy(() => import('@/pages/admin/feedback/FeedbackIndex'))

export const adminRoutes: RouteObject[] = [
  {
    path: '/admin',
    Component: RequireAdminRoute,
    children: [
      {
        Component: AdminLayout,
        children: [
          { index: true, Component: AdminDashboard },
          { path: 'finance', Component: FinanceDashboard },
          { path: 'orders', Component: OrdersIndex },
          { path: 'orders/:id', Component: OrderDetail },
          { path: 'cod-dashboard', Component: CodDashboard },
          { path: 'products', Component: ProductsIndex },
          { path: 'products/new', Component: ProductNew },
          { path: 'products/:productId', Component: ProductEdit },
          { path: 'product-images', Component: ProductImagesIndex },
          { path: 'product-variants', Component: ProductVariantsIndex },
          { path: 'categories', Component: CategoriesIndex },
          { path: 'posters', Component: PostersIndex },
          { path: 'collections', Component: CollectionsIndex },
          { path: 'delivery-staff', Component: DeliveryStaffIndex },
          { path: 'customers', Component: CustomersIndex },
          { path: 'customers/:id', Component: CustomerDetail },
          { path: 'shipping-providers', Component: ShippingProvidersIndex },
          { path: 'cod-areas', Component: CodAreasIndex },
          { path: 'cod-reconciliation', Component: ReconciliationIndex },
          { path: 'cod-reconciliation/runs/:id', Component: ReconciliationRunDetail },
          { path: 'promotions', Component: PromotionsIndex },
          { path: 'feedback', Component: FeedbackIndex },
        ],
      },
    ],
  },
]
