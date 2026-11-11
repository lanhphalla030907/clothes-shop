import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { BackLink } from '@/components/account/PageHeader'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { EmptyState, ErrorState } from '@/components/account/States'
import { SkeletonCard, SkeletonText } from '@/components/account/Skeleton'
import { ProductForm } from '@/features/adminProducts/components/ProductForm'
import { DeleteProductModal } from '@/features/adminProducts/components/DeleteProductModal'
import { ProductImagesSection } from '@/features/adminProducts/components/ProductImagesSection'
import { ProductAttributesSection } from '@/features/adminProducts/components/ProductAttributesSection'
import { ProductVariantsSection } from '@/features/adminProducts/components/ProductVariantsSection'
import { deleteAdminProduct, fetchAdminProduct, updateAdminProduct } from '@/features/adminProducts/api'
import { buildUpdateProductRequest } from '@/features/adminProducts/rules'
import { useAdminCategories } from '@/features/adminProducts/useAdminProducts'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { useMutation } from '@/hooks/useMutation'
import { useFeedback } from '@/context/feedbackContext'
import { toUserMessage } from '@/lib/api/errors'
import type { Product, UpdateProductRequest, UUID } from '@/types/api'


export default function ProductEdit() {
  const { productId } = useParams<{ productId: string }>()
  const navigate = useNavigate()
  const { showFeedback } = useFeedback()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [formKey, setFormKey] = useState(0)

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
    {
      onSuccess: () => {
        showFeedback({
          type: 'success',
          title: 'Product deleted',
          message: 'The product and its related catalogue records were deleted.',
        })
        navigate('/admin/products', { replace: true })
      },
    },
  )

  if (product.isLoading) {
    return (
      <div className="max-w-5xl space-y-8">
        <BackLink to="/admin/products">All products</BackLink>
        <SkeletonCard rows={4} />
      </div>
    )
  }

  if (product.error !== undefined) {
    return (
      <div className="max-w-5xl space-y-8">
        <BackLink to="/admin/products">All products</BackLink>
        {/* A 404 is deliberately described as "could not load" — the API cannot
            tell whether the product was removed or never existed. */}
        <ErrorState message={toUserMessage(product.error)} onRetry={product.refetch} />
      </div>
    )
  }

  if (product.data === undefined) {
    return (
      <div className="max-w-5xl space-y-8">
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
    <div className=" space-y-8">
      <BackLink to="/admin/products">All products</BackLink>

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1">
        <span className="text-xs font-medium text-graphite">Store</span>
        <span className="text-[11px] text-graphite" aria-hidden>›</span>
        <Link to="/admin/products" className="text-sm font-medium text-graphite hover:text-ink transition-colors duration-200">
          Products
        </Link>
        <span className="text-[11px] text-graphite" aria-hidden>›</span>
        <span className="text-sm font-medium text-ink">{current.name}</span>
      </nav>

      {/* Page header with integrated action */}
      <AdminPageHeader
        eyebrow={`${current.status} · ${current.isActive ? 'Enabled' : 'Disabled'}`}
        title={current.name}
        description={`Slug: /${current.slug}. These two lifecycle facts are independent — this record can be ACTIVE and still switched off.`}
        action={
          <Action to="/admin/products" variant="outline" size="sm">
            Back to products
          </Action>
        }
      />

      <div className="rounded-xl border border-line bg-paper-pure p-6 sm:p-8 shadow-xs">
        {categories.isLoading ? (
          <SkeletonText lines={6} />
        ) : categories.error !== undefined ? (
          <ErrorState message={toUserMessage(categories.error)} onRetry={categories.refetch} />
        ) : (categories.data?.length ?? 0) === 0 ? (
          <ErrorState message="The catalogue has no categories, so this product cannot be re-parented." onRetry={categories.refetch} />
        ) : (
          <ProductForm
            key={`${current.id}-${formKey}`}
            product={current}
            categories={categories.data ?? []}
            isSaving={updateMutation.isPending}
            serverError={updateMutation.error}
            submitLabel="Save changes"
            onSubmit={async (values) => updateMutation.run(current.id, buildUpdateProductRequest(values, current))}
            onSaved={() => {
              showFeedback({
                type: 'success',
                title: 'Product updated',
                message: 'Your product changes were saved.',
              })
              product.refetch()
            }}
            onCancel={() => {
              updateMutation.reset()
              setFormKey((k) => k + 1)
            }}
          />
        )}
      </div>

      <ProductImagesSection product={current} />

      <ProductVariantsSection product={current} />

      <ProductAttributesSection key={current.id} product={current} />

      <div className="rounded-xl border border-rose-200/80 bg-rose-50/40 p-6 sm:p-8 shadow-2xs">
        <h2 className="text-[14px] font-semibold text-rose-700">Delete product</h2>
        <p className="mt-2 max-w-prose text-[13px] leading-relaxed text-graphite">
          Deleting removes the product and its images, variants and inventory permanently. If an order, cart or
          wishlist references it, the server refuses — switch the product off instead of deleting it.
        </p>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => {
              deleteMutation.reset()
              setConfirmingDelete(true)
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 text-[12.5px] font-semibold text-rose-700 shadow-2xs transition-colors hover:bg-rose-50"
          >
            <Trash2 size={13} strokeWidth={1.8} aria-hidden />
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