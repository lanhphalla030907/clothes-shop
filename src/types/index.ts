import type {
  CatalogueVariant,
  MoneyString,
  ProductStatus,
  UUID,
} from './api'

/**
 * Free text, not a fixed union: the catalogue decides what a category is called,
 * and the storefront only ever prints it. Pinning the four names this release
 * happened to use would make every future category a code change.
 */
export type ProductCategory = string

/** `All` is the sentinel for "no category filter"; any other value is a name. */
export type CategoryFilter = 'All' | (string & {})


export interface ProductColor {
  name: string
  hex: string
}

/**
 * The art-directed hero set — the pieces suspended on the rail in the landing
 * page's opening scene, along with the cut-out geometry that hangs them on it.
 *
 * This is a design fixture, not the catalogue: it is what the homepage needs to
 * place a garment at a precise height on an invisible rail, and nothing the
 * catalogue serves describes that. Every screen a shopper buys from uses
 * `CataloguePiece` instead.
 */
export interface Product {
  id: string
  name: string
  category: ProductCategory
  price: number
  description: string
  /** Editorial long-form copy shown on the product page. */
  details: string
   garmentHeightCm?: number
  images: string[]
  sizes: string[]
  colors: ProductColor[]
  /** Free-feeling field used for the micro caption under the name. */
  tagline: string
  /** Index of the new-release flag used by the "01 / NEW" chrome. */
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
   * Where the rail crosses the cut-out, as a fraction (0-1) of the image
   * height measured from the top edge.
   *
   * This replaces the old pixel nudges because the hook lands at a different
   * depth in every photograph *and* the piece scales with the viewport: a
   * fraction holds the alignment at any size, so every hook stays on the rail
   * at every breakpoint instead of drifting as the image grows.
   *
   * Set it to where the hook should meet the rail — the bottom of its curl, so
   * the stem below the curl hangs off the line and the curl rides over it.
   */
  hookY?: number
  /**
   * Where the garment's hem sits, as a fraction (0-1) of the image height from
   * the top edge. Used to drop the soft ground shadow under the actual cloth
   * rather than under the bottom of the transparent canvas.
   */
  hemY?: number
  /**
   * Fine trim on top of `hookY`, in pixels, for the last one or two rows.
   *
   * `hookY` gets the piece onto the rail at any size; this covers what a
   * fraction cannot — a cut-out whose hook is a pixel or two off because of how
   * it was cropped, or a nudge to line the four hooks up with each other rather
   * than with the rail. Positive drops the piece, negative lifts it, matching
   * the old `cutoutOffsetY` convention.
   *
   * Prefer it over editing `hookY`: a few pixels here survives a resize, whereas
   * a few pixels baked into a fraction do not.
   */
  hookOffsetPx?: number
  /**
   * The cut-out's own aspect ratio, **height ÷ width**, read off the source PNG.
   *
   * Needed to size pieces against each other rather than against their
   * canvases. Two cut-outs with identical `hookY`/`hemY` can still show their
   * clothing at very different sizes purely because the PNGs are different
   * shapes, and that difference is invisible until you measure it.
   *
   * Note the direction: this is height/width, so a portrait cut-out is greater
   * than 1 (a 768×1024 PNG is `1.3333`). The renderer multiplies it by the
   * garment's span to get its hanging length in units of its own width, which is
   * why an inverted value here shrinks every piece and drops the hooks off the
   * rail. If you work in width/height by habit, convert with `h / w`.
   */
  cutoutAspect?: number
  /**
   * Art-direction multiplier on the measured size, on top of the automatic
   * equalisation. `1` leaves the piece exactly as long as the bar's reference
   * garment; `1.15` hangs it 15% longer; `0.9` reads 10% smaller.
   *
   * This is a *relative* control, not an absolute size: the bar re-normalises so
   * its largest piece is always the reference, which means this can never push
   * the rack off the screen no matter how large a number goes in.
   *
   * Leave it unset to inherit the category's default — tops share a torso
   * length, trousers hang longer, outerwear sits just below the tops. Reach for
   * it only when one piece needs to break from its category, e.g. a deliberately
   * cropped shirt or an oversized coat.
   */
  pieceScale?: number
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

/* ------------------------------------------------------------------ *
 * Catalogue pieces
 *
 * What the storefront draws. These are *not* API records: `GET /products`
 * arrives without images, variants or stock, and prices are the server's
 * two-decimal strings rather than the local demo's numbers. The mapping lives
 * in `features/catalogue/present.ts` so no component joins the catalogue
 * itself.
 * ------------------------------------------------------------------ */

export interface CataloguePiece {
  id: UUID
  slug: string
  name: string
  /** Category name for display; `''` when the category could not be resolved. */
  category: string
  /** Stable name for a category link. Empty when the category is unknown. */
  categorySlug: string
  categoryId: UUID
  /** Always the server's figure — the base price or the cheapest variant's. */
  price: MoneyString
  /** Primary image first, then `sortOrder`. Empty until a product has imagery. */
  images: string[]
  /** False once a product leaves the collection — retired or switched off. */
  isAvailable: boolean
}

export interface CatalogueAxisValue {
  value: string
  /** Set only when the value is itself a colour token, so a swatch is honest. */
  hex: string | undefined
  /** Some variant reachable through the rest of the selection offers this. */
  isAvailable: boolean
}

/** One axis of the variant matrix: `Color`, `Size`, or whatever else is declared. */
export interface CatalogueAxis {
  name: string
  values: CatalogueAxisValue[]
}

/** Chosen option values, keyed by axis name exactly as the API spelled it. */
export type OptionSelection = Record<string, string>

export interface CatalogueDetail extends CataloguePiece {
  description: string | null
  status: ProductStatus
  /** Every active variant, sold out ones included, so they can be shown as such. */
  variants: CatalogueVariant[]
  /** Colour first, then size, then any other axis, in declaration order. */
  axes: CatalogueAxis[]
}