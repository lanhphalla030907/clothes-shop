import { useState } from 'react'
import { motion } from 'framer-motion'

interface SmartImageProps {
  src: string
  alt: string
  className?: string
  /** Tailwind object-position override, e.g. "object-top". */
  position?: string
  /** How the image fills its box. `contain` never crops the product. */
  fit?: 'cover' | 'contain'
  sizes?: string
  priority?: boolean
  /** Skeleton shimmer while decoding. */
  shimmer?: boolean
}

/**
 * Image that fades in on decode and shows a quiet placeholder while loading
 * or failing, so a slow CDN never flashes a broken-image glyph.
 */
export function SmartImage({
  src,
  alt,
  className = '',
  position = 'object-center',
  fit = 'cover',
  priority = false,
  shimmer = true,
  sizes,
}: SmartImageProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const fitClass = fit === 'contain' ? 'object-contain' : 'object-cover'

  return (
    <span className={`relative block h-full w-full overflow-hidden bg-bone ${className}`}>
      {shimmer && status === 'loading' && (
        <span aria-hidden className="absolute inset-0 animate-pulse bg-bone" />
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
          className={`h-full w-full ${fitClass} ${position} select-none`}
        />
      ) : (
        <span className="absolute inset-0 grid place-items-center bg-bone text-center text-[10px] tracking-[0.2em] text-ash uppercase">
          {alt}
        </span>
      )}
    </span>
  )
}