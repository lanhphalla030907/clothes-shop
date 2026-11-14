import { apiDelete, apiGetOne, apiPatch } from '@/lib/api/client'
import { API } from '@/lib/api/config'

export type NotificationData = {
  entityType: 'ORDER' | 'VARIANT'
  entityId: string
  route: string
  orderNumber?: string
}

export type AppNotification = {
  id: string
  type: string
  title: string
  message: string
  data: NotificationData | null
  readAt: string | null
  createdAt: string
}

export type NotificationPage = {
  items: AppNotification[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export const fetchNotifications = (page = 1, limit = 20, signal?: AbortSignal) =>
  apiGetOne<NotificationPage>(API.notifications, { signal, query: { page, limit } })

export const fetchUnreadNotificationCount = (signal?: AbortSignal) =>
  apiGetOne<{ count: number }>(`${API.notifications}/unread-count`, { signal })

export const markNotificationRead = (id: string) =>
  apiPatch<AppNotification>(`${API.notifications}/${id}/read`, undefined)

export const markAllNotificationsRead = () =>
  apiPatch<{ updated: number }>(`${API.notifications}/read-all`, undefined)

export const deleteNotification = (id: string) => apiDelete<void>(`${API.notifications}/${id}`)
