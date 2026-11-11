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
  <header className="flex flex-col gap-5 border-b border-line pb-7 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
    <div className="max-w-2xl">
      <p className="eyebrow text-graphite">{eyebrow}</p>
      <h1 className="mt-2.5 text-[1.65rem] leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-[2rem]">
        {title}
      </h1>
      {description && (
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-graphite">{description}</p>
      )}
    </div>
    {action && <div className="flex shrink-0 flex-wrap items-center gap-2.5">{action}</div>}
  </header>
)

export const BackLink = ({ to, children }: { to: string; children: ReactNode }) => (
  <Link
    to={to}
    className="inline-flex min-h-9 items-center gap-1.5 text-[13px] font-medium text-graphite transition-colors duration-200 hover:text-ink"
  >
    <ArrowLeft size={14} strokeWidth={1.6} aria-hidden />
    {children}
  </Link>
)

type PanelProps = {
  children: ReactNode
  className?: string
}

/** The bordered surface every screen panel is built from. */
export const Panel = ({ children, className = '' }: PanelProps) => (
  <section className={`overflow-hidden rounded-xl border border-line bg-paper-pure shadow-xs ${className}`}>{children}</section>
)

type PanelHeaderProps = {
  title: string
  hint?: string
  action?: ReactNode
}

export const PanelHeader = ({ title, hint, action }: PanelHeaderProps) => (
  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-line px-5 py-4 sm:px-6">
    <div className="min-w-0">
      <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
      {hint && <p className="mt-1 text-[13px] leading-relaxed text-graphite">{hint}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
)
