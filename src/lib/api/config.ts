/**
 * Every value the HTTP layer needs that is not a request or a response.
 *
 * There is exactly one place in the app that knows where the API lives; nothing
 * else reads `import.meta.env` for a URL, and no component ever concatenates a
 * base path by hand. That is what makes pointing the build at another host a
 * one-line change.
 */

/** Prefix stripped by the dev proxy in `vite.config.ts`. See that file. */
const DEV_API_PREFIX = '/api'

const rawBaseUrl: string =
  import.meta.env['VITE_API_BASE_URL']?.trim() ||
  // Same-origin by default so the browser never makes a cross-origin request
  // (the API sends no CORS headers) and no proxy is required in production.
  (import.meta.env.DEV ? DEV_API_PREFIX : '')

/** Normalised to exactly one trailing-slash-free form. */
export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '')

/** Hard ceiling on a single request. Long enough for a cold backend, short
 * enough that a hung socket surfaces as an error state instead of a spinner
 * that never resolves.
 */
export const REQUEST_TIMEOUT_MS = 20_000

/**
 * The currency to label cart figures with.
 *
 * `GET /cart` returns bare two-decimal strings with **no** currency of its own,
 * unlike an order, which carries one. So a cart subtotal has to be rendered in the
 * store's currency until an order exists to tell us otherwise — the amount is
 * still the server's, only its unit is the catalogue's default.
 */
export const STORE_CURRENCY = 'USD'

/** Paths, named once so a route change is a single-file edit. */
export const API = {
  login: '/auth/login',
  me: '/auth/me',
  products: '/products',
  categories: '/categories',
  adminProducts: '/admin/products',
  adminCategories: '/admin/categories',
  cart: '/cart',
  cartItems: '/cart/items',
  wishlist: '/wishlist',
  wishlistItems: '/wishlist/items',
  addresses: '/addresses',
  orders: '/orders',
  checkout: '/checkout',
  users: '/users',
} as const