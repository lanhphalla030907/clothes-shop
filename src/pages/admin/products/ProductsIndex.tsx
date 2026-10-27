import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Pencil, Trash2 } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { EmptyState, ErrorState, InlineNotice } from '@/components/account/States'
import { SelectField, TextField } from '@/components/account/Field'
import { Money } from '@/components/account/Bits'
import { DeleteProductModal } from '@/features/adminProducts/components/DeleteProductModal'
import { ProductActiveBadge, ProductStatusBadge } from '@/features/adminProducts/components/ProductBadges'
import { deleteAdminProduct } from '@/features/adminProducts/api'
import { useAdminCategories, useAdminProducts } from '@/features/adminProducts/useAdminProducts'
import { useMutation } from '@/hooks/useMutation'
import { toUserMessage } from '@/lib/api/errors'
import type {
  AdminProductQuery,
  ISODateTime,
  Product,
  ProductStatus,
  UUID,
} from '@/types/api'

/**
 * The product list.
 *
 * Filter state lives in the URL (the existing storefront convention) and every
 * filter is exactly what `GET /admin/products` accepts by those names, so the
 * browser history stays shareable and the server does all the narrowing — no
 * client-side filtering. There is no pagination because the endpoint has none;
 * the count shown is the length of the real response.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const STATUS_VALUES: ReadonlyArray<ProductStatus> = ['DRAFT', 'ACTIVE', 'ARCHIVED']

const isProductStatus = (value: string | null): value is ProductStatus =>
  (STATUS_VALUES as readonly string[]).includes(value ?? '')

const formatUpdated = (value: ISODateTime): string => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ProductsIndex() {
  const [params, setParams] = useSearchParams()

  const searchParam = params.get('search') ?? ''
  const statusParam = params.get('status')
  const isActiveParam = params.get('isActive')
  const categoryIdParam = params.get('categoryId')

  const [searchDraft, setSearchDraft] = useState(searchParam)

  const appliedSearch = searchParam
  const appliedStatus = isProductStatus(statusParam) ? statusParam : undefined
  const appliedIsActive = isActiveParam === 'true' ? true : isActiveParam === 'false' ? false : undefined
  const appliedCategory =
    categoryIdParam !== null && UUID_PATTERN.test(categoryIdParam) ? categoryIdParam : undefined

  const query = useMemo<AdminProductQuery>(
    () => ({
      search: appliedSearch === '' ? undefined : appliedSearch,
      status: appliedStatus,
      isActive: appliedIsActive,
      categoryId: appliedCategory,
    }),
    [appliedSearch, appliedStatus, appliedIsActive, appliedCategory],
  )

  const products = useAdminProducts(query)
  const categories = useAdminCategories()
  // A derived, non-undefined list so render conditions narrow past property checks.
  const list = useMemo(() => products.data ?? [], [products.data])
  const categoryName = useMemo(
    () => new Map((categories.data ?? []).map((category) => [category.id, category.name])),
    [categories.data],
  )

  const hasFilters =
    appliedSearch !== '' || appliedStatus !== undefined || appliedIsActive !== undefined || appliedCategory !== undefined

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value === '') next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    updateParam('search', searchDraft.trim())
  }

  const clearFilters = () => {
    setSearchDraft('')
    setParams({}, { replace: true })
  }

  const [pendingDelete, setPendingDelete] = useState<Product | null>(null)
  const deleteMutation = useMutation(
    (id: UUID) => deleteAdminProduct(id).then(() => true as const),
    { onSuccess: () => products.refetch() },
  )

  const requestDelete = (product: Product) => {
    deleteMutation.reset()
    setPendingDelete(product)
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Catalogue"
        title="Products"
        description="Manage the catalogue. The storefront only ever shows a product that is ACTIVE and enabled."
        action={
          <Action to="/admin/products/new" size="sm" withArrow>
            New product
          </Action>
        }
      />

      <div className="space-y-4">
        <form
          onSubmit={submitSearch}
          className="flex flex-wrap items-end gap-x-4 gap-y-5"
        >
          <div className="w-full sm:min-w-56 sm:flex-1">
            <TextField
              name="search"
              label="Search"
              placeholder="Name or slug"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="w-full sm:w-40">
            <SelectField
              name="status"
              label="Status"
              value={statusParam ?? ''}
              onChange={(event) => updateParam('status', event.target.value)}
            >
              <option value="">All statuses</option>
              {STATUS_VALUES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </SelectField>
          </div>
          <div className="w-full sm:w-40">
            <SelectField
              name="isActive"
              label="Enabled"
              value={isActiveParam ?? ''}
              onChange={(event) => updateParam('isActive', event.target.value)}
            >
              <option value="">Active or inactive</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </SelectField>
          </div>
          <div className="w-full sm:w-48">
            <SelectField
              name="categoryId"
              label="Category"
              value={categoryIdParam ?? ''}
              onChange={(event) => updateParam('categoryId', event.target.value)}
            >
              <option value="">All categories</option>
              {(categories.data ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
              {/* Keeps a category that is no longer listed selectable rather than
                  silently resetting the filter when the list re-renders. */}
              {appliedCategory !== undefined &&
                !(categories.data ?? []).some((category) => category.id === appliedCategory) && (
                  <option value={appliedCategory}>Unknown category</option>
                )}
            </SelectField>
          </div>
          <div className="flex items-center gap-2">
            <Action type="submit" size="sm">
              Search
            </Action>
            {hasFilters && (
              <Action type="button" variant="ghost" size="sm" onClick={clearFilters}>
                Clear
              </Action>
            )}
          </div>
        </form>

        {categories.error !== undefined && (
          <InlineNotice
            message={toUserMessage(categories.error)}
            onDismiss={() => undefined}
          />
        )}

        {products.isLoading && <ProductListSkeleton />}

        {!products.isLoading && products.error !== undefined && (
          <ErrorState message={toUserMessage(products.error)} onRetry={products.refetch} />
        )}

        {!products.isLoading && products.error === undefined && list.length === 0 && (
          <EmptyState
            align="left"
            eyebrow={hasFilters ? 'No matches' : 'No products yet'}
            title={hasFilters ? 'No products match these filters' : 'The catalogue is empty'}
            description={
              hasFilters
                ? 'Try loosening the search, or clear the filters to see everything.'
                : 'Create a product to start building the catalogue.'
            }
            action={
              hasFilters ? (
                <Action variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Action>
              ) : (
                <Action to="/admin/products/new" size="sm" withArrow>
                  New product
                </Action>
              )
            }
          />
        )}

        {!products.isLoading && products.error === undefined && list.length > 0 && (
          <>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ash" aria-live="polite">
              {list.length} {list.length === 1 ? 'product' : 'products'}
            </p>

            <div className="border border-line bg-paper">
              {/* Desktop: a real table with real column headers. */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-line">
                      <th scope="col" className="label-micro px-5 py-3 font-normal text-ash">
                        Product
                      </th>
                      <th scope="col" className="label-micro px-4 py-3 font-normal text-ash">
                        Category
                      </th>
                      <th scope="col" className="label-micro px-4 py-3 font-normal text-ash">
                        Base price
                      </th>
                      <th scope="col" className="label-micro px-4 py-3 font-normal text-ash">
                        Status
                      </th>
                      <th scope="col" className="label-micro px-4 py-3 font-normal text-ash">
                        Enabled
                      </th>
                      <th scope="col" className="label-micro px-4 py-3 font-normal text-ash">
                        Updated
                      </th>
                      <th scope="col" className="label-micro px-5 py-3 font-normal text-ash">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-soft">
                    {list.map((product) => (
                      <tr key={product.id} className={rowDimmed(product, pendingDelete, deleteMutation.isPending)}>
                        <td className="px-5 py-4">
                          <Link
                            to={`/admin/products/${product.id}`}
                            className="text-sm font-medium text-ink underline-offset-4 hover:underline"
                          >
                            {product.name}
                          </Link>
                          <span className="mt-0.5 block font-mono text-[11px] text-ash">/{product.slug}</span>
                        </td>
                        <td className="px-4 py-4 text-sm text-graphite">
                          {categoryName.get(product.categoryId) ?? '—'}
                        </td>
                        <td className="px-4 py-4 text-sm tabular-nums text-ink">
                          <Money amount={product.basePrice} />
                        </td>
                        <td className="px-4 py-4">
                          <ProductStatusBadge status={product.status} />
                        </td>
                        <td className="px-4 py-4">
                          <ProductActiveBadge isActive={product.isActive} />
                        </td>
                        <td className="px-4 py-4 text-sm text-graphite">{formatUpdated(product.updatedAt)}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-4">
                            <Link
                              to={`/admin/products/${product.id}`}
                              className="label-micro inline-flex items-center gap-1.5 text-graphite transition-colors hover:text-ink"
                            >
                              <Pencil size={11} strokeWidth={1.5} aria-hidden />
                              Edit
                            </Link>
                            <button
                              type="button"
                              onClick={() => requestDelete(product)}
                              aria-label={`Delete ${product.name}`}
                              className="label-micro inline-flex items-center gap-1.5 text-graphite transition-colors hover:text-signal"
                            >
                              <Trash2 size={11} strokeWidth={1.5} aria-hidden />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile: flat cards — no horizontal scroll. */}
              <ul className="divide-y divide-line-soft md:hidden">
                {list.map((product) => (
                  <li key={product.id} className={rowDimmed(product, pendingDelete, deleteMutation.isPending)}>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <Link
                          to={`/admin/products/${product.id}`}
                          className="text-sm font-medium text-ink underline-offset-4 hover:underline"
                        >
                          {product.name}
                        </Link>
                        <Money amount={product.basePrice} />
                      </div>
                      <span className="mt-0.5 block font-mono text-[11px] text-ash">/{product.slug}</span>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <ProductStatusBadge status={product.status} />
                        <ProductActiveBadge isActive={product.isActive} />
                      </div>
                      <p className="mt-3 text-sm text-graphite">
                        {categoryName.get(product.categoryId) ?? 'Unknown category'}
                        <span className="text-ash"> · updated {formatUpdated(product.updatedAt)}</span>
                      </p>
                      <div className="mt-4 flex items-center gap-4 border-t border-line-soft pt-4">
                        <Link
                          to={`/admin/products/${product.id}`}
                          className="label-micro inline-flex items-center gap-1.5 text-graphite transition-colors hover:text-ink"
                        >
                          <Pencil size={11} strokeWidth={1.5} aria-hidden />
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => requestDelete(product)}
                          aria-label={`Delete ${product.name}`}
                          className="label-micro ml-auto inline-flex items-center gap-1.5 text-graphite transition-colors hover:text-signal"
                        >
                          <Trash2 size={11} strokeWidth={1.5} aria-hidden />
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>

      {pendingDelete !== null && (
        <DeleteProductModal
          product={pendingDelete}
          isDeleting={deleteMutation.isPending}
          error={deleteMutation.error}
          onClose={() => {
            setPendingDelete(null)
            deleteMutation.reset()
          }}
          onConfirm={async () => {
            if (await deleteMutation.run(pendingDelete.id)) setPendingDelete(null)
          }}
        />
      )}
    </div>
  )
}

const rowDimmed = (product: Product, pendingDelete: Product | null, isDeleting: boolean): string =>
  isDeleting && pendingDelete?.id === product.id ? 'opacity-50' : ''

const ProductListSkeleton = () => (
  <div className="border border-line bg-paper p-5 sm:p-6" role="status" aria-busy="true">
    <span className="sr-only">Loading products</span>
    {Array.from({ length: 5 }, (_, index) => (
      <div key={index} className="flex items-center gap-4 py-3">
        <div className="h-3 w-2/5 animate-pulse bg-line-soft" />
        <div className="ml-auto h-3 w-1/6 animate-pulse bg-line-soft" />
      </div>
    ))}
  </div>
)