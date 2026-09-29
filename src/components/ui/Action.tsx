import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ComponentProps, ReactNode } from 'react'

const base =
  'group relative inline-flex select-none items-center justify-center gap-2 overflow-hidden label-micro ease-editorial transition-colors duration-500 disabled:cursor-not-allowed disabled:opacity-40'

const variants = {
  solid: 'bg-ink text-paper hover:text-ink',
  outline: 'border border-ink text-ink hover:text-paper',
  ghost: 'text-ink hover:text-graphite',
} as const

const sizes = {
  sm: 'h-10 px-5',
  md: 'h-12 px-7',
  lg: 'h-14 px-8 sm:h-16 sm:px-12',
} as const

/** Colour of the wipe that rises from the base on hover. */
const fill = {
  solid: 'bg-paper',
  outline: 'bg-ink',
  ghost: 'bg-ink/5',
} as const

type ActionProps = {
  children: ReactNode
  variant?: keyof typeof variants
  size?: keyof typeof sizes
  className?: string
  withArrow?: boolean
} & (
  | ({ to: string } & Omit<ComponentProps<typeof Link>, 'to' | 'className' | 'children'>)
  | ({ href: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'className' | 'children'>)
  | ({ onClick?: () => void } & Omit<
      ButtonHTMLAttributes<HTMLButtonElement>,
      'className' | 'children' | 'onClick'
    >)
)

/**
 * The single action primitive for the whole store: a wipe rises from the base
 * on hover and the label inverts, giving every button the same tactile feel.
 */
export function Action({
  children,
  variant = 'solid',
  size = 'md',
  className = '',
  withArrow = false,
  ...rest
}: ActionProps) {
  const classes = `${base} ${variants[variant]} ${sizes[size]} ${className}`

  const inner = (
    <>
      <span
        aria-hidden
        className={`absolute inset-0 origin-bottom scale-y-0 ${fill[variant]} transition-transform duration-500 ease-editorial group-hover:scale-y-100`}
      />
      <span className="relative z-10 flex items-center gap-2">
        {children}
        {withArrow && (
          <ArrowUpRight
            size={14}
            strokeWidth={1.5}
            className="transition-transform duration-500 ease-editorial group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        )}
      </span>
    </>
  )

  if ('to' in rest) {
    const { to, ...linkProps } = rest
    return (
      <Link to={to} className={classes} {...linkProps}>
        {inner}
      </Link>
    )
  }

  if ('href' in rest) {
    const { href, ...anchorProps } = rest
    return (
      <a href={href} className={classes} {...anchorProps}>
        {inner}
      </a>
    )
  }

  const { onClick, type = 'button', ...buttonProps } = rest
  return (
    <button type={type} onClick={onClick} className={classes} {...buttonProps}>
      {inner}
    </button>
  )
}
