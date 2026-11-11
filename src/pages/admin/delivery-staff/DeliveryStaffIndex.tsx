import DeliveryStaffManagement from '@/features/adminUsers/DeliveryStaffManagement'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'

/**
 * Dedicated Delivery Staff management page.
 *
 * Delivery staff accounts were previously managed from the Studio Overview.
 * They now have their own page under the Delivery section of the admin
 * navigation. The create form, active staff list, validation and API calls
 * are all reused unchanged from DeliveryStaffManagement.
 */
export default function DeliveryStaffIndex() {
  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Delivery"
        title="Delivery staff"
        description="Create active courier accounts and view staff eligible for delivery assignments."
      />

      <DeliveryStaffManagement />
    </div>
  )
}
