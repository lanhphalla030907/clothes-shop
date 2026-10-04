/// <reference types="vite/client" />

/**
 * Build-time configuration for the storefront.
 *
 * Declared rather than inferred so `import.meta.env.VITE_API_BASE_URL` is a
 * `string` instead of `any`, and so an unknown variable is a type error rather
 * than a silent `undefined` at runtime.
 */
interface ImportMetaEnv {
  /** Origin + path prefix the API is served from. Defaults to `/api` in dev. */
  readonly VITE_API_BASE_URL?: string
  /** Where the dev proxy forwards `/api`. Defaults to `http://localhost:3000`. */
  readonly VITE_API_PROXY_TARGET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}