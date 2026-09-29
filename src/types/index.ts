export type ProductCategory = 'Tops' | 'Bottoms' | 'Outerwear' | 'Accessories'

export type CategoryFilter = 'All' | ProductCategory

export interface ProductColor {
  name: string
  hex: string
}

export interface Product {
  id: string
  name: string
  category: ProductCategory
  price: number
  description: string
  /** Editorial long-form copy shown on the product page. */
  details: string
  images: string[]
  sizes: string[]
  colors: ProductColor[]
  /** Free-feeling field used for the micro caption under the name. */
  tagline: string
  /** Index of the new-release flag used for the "01 / NEW" chrome. */
  release: string
  featured?: boolean
  /**
   * Transparent cut-out of the piece, used where it is shown suspended from
   * a rail. Colours that the source photography could not match to the
   * release palette are corrected here instead of re-shooting.
   */
  cutout?: string
  cutoutFilter?: string
  /**
   * Nudges the cut-out so the hook already drawn into the artwork clears the
   * rail. Positive values drop the piece, negative values lift it. Needed
   * because the hook sits at a slightly different height in each photograph.
   */
  cutoutOffsetY?: number
}

export interface CartItem {
  lineId: string
  productId: string
  name: string
  category: ProductCategory
  price: number
  image: string
  size: string
  color: string
  quantity: number
}

export interface OrderSummary {
  orderId: string
  email: string
  name: string
  address: string
  city: string
  postalCode: string
  country: string
  items: CartItem[]
  subtotal: number
  shipping: number
  total: number
}
