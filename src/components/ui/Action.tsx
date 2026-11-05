import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ComponentProps, ReactNode } from 'react'

/**
 * The single action primitive for the whole store.
 *
 * The geometry — square, wipe-up fill, inverting label — is the home page's.
 * What changed is the label: it is now set in 13px sans rather than 11px mono
 * uppercase. The same control has to work in a hero and in a settings form, and
 * the mono micro-label was the reason dashboard actions were hard to read.
 */
const base =
  'group relative inline-flex select-none items-center justify-center gap-2 overflow-hidden text-[13px] font-semibold tracking-[0.04em] uppercase ease-editorial transition-colors duration-500 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40'

const variants = {
  solid: 'bg-ink text-paper hover:text-ink',
  outline: 'border border-ink text-ink hover:text-paper',
  ghost: 'text-ink hover:text-graphite',
  soft: 'border border-line bg-bone text-ink hover:text-paper',
  warning: 'bg-warning text-white hover:text-warning',
} as const

const sizes = {
  sm: 'h-11 px-4',
  md: 'h-12 px-6',
  lg: 'h-14 px-8 sm:h-16 sm:px-10',
} as const

/** Colour of the wipe that rises from the base on hover. */
const fill = {
  solid: 'bg-paper',
  outline: 'bg-ink',
  ghost: 'bg-ink/5',
  soft: 'bg-ink',
  warning: 'bg-white',
} as const

type ActionProps = {
  children: ReactNode
  variant?: keyof typeof variants
  size?: keyof typeof sizes
  className?: string
  withArrow?: boolean
  /**
   * A button disables; a link or an anchor cannot, so a disabled one stops being
   * a link and is rendered inert instead of looking unavailable while navigating.
   */
  disabled?: boolean
} & (
  | ({ to: string } & Omit<ComponentProps<typeof Link>, 'to' | 'className' | 'children'>)
  | ({ href: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'className' | 'children'>)
  | ({ onClick?: () => void } & Omit<
      ButtonHTMLAttributes<HTMLButtonElement>,
      'className' | 'children' | 'onClick'
    >)
)

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

  const inert = () => (
    <span aria-disabled="true" className={`${classes} pointer-events-none cursor-not-allowed opacity-40`}>
      {inner}
    </span>
  )

  if ('to' in rest) {
    const { to, disabled, ...linkProps } = rest
    if (disabled) return inert()

    return (
      <Link to={to} className={classes} {...linkProps}>
        {inner}
      </Link>
    )
  }

  if ('href' in rest) {
    const { href, disabled, ...anchorProps } = rest
    if (disabled) return inert()

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
