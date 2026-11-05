import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/**
 * The frame shared by sign-in and registration.
 *
 * The storefront keeps its poster voice on the left panel — display type,
 * hairline rules, the same black-and-bone palette as the home page — while the
 * form itself is a plain, readable column. That division is deliberate: the
 * editorial face sets the tone, and the form does not ask anyone to decode
 * condensed capitals while typing a password.
 */
type AuthShellProps = {
  /** Small label above the form heading, e.g. `Sign in`. */
  eyebrow: string
  title: string
  description: string
  children: ReactNode
  /** The "already have an account?" line. */
  footer: ReactNode
}

export function AuthShell({ eyebrow, title, description, children, footer }: AuthShellProps) {
  return (
    <section className="container-editorial pt-24 pb-20 sm:pt-32 sm:pb-28">
      <div className="mx-auto grid max-w-5xl border border-line bg-paper lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        {/* Editorial panel — hidden below lg, where the form is the whole page. */}
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-ink p-10 text-paper lg:flex xl:p-12">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-16 -right-20 size-72 rounded-full border border-paper/10"
          />
          <div className="relative">
            <p className="eyebrow text-paper/50">CTRL account</p>
            <p className="type-display mt-8 text-[3.75rem] leading-[0.82]">
              Wear
              <br />
              the
              <br />
              archive.
            </p>
            <p className="mt-8 max-w-xs text-[13.5px] leading-relaxed text-paper/65">
              One account keeps your bag, saved pieces and every order together — on the studio
              server, not in this browser.
            </p>
          </div>

          <ul className="relative mt-16 space-y-3 border-t border-paper/15 pt-6 text-[12.5px] leading-relaxed text-paper/70">
            <li className="flex gap-3">
              <span aria-hidden className="mt-2 h-px w-4 shrink-0 bg-paper/40" />
              Orders and their delivery status
            </li>
            <li className="flex gap-3">
              <span aria-hidden className="mt-2 h-px w-4 shrink-0 bg-paper/40" />
              A wishlist that follows the account
            </li>
            <li className="flex gap-3">
              <span aria-hidden className="mt-2 h-px w-4 shrink-0 bg-paper/40" />
              Saved addresses for a shorter checkout
            </li>
          </ul>
        </aside>

        <div className="p-6 sm:p-10 xl:p-12">
          <p className="eyebrow text-graphite">{eyebrow}</p>
          <h1 className="mt-2.5 text-[1.75rem] leading-tight font-semibold tracking-[-0.025em] text-ink sm:text-[2rem]">
            {title}
          </h1>
          <p className="mt-3 max-w-md text-[14.5px] leading-relaxed text-graphite">{description}</p>

          <div className="mt-8">{children}</div>

          <div className="mt-8 border-t border-line pt-5 text-[13.5px] text-graphite">{footer}</div>
        </div>
      </div>
    </section>
  )
}

/** The text link used in the footer of both auth screens. */
export const AuthLink = ({ to, children }: { to: string; children: ReactNode }) => (
  <Link
    to={to}
    className="font-medium text-ink underline decoration-line underline-offset-4 transition-colors hover:decoration-ink"
  >
    {children}
  </Link>
)
