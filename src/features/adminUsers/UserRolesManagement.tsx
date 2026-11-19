import { useState } from 'react'
import { RefreshCw, ShieldCheck } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { Modal } from '@/components/account/Modal'
import { FormError, SelectField } from '@/components/account/Field'
import { EmptyState, ErrorState } from '@/components/account/States'
import { Skeleton } from '@/components/account/Skeleton'
import { useFeedback } from '@/context/feedbackContext'
import { changeUserRole, changeUserStatus, fetchAdminUsers } from './api'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { useMutation } from '@/hooks/useMutation'
import { toUserMessage } from '@/lib/api/errors'
import type { AdminUserRecord, AssignableUserRole } from '@/types/api'

const PAGE_SIZE = 10
const ROLE_OPTIONS: { value: AssignableUserRole; label: string }[] = [
  { value: 'CUSTOMER', label: 'USER' },
  { value: 'ADMIN', label: 'ADMIN' },
  { value: 'DELIVERY_STAFF', label: 'DELIVERY STAFF' },
]
const ROLE_LABELS: Record<AdminUserRecord['role'], string> = {
  CUSTOMER: 'USER', ADMIN: 'ADMIN', DELIVERY_MANAGER: 'DELIVERY MANAGER', DELIVERY_STAFF: 'DELIVERY STAFF',
}
const isAssignableRole = (role: AdminUserRecord['role']): role is AssignableUserRole =>
  role === 'CUSTOMER' || role === 'ADMIN' || role === 'DELIVERY_STAFF'

export default function UserRolesManagement() {
  const { showFeedback, confirmFeedback } = useFeedback()
  const [page, setPage] = useState(1)
  const users = useAsyncResource(
    (signal) => fetchAdminUsers({ page, limit: PAGE_SIZE }, signal),
    [page],
  )
  const [roleTarget, setRoleTarget] = useState<AdminUserRecord | null>(null)
  const [selectedRole, setSelectedRole] = useState<AssignableUserRole>('CUSTOMER')
  const roleMutation = useMutation(changeUserRole, {
    onSuccess: (user) => {
      users.refetch()
      setRoleTarget(null)
      showFeedback({ type: 'success', title: 'Role updated', message: `${user.firstName} ${user.lastName} is now ${ROLE_LABELS[user.role]}.` })
    },
    onError: (error) => showFeedback({ type: 'error', title: 'Role change failed', message: toUserMessage(error) }),
  })
  const statusMutation = useMutation(changeUserStatus, {
    onSuccess: (user) => {
      users.refetch()
      showFeedback({ type: 'success', title: 'Account status updated', message: `${user.firstName} ${user.lastName} is now ${user.status}.` })
    },
    onError: (error) => showFeedback({ type: 'error', title: 'Status change failed', message: toUserMessage(error) }),
  })

  const openRoleDialog = (user: AdminUserRecord) => {
    roleMutation.reset()
    setSelectedRole(isAssignableRole(user.role) ? user.role : 'CUSTOMER')
    setRoleTarget(user)
  }
  const saveRole = async () => {
    if (!roleTarget || roleMutation.isPending) return
    const confirmed = await confirmFeedback({ type: 'warning', title: 'Change user role?', message: `${roleTarget.firstName} ${roleTarget.lastName} will change from ${ROLE_LABELS[roleTarget.role]} to ${ROLE_LABELS[selectedRole]}.`, confirmLabel: 'Change role', cancelLabel: 'Keep current role' })
    if (confirmed) await roleMutation.run(roleTarget.id, selectedRole)
  }
  const toggleStatus = async (user: AdminUserRecord) => {
    if (statusMutation.isPending) return
    const nextStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    const confirmed = await confirmFeedback({
      type: nextStatus === 'INACTIVE' ? 'warning' : 'confirmation',
      title: nextStatus === 'INACTIVE' ? 'Deactivate account?' : 'Reactivate account?',
      message: nextStatus === 'INACTIVE' ? `${user.firstName} ${user.lastName} will be signed out and unable to log in or use protected endpoints.` : `${user.firstName} ${user.lastName} will be able to sign in again.`,
      confirmLabel: nextStatus === 'INACTIVE' ? 'Deactivate' : 'Reactivate',
      cancelLabel: 'Cancel',
    })
    if (confirmed) await statusMutation.run(user.id, nextStatus)
  }

  const result = users.data
  const userList = result?.items ?? []
  const pagination = result?.pagination
  return <div className="space-y-5">
    <section className="overflow-hidden rounded-xl border border-line bg-paper-pure shadow-xs" aria-labelledby="user-roles-heading">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-canvas/30 px-5 py-4 sm:px-6">
        <div><p className="eyebrow text-graphite">Access control</p><h2 id="user-roles-heading" className="mt-2 text-[17px] font-semibold text-ink">User roles and account access</h2><p className="mt-1 text-[13px] leading-relaxed text-graphite">Roles determine permissions. Account status determines whether a user can access the system.</p></div>
        <Action size="sm" variant="outline" onClick={users.refetch} disabled={users.isRefreshing}><RefreshCw size={14} strokeWidth={1.7} aria-hidden className={users.isRefreshing ? 'animate-spin' : ''} />Refresh</Action>
      </div>
      <div className="p-5 sm:p-6">
        {users.isLoading ? <div className="space-y-3" aria-label="Loading users" role="status"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>
          : users.error !== undefined ? <ErrorState message={toUserMessage(users.error)} onRetry={users.refetch} />
            : userList.length === 0 ? <EmptyState align="left" eyebrow="No users" title="No users to manage" description="Registered users appear here." className="px-4 py-8" />
              : <><div className="overflow-x-auto"><table className="w-full min-w-[44rem] border-collapse text-left"><thead><tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wide text-graphite"><th scope="col" className="py-2.5 pr-4">User</th><th scope="col" className="py-2.5 pr-4">Role</th><th scope="col" className="py-2.5 pr-4">Account status</th><th scope="col" className="py-2.5 text-right">Actions</th></tr></thead><tbody className="divide-y divide-line-soft">{userList.map((user) => <tr key={user.id}><td className="py-3 pr-4"><span className="block truncate text-[13.5px] font-medium text-ink">{user.firstName} {user.lastName}</span><span className="block truncate text-[12px] text-graphite">{user.email}</span></td><td className="py-3 pr-4"><span className="inline-flex rounded-full border border-line bg-canvas px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-graphite">{ROLE_LABELS[user.role]}</span></td><td className="py-3 pr-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${user.status === 'ACTIVE' ? 'border-success/25 bg-success-soft text-success' : 'border-line bg-canvas text-graphite'}`}>{user.status}</span></td><td className="py-3 text-right"><span className="inline-flex gap-2"><Action size="sm" variant="outline" onClick={() => openRoleDialog(user)}>Change role</Action><Action size="sm" variant="outline" onClick={() => void toggleStatus(user)} disabled={statusMutation.isPending}>{user.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}</Action></span></td></tr>)}</tbody></table></div><div className="mt-4 flex items-center justify-between gap-3 text-[12px] text-graphite"><span>{pagination?.total ?? 0} users · {pagination?.totalPages ?? 0} pages · Page {pagination?.page ?? page}</span><span className="flex gap-2"><Action size="sm" variant="outline" disabled={page <= 1 || users.isRefreshing} onClick={() => setPage((current) => current - 1)}>Previous</Action><Action size="sm" variant="outline" disabled={pagination === undefined || page >= pagination.totalPages || users.isRefreshing} onClick={() => setPage((current) => current + 1)}>Next</Action></span></div></>}
      </div>
    </section>
    {roleTarget && <Modal title="Change user role" onClose={() => setRoleTarget(null)} footer={<><Action variant="outline" onClick={() => setRoleTarget(null)} disabled={roleMutation.isPending}>Cancel</Action><Action onClick={() => void saveRole()} disabled={roleMutation.isPending}><ShieldCheck size={15} strokeWidth={1.7} aria-hidden />{roleMutation.isPending ? 'Saving…' : 'Review change'}</Action></>}><p className="text-[13px] leading-relaxed text-graphite">Change the role for <strong className="font-semibold text-ink">{roleTarget.firstName} {roleTarget.lastName}</strong>. Current role: {ROLE_LABELS[roleTarget.role]}.</p><div className="mt-4"><SelectField label="New role" name="role" value={selectedRole} onChange={(event) => setSelectedRole(event.target.value as AssignableUserRole)}>{ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</SelectField></div>{roleMutation.error !== undefined && <div className="mt-4"><FormError message={toUserMessage(roleMutation.error)} /></div>}</Modal>}
  </div>
}
