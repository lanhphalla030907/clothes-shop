import { lazy } from 'react'

export const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))
export const ProductsIndex = lazy(() => import('@/pages/admin/products/ProductsIndex'))
export const ProductNew = lazy(() => import('@/pages/admin/products/ProductNew'))
export const ProductEdit = lazy(() => import('@/pages/admin/products/ProductEdit'))
export const ProductImagesIndex = lazy(() => import('@/pages/admin/product-images/ProductImagesIndex'))
export const ProductVariantsIndex = lazy(() => import('@/pages/admin/product-variants/ProductVariantsIndex'))
export const CategoriesIndex = lazy(() => import('@/pages/admin/categories/CategoriesIndex'))
export const PostersIndex = lazy(() => import('@/pages/admin/posters/PostersIndex'))
export const ShippingProvidersIndex = lazy(() => import('@/pages/admin/shipping-providers/ShippingProvidersIndex'))
export const CodAreasIndex = lazy(() => import('@/pages/admin/cod-areas/CodEligibilityIndex'))
