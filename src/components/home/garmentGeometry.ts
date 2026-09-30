import type { Product, ProductCategory } from '@/types'

export const DEFAULT_HOOK_Y = 0
export const DEFAULT_HEM_Y = 1
export const FALLBACK_ASPECT = 1

export const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1)

export const round2 = (value: number, dp = 2) => {
  const f = 10 ** dp
  return Math.round(value * f) / f
}

export const clothSpan = (product: Product) =>
  Math.max((product.hemY ?? DEFAULT_HEM_Y) - (product.hookY ?? DEFAULT_HOOK_Y), 0.05)

const CATEGORY_HEIGHT_CM: Record<ProductCategory, number> = {
  Tops: 70,
  Bottoms: 105,
  Outerwear: 85,
  Accessories: 20,
}

export const pieceHeightCm = (product: Product): number =>
  product.garmentHeightCm ?? CATEGORY_HEIGHT_CM[product.category] ?? 70

export const pieceScale = (product: Product): number => {
  if (product.pieceScale != null) return product.pieceScale
  switch (product.category) {
    case 'Bottoms':
      return 1.05
    case 'Outerwear':
      return 1.02
    case 'Accessories':
      return 0.6
    default:
      return 1
  }
}

export const pieceMetrics = (product: Product) => {
  const span = clothSpan(product)
  const aspect = product.cutoutAspect ?? FALLBACK_ASPECT
  return { len: span * aspect, canvas: 1 / span }
}