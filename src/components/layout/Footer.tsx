import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Globe, Mail, MessageCircle, Send } from 'lucide-react'
import { navLinks } from '@/data/navigation'

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
    <footer className="bg-canvas border-t border-line mt-16 sm:mt-24 pt-12 pb-6">
      <div className="container-editorial">
        
        {/* Main Footer Links Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 mb-12">
          
          {/* Column 1: Newsletter */}
          <div className="lg:col-span-4 flex flex-col pr-4">
            <h3 className="text-[15px] font-bold text-ink mb-2 uppercase tracking-wide">
              Welcome to LOMOR
            </h3>
            <p className="text-[13px] text-graphite mb-6 leading-relaxed max-w-sm">
              Experience the quickest way to shop, a personalized homepage and exclusive discounts.
            </p>
            
            <form onSubmit={handleSubmit} className="w-full max-w-sm mb-6">
              <label htmlFor="footer-email" className="sr-only">Email</label>
              <div className="relative">
                <input
                  id="footer-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full border border-line bg-canvas px-4 py-3 text-[13px] text-ink placeholder:text-graphite/50 focus:border-ink focus:outline-none transition-colors"
                />
                <button 
                  type="submit" 
                  aria-label="Subscribe" 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink hover:text-[var(--ctrl-red)] transition-colors"
                >
                  {subscribed ? <span className="text-[11px] font-bold uppercase text-[var(--ctrl-red)]">Joined</span> : <Send size={16} />}
                </button>
              </div>
            </form>
            
            {/* Social Icons */}
            <div className="flex items-center gap-4 mt-2">
              <a href="#" aria-label="Website" className="text-graphite hover:text-ink transition-colors">
                <Globe size={18} />
              </a>
              <a href="#" aria-label="Email" className="text-graphite hover:text-ink transition-colors">
                <Mail size={18} />
              </a>
              <a href="#" aria-label="Support" className="text-graphite hover:text-ink transition-colors">
                <MessageCircle size={18} />
              </a>
            </div>
          </div>

          {/* Column 2: About */}
          <div className="lg:col-span-3">
            <h3 className="text-[12px] font-bold text-ink mb-5 uppercase tracking-widest">About LOMOR</h3>
            <ul className="flex flex-col gap-3">
              <li><Link to="/about" className="text-[13px] text-graphite hover:text-ink transition-colors">Our Story</Link></li>
              <li><Link to="/careers" className="text-[13px] text-graphite hover:text-ink transition-colors">Careers</Link></li>
              <li><Link to="/press" className="text-[13px] text-graphite hover:text-ink transition-colors">Press</Link></li>
              <li><Link to="/sustainability" className="text-[13px] text-graphite hover:text-ink transition-colors">Sustainability</Link></li>
            </ul>
          </div>

          {/* Column 3: Customer Service */}
          <div className="lg:col-span-3">
            <h3 className="text-[12px] font-bold text-ink mb-5 uppercase tracking-widest">Customer Service</h3>
            <ul className="flex flex-col gap-3">
              <li><Link to="/contact" className="text-[13px] text-graphite hover:text-ink transition-colors">Contact Us</Link></li>
              <li><Link to="/shipping" className="text-[13px] text-graphite hover:text-ink transition-colors">Shipping & Delivery</Link></li>
              <li><Link to="/returns" className="text-[13px] text-graphite hover:text-ink transition-colors">Returns & Exchanges</Link></li>
              <li><Link to="/faq" className="text-[13px] text-graphite hover:text-ink transition-colors">FAQs</Link></li>
            </ul>
          </div>

          {/* Column 4: Shop */}
          <div className="lg:col-span-2">
            <h3 className="text-[12px] font-bold text-ink mb-5 uppercase tracking-widest">Shop</h3>
            <ul className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-[13px] text-graphite hover:text-ink transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
              <li><Link to="/dashboard/bag" className="text-[13px] text-graphite hover:text-ink transition-colors">Your Bag</Link></li>
            </ul>
          </div>
        </div>

        {/* BOTTOM ROW: Payments on Left, Copyright on Right */}
        <div className="border-t border-line pt-6 flex flex-col lg:flex-row items-center justify-between gap-6">
          
          {/* Left Side: We Accept Payments */}
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-[10px] font-bold text-ink uppercase tracking-widest">We Accept:</span>
            <div className="flex items-center gap-2">
              {/* Using real public CDN URLs so images load immediately. You can swap these with your own local paths later. */}
              <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSXGBGvIzWHbT6GrW-0a5CM9O5YwjF0X-5xccfW2oH4NQ&s=10" alt="Visa" className="h-5 sm:h-10 w-auto object-contain bg-white rounded px-1.5 py-0.5 border border-line" />
              <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS-d6IXVAcVMx-_n1WeVZY_JSUfARX4zMuZ9CUcF2xV4Q&s=10" alt="Mastercard" className="h-5 sm:h-6 w-auto object-contain bg-white rounded px-1.5 py-0.5 border border-line" />
              <img src="https://cdn.jsdelivr.net/gh/aaronfagan/svg-credit-card-payment-icons/flat/logo/jcb.svg" alt="JCB" className="h-5 sm:h-6 w-auto object-contain bg-white rounded px-1.5 py-0.5 border border-line" />
              <img src="https://cdn.jsdelivr.net/gh/aaronfagan/svg-credit-card-payment-icons/flat/logo/unionpay.svg" alt="UnionPay" className="h-5 sm:h-6 w-auto object-contain bg-white rounded px-1.5 py-0.5 border border-line" />
              <img src="https://cdn.jsdelivr.net/gh/aaronfagan/svg-credit-card-payment-icons/flat/logo/aba.svg" alt="ABA Pay" className="h-5 sm:h-6 w-auto object-contain bg-white rounded px-1.5 py-0.5 border border-line" onError={(e) => e.currentTarget.style.display = 'none'} />
              {/* Cash/Bank generic icons */}
              <div className="flex items-center gap-1 bg-white border border-line rounded px-1.5 py-0.5 h-5 sm:h-6">
                <span className="text-[9px] font-bold text-gray-600 uppercase">Bank Transfer</span>
              </div>
              <div className="flex items-center gap-1 bg-white border border-line rounded px-1.5 py-0.5 h-5 sm:h-6">
                <span className="text-[9px] font-bold text-gray-600 uppercase">COD</span>
              </div>
            </div>
          </div>

          {/* Right Side: Copyright & Legal */}
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <p className="text-[11px] text-graphite">
              © {new Date().getFullYear()} LOMOR Studio.
            </p>
            <div className="flex items-center gap-4">
              <Link to="/privacy" className="text-[11px] text-graphite hover:text-ink transition-colors">Privacy</Link>
              <Link to="/terms" className="text-[11px] text-graphite hover:text-ink transition-colors">Terms</Link>
            </div>
          </div>

        </div>

      </div>
    </footer>
  )
}