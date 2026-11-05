import { useNavigate } from 'react-router-dom'
import { Action } from '@/components/ui/Action'
import { BackLink } from '@/components/account/PageHeader'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { EmptyState, ErrorState } from '@/components/account/States'
import { SkeletonText } from '@/components/account/Skeleton'
import { ProductForm } from '@/features/adminProducts/components/ProductForm'
import { createAdminProduct } from '@/features/adminProducts/api'
import { useAdminCategories } from '@/features/adminProducts/useAdminProducts'
import { useMutation } from '@/hooks/useMutation'
import { useFeedback } from '@/context/feedbackContext'
import { toUserMessage } from '@/lib/api/errors'
import { productFormValuesToRequest, type CreateProductRequest } from '@/types/api'

/**
 * `POST /admin/products`.
 *
 * On success the API answers the full created record, so this screen lets the
 * server name the destination and navigates there — no id is invented locally.
 * The edit page greets the administrator with a "created" notice via router
 * state.
 */
export default function ProductNew() {
  const navigate = useNavigate()
  const { showFeedback } = useFeedback()
  const categories = useAdminCategories()
  const createMutation = useMutation((body: CreateProductRequest) => createAdminProduct(body))

  return (
    <div className="max-w-3xl space-y-8">
      <BackLink to="/admin/products">All products</BackLink>

      <AdminPageHeader
        eyebrow="Catalogue"
        title="New product"
        description="A product starts as DRAFT and is never shown in the storefront until it is ACTIVE. Status and Active are separate — set them here."
        action={
          <Action to="/admin/products" variant="ghost" size="sm">
            Cancel
          </Action>
        }
      />

      <div className="border border-line bg-paper p-6 sm:p-8">
        {categories.isLoading ? (
          <SkeletonText lines={6} />
        ) : categories.error !== undefined ? (
          <ErrorState message={toUserMessage(categories.error)} onRetry={categories.refetch} />
        ) : (categories.data?.length ?? 0) === 0 ? (
          <EmptyState
            align="left"
            eyebrow="No categories"
            title="A product needs a category"
            description="Products must belong to a category. Create one in Categories first, then come back to this form."
            action={
              <Action to="/admin/categories" variant="outline" size="sm">
                Manage categories
              </Action>
            }
          />
        ) : (
          <ProductForm
            product={undefined}
            categories={categories.data ?? []}
            isSaving={createMutation.isPending}
            serverError={createMutation.error}
            submitLabel="Create product"
            onSubmit={async (values) => createMutation.run(productFormValuesToRequest(values))}
            onSaved={async (saved) => {
              showFeedback({
                type: 'success',
                title: 'Product created',
                message: `${saved.name} was added to the catalogue.`,
              })
              navigate(`/admin/products/${saved.id}`)
            }}
          />
        )}
      </div>
    </div>
  )
}