import DeliveryStaffManagement from '@/features/adminUsers/DeliveryStaffManagement'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'

/**
 * Dedicated Delivery Staff management page.
 *
 * Courier account creation and status visibility belong on the delivery page.
 * Permission changes deliberately live on the dedicated User Roles page.
 */
export default function DeliveryStaffIndex() {
  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Delivery"
        title="Delivery staff"
        description="Create courier accounts and view their access status and assignment eligibility."
      />

      <DeliveryStaffManagement />
    </div>
  )
}
