import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { Bell, CheckCheck, ChevronRight, Trash2, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import {
  deleteNotification,
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from './api'

const formatTime = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** A shared, session-scoped notification bell for storefront and admin shells. */
export function NotificationCenter() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<AppNotification[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const panel = useRef<HTMLDivElement>(null)

  const refreshCount = () => {
    if (!isAuthenticated) return
    void fetchUnreadNotificationCount().then(({ count }) => setUnread(count)).catch(() => undefined)
  }

  const load = () => {
    if (!isAuthenticated) return
    setLoading(true)
    setError(false)
    void Promise.all([fetchNotifications(1, 8), fetchUnreadNotificationCount()])
      .then(([page, count]) => {
        setItems(page.items)
        setUnread(count.count)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    refreshCount()
    const timer = window.setInterval(refreshCount, 60_000)
    return () => window.clearInterval(timer)
  }, [isAuthenticated])

  useEffect(() => {
    if (!open) return
    load()
    const close = (event: MouseEvent) => {
      if (!panel.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  if (!isAuthenticated) return null

  const openNotification = (item: AppNotification) => {
    setOpen(false)
    if (item.readAt === null) {
      void markNotificationRead(item.id).then(() => setUnread((count) => Math.max(0, count - 1))).catch(() => undefined)
    }
    if (item.data?.route) navigate(item.data.route)
  }

  const markAll = () => {
    void markAllNotificationsRead().then(() => {
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })))
      setUnread(0)
    }).catch(() => setError(true))
  }

  const remove = (event: ReactMouseEvent, id: string) => {
    event.stopPropagation()
    const target = items.find((item) => item.id === id)
    void deleteNotification(id).then(() => {
      setItems((current) => current.filter((item) => item.id !== id))
      if (target?.readAt === null) setUnread((count) => Math.max(0, count - 1))
    }).catch(() => setError(true))
  }

  return (
    <div ref={panel} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        aria-expanded={open}
        className="relative grid size-10 place-items-center rounded-lg text-graphite transition-colors hover:bg-bone hover:text-ink"
      >
        <Bell size={18} strokeWidth={1.7} aria-hidden />
        {unread > 0 && <span className="absolute top-0.5 right-0.5 grid min-w-4 place-items-center rounded-full bg-ink px-1 font-mono text-[9px] leading-4 text-paper">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <section className="absolute right-0 z-[100] mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden border border-line bg-paper shadow-raised" aria-label="Notifications">
          <header className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-[14px] font-semibold text-ink">Notifications</h2>
            <div className="flex items-center gap-2">
              <button type="button" onClick={markAll} disabled={unread === 0} className="text-[11px] font-semibold tracking-wide text-graphite uppercase hover:text-ink disabled:opacity-40"><CheckCheck size={14} className="mr-1 inline" />Read all</button>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close notifications" className="text-graphite hover:text-ink"><X size={16} /></button>
            </div>
          </header>
          <div className="max-h-[min(60vh,32rem)] overflow-y-auto">
            {loading && <p className="px-4 py-8 text-center text-[13px] text-graphite">Loading notifications…</p>}
            {!loading && error && <p className="px-4 py-8 text-center text-[13px] text-graphite">Notifications could not be loaded.</p>}
            {!loading && !error && items.length === 0 && <p className="px-4 py-8 text-center text-[13px] text-graphite">You’re all caught up.</p>}
            {!loading && !error && items.map((item) => (
              <button key={item.id} type="button" onClick={() => openNotification(item)} className={`group flex w-full gap-3 border-b border-line-soft px-4 py-3 text-left transition-colors hover:bg-bone ${item.readAt === null ? 'bg-bone/45' : ''}`}>
                <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${item.readAt === null ? 'bg-ink' : 'bg-transparent'}`} />
                <span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold text-ink">{item.title}</span><span className="mt-0.5 block line-clamp-2 text-[12px] leading-relaxed text-graphite">{item.message}</span><span className="mt-1 block font-mono text-[10px] text-ash">{formatTime(item.createdAt)}</span></span>
                <span role="button" tabIndex={-1} onClick={(event) => remove(event, item.id)} aria-label="Delete notification" className="mt-1 opacity-0 transition-opacity group-hover:opacity-100"><Trash2 size={14} className="text-graphite hover:text-signal" /></span>
              </button>
            ))}
          </div>
          <Link to="/notifications" onClick={() => setOpen(false)} className="flex min-h-11 items-center justify-center gap-1 border-t border-line text-[12px] font-semibold text-ink transition-colors hover:bg-bone">View all <ChevronRight size={14} /></Link>
        </section>
      )}
    </div>
  )
}
