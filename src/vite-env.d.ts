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
  /** Google OAuth Client ID for Google Identity Services. */
  readonly VITE_GOOGLE_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  google?: {
    accounts: {
      id: {
        initialize: (config: {
          client_id: string
          callback: (response: { credential: string; select_by?: string }) => void
          auto_select?: boolean
          cancel_on_tap_outside?: boolean
          nonce?: string
        }) => void
        renderButton: (
          parent: HTMLElement,
          options: {
            type?: 'standard' | 'icon'
            theme?: 'outline' | 'filled_blue' | 'filled_black'
            size?: 'large' | 'medium' | 'small'
            text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
            shape?: 'rectangular' | 'pill' | 'circle' | 'square'
            logo_alignment?: 'left' | 'center'
            width?: number | string
            locale?: string
          },
        ) => void
        prompt: (momentListener?: (notification: unknown) => void) => void
        disableAutoSelect: () => void
      }
    }
  }
}