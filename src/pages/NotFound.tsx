import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Action } from '@/components/ui/Action'

export default function NotFound() {
  return (
    <section className="container-editorial flex min-h-[75svh] flex-col justify-center py-28">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="label-micro text-graphite"
      >
        Error 404
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.95, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        className="type-display mt-6 text-[18vw] leading-[0.82] sm:text-[10vw]"
      >
        Off the
        <br />
        rail
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
        className="mt-7 max-w-sm text-sm leading-relaxed text-graphite"
      >
        This page has been archived. The collection is still where you left it.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
        className="mt-9 flex flex-wrap gap-3"
      >
        <Action to="/shop" size="lg" withArrow>
          Shop the collection
        </Action>
        <Link
          to="/"
          className="label-micro flex h-14 items-center border-b border-ink px-1 transition-colors duration-500 ease-editorial hover:text-graphite sm:h-16"
        >
          Back to home
        </Link>
      </motion.div>
    </section>
  )
}
