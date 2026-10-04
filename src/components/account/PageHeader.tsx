import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

/**
 * The account page frame: a title block, an optional back link, and content.
 *
 * One heading level per page and a single place for it, so every account screen
 * has the same vertical rhythm and the document outline stays flat — the sidebar
 * already labels the page for assistive tech, and a second `h1` in the content
 * would only compete with it.
 */

type PageHeaderProps = {
  eyebrow: string
  title: string
  description?: string
  /** Rendered opposite the title on wide screens. */
  action?: ReactNode
}

export const PageHeader = ({ eyebrow, title, description, action }: PageHeaderProps) => (
  <header className="flex flex-col gap-6 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
    <div className="max-w-2xl">
      <p className="label-micro text-ash">{eyebrow}</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{title}</h1>
      {description && (
        <p className="mt-4 text-sm leading-relaxed text-graphite">{description}</p>
      )}
    </div>
    {action && <div className="flex shrink-0 items-center gap-3">{action}</div>}
  </header>
)

export const BackLink = ({ to, children }: { to: string; children: ReactNode }) => (
  <Link
    to={to}
    className="label-micro inline-flex items-center gap-2 text-graphite transition-colors duration-300 hover:text-ink"
  >
    <ArrowLeft size={12} strokeWidth={1.5} />
    {children}
  </Link>
)

type PanelProps = {
  children: ReactNode
  className?: string
}

/** The bordered surface every account screen is built from. */
export const Panel = ({ children, className = '' }: PanelProps) => (
  <section className={`border border-line bg-paper ${className}`}>{children}</section>
)

type PanelHeaderProps = {
  title: string
  hint?: string
  action?: ReactNode
}

export const PanelHeader = ({ title, hint, action }: PanelHeaderProps) => (
  <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
    <div className="min-w-0">
      <h2 className="label-micro text-ink">{title}</h2>
      {hint && <p className="mt-2 text-xs leading-relaxed text-graphite">{hint}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
)
