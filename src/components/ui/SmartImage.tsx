import { useState } from 'react'
import { motion } from 'framer-motion'

interface SmartImageProps {
  src: string
  alt: string
  className?: string
  /** Tailwind object-position override, e.g. "object-top". */
  position?: string
  /** How the image fills its box. Defaults to `cover` so a plate has no letterboxing;
   * `contain` is reserved for views that must show the uncropped source image. */
  fit?: 'cover' | 'contain'
  sizes?: string
  priority?: boolean
  /** Skeleton shimmer while decoding. */
  shimmer?: boolean
  /** When false, omit the wrapper/shimmer background so the image's own background shows. */
  background?: boolean
}

/**
 * Image that fades in on decode and shows a quiet placeholder while loading
 * or failing, so a slow CDN never flashes a broken-image glyph.
 */
export function SmartImage({
  src,
  alt,
  className = '',
  position,
  fit = 'cover',
  priority = false,
  shimmer = true,
  sizes,
  background = true,
}: SmartImageProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  // Product plates fill their frame edge to edge (cover + center); only callers
  // that explicitly ask for `contain` opt out of that behaviour.
  const fitClass = fit === 'contain' ? 'object-contain' : 'object-cover'
  const positionClass = position ?? 'object-center'

  return (
    <span
      className={`relative flex h-full w-full items-center justify-center overflow-hidden ${
        background ? 'bg-bone' : 'bg-transparent'
      } ${className}`}
    >
      {shimmer && status === 'loading' && (
        <span aria-hidden className={`absolute inset-0 animate-pulse ${background ? 'bg-bone' : 'bg-transparent'}`} />
      )}

      {status !== 'error' ? (
        <motion.img
          src={src}
          alt={alt}
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          draggable={false}
          onLoad={() => setStatus('ready')}
          onError={() => setStatus('error')}
          initial={false}
          animate={{ opacity: status === 'ready' ? 1 : 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className={`h-full w-full ${fitClass} ${positionClass} select-none bg-transparent`}
        />
      ) : (
        <span className={`absolute inset-0 grid place-items-center ${background ? 'bg-bone' : 'bg-transparent'} text-center text-[10px] tracking-[0.2em] text-ash uppercase`}>
          {alt}
        </span>
      )}
    </span>
  )
}