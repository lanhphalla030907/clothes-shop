import type { RouteObject } from 'react-router-dom'
import { RequireAdminRoute } from '@/app/adminGuard'
import { AdminLayout } from '@/layouts/admin/AdminLayout'
import { lazy } from 'react'

const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))
const ProductsIndex = lazy(() => import('@/pages/admin/products/ProductsIndex'))
const ProductNew = lazy(() => import('@/pages/admin/products/ProductNew'))
const ProductEdit = lazy(() => import('@/pages/admin/products/ProductEdit'))
const CategoriesIndex = lazy(() => import('@/pages/admin/categories/CategoriesIndex'))

export const adminRoutes: RouteObject[] = [
  {
    path: '/admin',
    Component: RequireAdminRoute,
    children: [
      {
        Component: AdminLayout,
        children: [
          { index: true, Component: AdminDashboard },
          { path: 'products', Component: ProductsIndex },
          { path: 'products/new', Component: ProductNew },
          { path: 'products/:productId', Component: ProductEdit },
          { path: 'categories', Component: CategoriesIndex },
        ],
      },
    ],
  },
]
