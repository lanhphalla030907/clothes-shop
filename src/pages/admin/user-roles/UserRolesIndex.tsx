import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import UserRolesManagement from '@/features/adminUsers/UserRolesManagement'

export default function UserRolesIndex() {
  return <div className="space-y-8"><AdminPageHeader eyebrow="Access control" title="User roles" description="Manage permissions and account access independently." /><UserRolesManagement /></div>
}
