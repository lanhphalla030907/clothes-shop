import { lazy } from 'react'

export const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))
export const ProductsIndex = lazy(() => import('@/pages/admin/products/ProductsIndex'))
export const ProductNew = lazy(() => import('@/pages/admin/products/ProductNew'))
export const ProductEdit = lazy(() => import('@/pages/admin/products/ProductEdit'))
export const CategoriesIndex = lazy(() => import('@/pages/admin/categories/CategoriesIndex'))
