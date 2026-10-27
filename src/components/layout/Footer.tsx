import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Check } from 'lucide-react'
import { navLinks } from '@/data/navigation'
import { Reveal } from '@/components/ui/Reveal'

const COLLECTIONS = ['Knitwear', 'Outerwear', 'Denim', 'Essentials'] as const

export function Footer() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email.trim()) return
    setSubscribed(true)
    setEmail('')
  }

  return (
    <footer className="mt-24 border-t border-line bg-paper sm:mt-32">
      {/* Oversized wordmark bleeds off the bottom edge */}
      <div className="container-editorial pt-16 sm:pt-24">
        <Reveal>
          <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-sm">
              <h2 className="type-display text-[11vw] leading-[0.85] sm:text-[7vw] lg:text-[4.4rem]">
                Stay
                <br />
                Ahead
              </h2>
              <p className="mt-6 max-w-xs text-sm leading-relaxed text-graphite">
                Release notes, restocks and studio dispatches. Sent when there is something worth
                saying.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 max-w-sm">
                <label htmlFor="footer-email" className="sr-only">
                  Email address
                </label>
                <div className="group flex items-center gap-3 border-b border-ink pb-3 transition-colors duration-500 focus-within:border-ink">
                  <input
                    id="footer-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="EMAIL ADDRESS"
                    className="label-micro w-full bg-transparent text-ink placeholder:text-ash focus:outline-none"
                  />
                  <button
                    type="submit"
                    aria-label="Subscribe"
                    className="shrink-0 text-ink transition-transform duration-500 ease-editorial hover:translate-x-1"
                  >
                    {subscribed ? (
                      <motion.span
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <Check size={16} strokeWidth={1.5} />
                      </motion.span>
                    ) : (
                      <ArrowRight size={16} strokeWidth={1.5} />
                    )}
                  </button>
                </div>
                {subscribed && (
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 font-mono text-[10px] tracking-[0.12em] text-graphite uppercase"
                  >
                    You are on the list
                  </motion.p>
                )}
              </form>
            </div>

            <div className="grid grid-cols-2 gap-x-10 gap-y-10 sm:grid-cols-3 sm:gap-x-16">
              <FooterColumn title="Navigate">
                {navLinks.map((link) => (
                  <FooterLink key={link.to} to={link.to}>
                    {link.label}
                  </FooterLink>
                ))}
                <FooterLink to="/dashboard/bag">Bag</FooterLink>
              </FooterColumn>

              <FooterColumn title="Collections">
                {COLLECTIONS.map((name) => (
                  <FooterLink key={name} to="/shop">
                    {name}
                  </FooterLink>
                ))}
              </FooterColumn>

              <FooterColumn title="Studio">
                <FooterLink to="/about">Manifesto</FooterLink>
                <a
                  href="mailto:studio@ctrl.example"
                  className="link-wipe text-left text-sm text-graphite transition-colors duration-400 ease-editorial hover:text-ink"
                >
                  Contact
                </a>
                <span className="text-sm text-graphite">Shipping</span>
                <span className="text-sm text-graphite">Returns</span>
              </FooterColumn>
            </div>
          </div>
        </Reveal>
      </div>

      
    </footer>
  )
}

const FooterColumn = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h3 className="label-micro mb-5 text-ash">{title}</h3>
    <ul className="flex flex-col gap-3">{children}</ul>
  </div>
)

const FooterLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <li>
    <Link
      to={to}
      className="link-wipe inline-block text-sm text-graphite transition-colors duration-400 ease-editorial hover:text-ink"
    >
      {children}
    </Link>
  </li>
)
