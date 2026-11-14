import { useEffect, useState } from 'react'
import { CheckCheck, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/account/PageHeader'
import { deleteNotification, fetchNotifications, markAllNotificationsRead, markNotificationRead, type AppNotification } from '@/features/notifications/api'

export default function Notifications() {
  const navigate = useNavigate()
  const [items, setItems] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    void fetchNotifications(1, 100, controller.signal).then((page) => setItems(page.items)).catch(() => setError(true)).finally(() => setLoading(false))
    return () => controller.abort()
  }, [])

  const open = (item: AppNotification) => {
    if (item.readAt === null) void markNotificationRead(item.id).catch(() => undefined)
    setItems((current) => current.map((row) => row.id === item.id ? { ...row, readAt: row.readAt ?? new Date().toISOString() } : row))
    if (item.data?.route) navigate(item.data.route)
  }

  return <section className="container-editorial py-28 sm:py-32"><PageHeader eyebrow="Account" title="Notifications" description="Updates about your orders and account activity." /><div className="mt-8 max-w-3xl border border-line bg-paper"><div className="flex justify-end border-b border-line p-3"><button type="button" onClick={() => void markAllNotificationsRead().then(() => setItems((rows) => rows.map((row) => ({ ...row, readAt: row.readAt ?? new Date().toISOString() }))))} className="flex min-h-9 items-center gap-1.5 text-[12px] font-semibold text-graphite hover:text-ink"><CheckCheck size={15} /> Mark all as read</button></div>{loading && <p className="p-8 text-center text-graphite">Loading notifications…</p>}{error && <p className="p-8 text-center text-graphite">Notifications could not be loaded.</p>}{!loading && !error && items.length === 0 && <p className="p-8 text-center text-graphite">You’re all caught up.</p>}{items.map((item) => <article key={item.id} className={`flex gap-3 border-b border-line-soft p-4 ${item.readAt === null ? 'bg-bone/40' : ''}`}><button type="button" onClick={() => open(item)} className="min-w-0 flex-1 text-left"><h2 className="text-[14px] font-semibold text-ink">{item.title}</h2><p className="mt-1 text-[13px] text-graphite">{item.message}</p></button><button type="button" aria-label="Delete notification" onClick={() => void deleteNotification(item.id).then(() => setItems((rows) => rows.filter((row) => row.id !== item.id)))} className="self-start text-graphite hover:text-signal"><Trash2 size={16} /></button></article>)}</div></section>
}
