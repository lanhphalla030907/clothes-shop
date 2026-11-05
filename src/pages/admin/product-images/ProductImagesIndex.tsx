import { useState } from 'react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { EmptyState, ErrorState } from '@/components/account/States'
import { SkeletonCard } from '@/components/account/Skeleton'
import { Action } from '@/components/ui/Action'
import { ProductSelector } from '@/features/adminProducts/components/ProductSelector'
import { ProductImagesSection } from '@/features/adminProducts/components/ProductImagesSection'
import { useAdminProducts } from '@/features/adminProducts/useAdminProducts'
import { toUserMessage } from '@/lib/api/errors'

/**
 * Standalone product-image management.
 *
 * The administrator picks a product, then works with that product's images only.
 * Every image route is nested under the chosen product, so no upload, edit,
 * delete or primary-image change is ever sent without a valid product association.
 * The gallery logic itself is the same `ProductImagesSection` used on Edit
 * Product — nothing is duplicated here.
 */

export default function ProductImagesIndex() {
  const products = useAdminProducts({})
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const list = products.data ?? []
  const selected = list.find((product) => product.id === selectedId) ?? null

  if (products.isLoading) {
    return (
      <div className="max-w-5xl space-y-8">
        <AdminPageHeader eyebrow="Catalogue" title="Product images" />
        <SkeletonCard rows={3} />
      </div>
    )
  }

  if (products.error !== undefined) {
    return (
      <div className="max-w-5xl space-y-8">
        <AdminPageHeader eyebrow="Catalogue" title="Product images" />
        <ErrorState message={toUserMessage(products.error)} onRetry={products.refetch} />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Catalogue"
        title="Product images"
        description="Pick a product, then upload, edit or delete its gallery images. The primary image is the one shown first on the product page."
        action={
          <Action to="/admin/products/new" size="sm" variant="outline">
            Create a product
          </Action>
        }
      />

      <div className="border border-line bg-paper p-6 sm:p-8">
        <ProductSelector
          placeholder="Search products by name or slug"
          onSelect={(product) => setSelectedId(product.id)}
        />

        {selected === null ? (
          <EmptyState
            align="left"
            eyebrow="No product selected"
            title="Choose a product to manage its images"
            description="Search the catalogue above and select a product. Its images appear below, ready to upload, edit or delete."
            action={
              <Action to="/admin/products/new" size="sm" variant="outline">
                Create a product first
              </Action>
            }
          />
        ) : (
          <ProductImagesSection product={selected} />
        )}
      </div>
    </div>
  )
}
