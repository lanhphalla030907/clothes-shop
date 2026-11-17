import { STOREFRONT_BASE_URL } from '@/lib/api/config'

export type DestinationType =
  | 'collection'
  | 'product'
  | 'register'
  | 'shop-all'
  | 'custom'

export const DESTINATION_OPTIONS: { value: DestinationType; label: string }[] =
  [
    { value: 'collection', label: 'Collection' },
    { value: 'product', label: 'Product' },
    { value: 'register', label: 'Register' },
    { value: 'shop-all', label: 'Shop All' },
    { value: 'custom', label: 'Custom URL' },
  ]

/** Resolve a storefront path into an absolute URL the backend's @IsUrl()
 *  validator accepts. Uses STOREFRONT_BASE_URL when configured, otherwise the
 *  current origin (admin and storefront share the same host). */
export const resolveStorefrontUrl = (path: string): string => {
  const base = STOREFRONT_BASE_URL || window.location.origin
  return new URL(path, base).href
}

export const destinationUrl = (
  type: DestinationType,
  destCollectionId: string | null,
  destProductId: string | null,
  customUrl: string,
  collections: readonly { id: string; slug: string }[],
  products: readonly { id: string }[],
): string => {
  switch (type) {
    case 'collection':
      if (destCollectionId) {
        const col = collections.find((c) => c.id === destCollectionId)
        return col ? resolveStorefrontUrl(`/collections/${col.slug}`) : ''
      }
      return ''
    case 'product':
      if (destProductId) {
        return products.find((p) => p.id === destProductId)
          ? resolveStorefrontUrl(`/product/${destProductId}`)
          : ''
      }
      return ''
    case 'register':
      return resolveStorefrontUrl('/register')
    case 'shop-all':
      return resolveStorefrontUrl('/shop')
    case 'custom':
      return customUrl
  }
}

export const inferDestinationType = (buttonUrl: string): DestinationType => {
  const path = new URL(buttonUrl, window.location.origin).pathname
  if (path.startsWith('/collections/')) return 'collection'
  if (path.startsWith('/product/')) return 'product'
  if (path === '/register') return 'register'
  if (path === '/shop') return 'shop-all'
  return 'custom'
}
