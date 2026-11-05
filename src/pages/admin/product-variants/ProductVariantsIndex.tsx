import { useState } from 'react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { EmptyState, ErrorState } from '@/components/account/States'
import { SkeletonCard } from '@/components/account/Skeleton'
import { Action } from '@/components/ui/Action'
import { ProductSelector } from '@/features/adminProducts/components/ProductSelector'
import { ProductVariantsSection } from '@/features/adminProducts/components/ProductVariantsSection'
import { useAdminProducts } from '@/features/adminProducts/useAdminProducts'
import { toUserMessage } from '@/lib/api/errors'

/**
 * Standalone product-variant management.
 *
 * The administrator picks a product, then works with that product's variants,
 * each variant's options and stock. Every variant route is nested under the
 * chosen product, so no create, edit, delete or inventory write is ever sent
 * without a valid product association. The variant logic itself is the same
 * `ProductVariantsSection` used on Edit Product — nothing is duplicated here.
 */

export default function ProductVariantsIndex() {
  const products = useAdminProducts({})
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const list = products.data ?? []
  const selected = list.find((product) => product.id === selectedId) ?? null

  if (products.isLoading) {
    return (
      <div className="max-w-5xl space-y-8">
        <AdminPageHeader eyebrow="Catalogue" title="Product variants" />
        <SkeletonCard rows={3} />
      </div>
    )
  }

  if (products.error !== undefined) {
    return (
      <div className="max-w-5xl space-y-8">
        <AdminPageHeader eyebrow="Catalogue" title="Product variants" />
        <ErrorState message={toUserMessage(products.error)} onRetry={products.refetch} />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Catalogue"
        title="Product variants"
        description="Pick a product, then create and edit its variants. Each variant carries its own SKU, price, options and stock row."
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
            title="Choose a product to manage its variants"
            description="Search the catalogue above and select a product. Its variants, options and stock appear below, ready to create, edit or delete."
            action={
              <Action to="/admin/products/new" size="sm" variant="outline">
                Create a product first
              </Action>
            }
          />
        ) : (
          <ProductVariantsSection product={selected} />
        )}
      </div>
    </div>
  )
}
