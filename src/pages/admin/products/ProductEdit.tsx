import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { BackLink } from '@/components/account/PageHeader'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { EmptyState, ErrorState, InlineNotice } from '@/components/account/States'
import { SkeletonCard, SkeletonText } from '@/components/account/Skeleton'
import { ProductForm } from '@/features/adminProducts/components/ProductForm'
import { DeleteProductModal } from '@/features/adminProducts/components/DeleteProductModal'
import { deleteAdminProduct, fetchAdminProduct, updateAdminProduct } from '@/features/adminProducts/api'
import { buildUpdateProductRequest } from '@/features/adminProducts/rules'
import { useAdminCategories } from '@/features/adminProducts/useAdminProducts'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { useMutation } from '@/hooks/useMutation'
import { toUserMessage } from '@/lib/api/errors'
import type { Product, UpdateProductRequest, UUID } from '@/types/api'

/**
 * One product, editable in place.
 *
 * Only the fields that actually changed are PATCHed (the backend treats an
 * omitted field as untouched), server-owned fields like `createdAt` are never
 * sent, and after a save the form is reconciled with the canonical record the
 * server returned rather than trusting the local draft. A stale or removed
 * product surfaces as a 404 state instead of a blank form.
 */
export default function ProductEdit() {
  const { productId } = useParams<{ productId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const referringCreate =
    (location.state as { created?: boolean } | null | undefined)?.created === true
  const [createdNotice, setCreatedNotice] = useState(referringCreate)
  const [savedNotice, setSavedNotice] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const product = useAsyncResource<Product | undefined>(
    (signal) => (productId ? fetchAdminProduct(productId, signal) : Promise.resolve(undefined)),
    [productId],
  )
  const categories = useAdminCategories()

  const updateMutation = useMutation(
    (id: UUID, body: UpdateProductRequest) => updateAdminProduct(id, body),
  )

  const deleteMutation = useMutation(
    (id: UUID) => deleteAdminProduct(id).then(() => true as const),
    { onSuccess: () => navigate('/admin/products', { replace: true }) },
  )

  if (product.isLoading) {
    return (
      <div className="max-w-3xl space-y-8">
        <BackLink to="/admin/products">All products</BackLink>
        <SkeletonCard rows={4} />
      </div>
    )
  }

  if (product.error !== undefined) {
    return (
      <div className="max-w-3xl space-y-8">
        <BackLink to="/admin/products">All products</BackLink>
        {/* A 404 is deliberately described as "could not load" — the API cannot
            tell whether the product was removed or never existed. */}
        <ErrorState message={toUserMessage(product.error)} onRetry={product.refetch} />
      </div>
    )
  }

  if (product.data === undefined) {
    return (
      <div className="max-w-3xl space-y-8">
        <BackLink to="/admin/products">All products</BackLink>
        <EmptyState
          align="left"
          eyebrow="Not found"
          title="We could not open that product"
          description="It may have been removed, or the link may be wrong."
          action={
            <Action to="/admin/products" variant="outline" size="sm">
              Back to products
            </Action>
          }
        />
      </div>
    )
  }

  const current = product.data

  return (
    <div className="max-w-3xl space-y-8">
      <BackLink to="/admin/products">All products</BackLink>

      <AdminPageHeader
        eyebrow={`${current.status} · ${current.isActive ? 'Enabled' : 'Disabled'}`}
        title={current.name}
        description={`Slug: /${current.slug}. These two lifecycle facts are independent — this record can be ACTIVE and still switched off.`}
      />

      {createdNotice && (
        <InlineNotice
          tone="info"
          message={`Product "${current.name}" was created. Continue editing below.`}
          onDismiss={() => setCreatedNotice(false)}
        />
      )}

      {savedNotice && (
        <InlineNotice
          tone="info"
          message="Saved — the screen now shows what the server stored."
          onDismiss={() => setSavedNotice(false)}
        />
      )}

      <div className="border border-line bg-paper p-6 sm:p-8">
        {categories.isLoading ? (
          <SkeletonText lines={6} />
        ) : categories.error !== undefined ? (
          <ErrorState message={toUserMessage(categories.error)} onRetry={categories.refetch} />
        ) : (categories.data?.length ?? 0) === 0 ? (
          <ErrorState message="The catalogue has no categories, so this product cannot be re-parented." onRetry={categories.refetch} />
        ) : (
          <ProductForm
            key={current.id}
            product={current}
            categories={categories.data ?? []}
            isSaving={updateMutation.isPending}
            serverError={updateMutation.error}
            submitLabel="Save changes"
            onSubmit={async (values) => updateMutation.run(current.id, buildUpdateProductRequest(values, current))}
            onSaved={() => {
              setSavedNotice(true)
              product.refetch()
            }}
          />
        )}
      </div>

      <div className="border border-signal/30 bg-signal-soft/40 p-6 sm:p-8">
        <h2 className="label-micro text-signal">Delete product</h2>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-graphite">
          Deleting removes the product and its images, variants and inventory permanently. If an order, cart or
          wishlist references it, the server refuses — switch the product off instead of deleting it.
        </p>
        <div className="mt-5">
          <button
            type="button"
            onClick={() => {
              deleteMutation.reset()
              setConfirmingDelete(true)
            }}
            className="label-micro inline-flex items-center gap-1.5 text-graphite transition-colors hover:text-signal"
          >
            <Trash2 size={12} strokeWidth={1.5} aria-hidden />
            Delete this product
          </button>
        </div>
      </div>

      {confirmingDelete && (
        <DeleteProductModal
          product={current}
          isDeleting={deleteMutation.isPending}
          error={deleteMutation.error}
          onClose={() => {
            setConfirmingDelete(false)
            deleteMutation.reset()
          }}
          onConfirm={async () => {
            if (await deleteMutation.run(current.id)) setConfirmingDelete(false)
          }}
        />
      )}
    </div>
  )
}