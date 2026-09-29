/**
 * Single source of truth for catalogue imagery.
 * Every asset is served from a stable, verified CDN host so the storefront
 * never renders a broken frame. Width/quality params are tuned per use.
 */
const pexels = (id: number, width = 1200) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=${width}`

export const IMG = {
  /** 4:5 editorial plates — used on cards, rail and galleries. */
  plate: (id: number) => pexels(id, 1100),
  /** Wide crops — used for full-bleed editorial bands. */
  wide: (id: number) => pexels(id, 1800),
  /** Small square thumbnails — used inside the cart drawer. */
  thumb: (id: number) => pexels(id, 240),
} as const
