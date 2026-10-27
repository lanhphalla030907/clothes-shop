import { Outlet } from 'react-router-dom'
import { AdminForbidden, AdminLoading, AdminUnauthorized } from '@/components/admin/AdminGuardStates'
import { useAuth } from '@/features/auth/useAuth'

export function RequireAdminRoute() {
  const { isInitializing, isAuthenticated, user } = useAuth()

  if (isInitializing) {
    return <AdminLoading />
  }
  if (!isAuthenticated) {
    return <AdminUnauthorized />
  }
  if (user?.role !== 'ADMIN') {
    return <AdminForbidden />
  }

  return <Outlet />
}
