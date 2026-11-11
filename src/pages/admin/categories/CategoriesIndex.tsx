import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Pencil, Trash2 } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminStatCard } from '@/components/admin/AdminStatCard'
import { EmptyState, ErrorState } from '@/components/account/States'
import { Skeleton } from '@/components/account/Skeleton'
import { CategoryFormModal } from '@/features/adminProducts/components/CategoryFormModal'
import { DeleteCategoryModal } from '@/features/adminProducts/components/DeleteCategoryModal'
import {
  createAdminCategory,
  deleteAdminCategory,
  updateAdminCategory,
} from '@/features/adminProducts/api'
import {
  buildCreateCategoryRequest,
  buildUpdateCategoryRequest,
} from '@/features/adminProducts/catalogueRules'
import { useAdminCategories, useAdminProducts } from '@/features/adminProducts/useAdminProducts'
import { useMutation } from '@/hooks/useMutation'
import { useFeedback } from '@/context/feedbackContext'
import { toUserMessage } from '@/lib/api/errors'
import type { Category, CategoryFormValues, ISODateTime, UUID } from '@/types/api'

/**
 * Category management.
 *
 * The list and counts are real: the counts are derived from the same full product
 * response the products screen reads, not from a hard-coded tally. Create, edit,
 * and delete call the three `/admin/categories` write routes; the service still
 * decides slug uniqueness, hierarchy validity, and whether a category is a
 * deletable leaf.
 */

const formatDate = (value: ISODateTime): string => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function CategoriesIndex() {
  const { showFeedback } = useFeedback()
  const categories = useAdminCategories()
  const products = useAdminProducts({})

  const list = useMemo(
    () =>
      [...(categories.data ?? [])].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
    [categories.data],
  )
  const productList = useMemo(() => products.data ?? [], [products.data])

  const parentName = useMemo(
    () => new Map((categories.data ?? []).map((category) => [category.id, category.name])),
    [categories.data],
  )

  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const product of productList) {
      map.set(product.categoryId, (map.get(product.categoryId) ?? 0) + 1)
    }
    return map
  }, [productList])

  const activeCount = list.filter((category) => category.isActive).length
  const childCount = list.filter((category) => category.parentId !== null).length
  const isLoading = categories.isLoading || products.isLoading

  const [formState, setFormState] = useState<{ category: Category | undefined } | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null)

  const refreshCatalogue = () => {
    void categories.refetch()
    void products.refetch()
  }

  const createMutation = useMutation(
    (values: CategoryFormValues) => createAdminCategory(buildCreateCategoryRequest(values)),
    {
      onSuccess: () => {
        refreshCatalogue()
        showFeedback({
          type: 'success',
          title: 'Category created',
          message: 'The new category is ready to use.',
        })
      },
    },
  )
  const updateMutation = useMutation(
    (input: { id: UUID; values: CategoryFormValues; category: Category }) =>
      updateAdminCategory(input.id, buildUpdateCategoryRequest(input.values, input.category)),
    {
      onSuccess: () => {
        refreshCatalogue()
        showFeedback({
          type: 'success',
          title: 'Category updated',
          message: 'Your category changes were saved.',
        })
      },
    },
  )
  const deleteMutation = useMutation(
    (id: UUID) => deleteAdminCategory(id),
    {
      onSuccess: () => {
        refreshCatalogue()
        setPendingDelete(null)
        showFeedback({
          type: 'success',
          title: 'Category deleted',
          message: 'The category was deleted.',
        })
      },
    },
  )

  const isSaving =
    formState === null
      ? false
      : formState.category === undefined
      ? createMutation.isPending
      : updateMutation.isPending

  const openCreate = () => {
    createMutation.reset()
    updateMutation.reset()
    setFormState({ category: undefined })
  }

  const openEdit = (category: Category) => {
    createMutation.reset()
    updateMutation.reset()
    setFormState({ category })
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Catalogue"
        title="Categories"
        description="The groups products are filed under. Products can only be assigned to an existing category."
        action={
          <div className="flex flex-wrap gap-2">
            <Action size="sm" onClick={openCreate}>
              New category
            </Action>
            <Action to="/admin/products" variant="outline" size="sm" withArrow>
              View products
            </Action>
          </div>
        }
      />

      <section aria-label="Category summary">
        {categories.error !== undefined ? (
          <ErrorState message={toUserMessage(categories.error)} onRetry={categories.refetch} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <AdminStatCard
              label="Total Categories"
              value={list.length}
              loading={categories.isLoading}
              hint="All hierarchy groups"
            />
            <AdminStatCard
              label="Active Categories"
              value={activeCount}
              loading={categories.isLoading}
              hint="Visible on storefront"
            />
            <AdminStatCard
              label="Sub-categories"
              value={childCount}
              loading={categories.isLoading}
              hint="Nested under parent categories"
            />
          </div>
        )}
      </section>

      {isLoading && <CategoryListSkeleton />}

      {!isLoading && categories.error === undefined && list.length === 0 && (
        <EmptyState
          align="left"
          eyebrow="No categories"
          title="No categories have been created"
          description="A product needs a category before it can be created. Add the first one here."
          action={
            <Action size="sm" onClick={openCreate}>
              New category
            </Action>
          }
        />
      )}

      {!isLoading && categories.error === undefined && list.length > 0 && (
        <div className="space-y-4">
          <p className="text-[12px] text-graphite" aria-live="polite">
            {list.length} {list.length === 1 ? 'category' : 'categories'}
            {products.error !== undefined && ' · product counts unavailable'}
          </p>

          <div className="overflow-hidden rounded-xl border border-line bg-paper-pure shadow-xs">
            {/* Desktop: a real table with real column headers. */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-[13px] border-collapse">
                <thead>
                  <tr className="border-b border-line bg-canvas/40">
                    <th scope="col" className="px-5 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-graphite">
                      Category
                    </th>
                    <th scope="col" className="px-4 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-graphite">
                      Image
                    </th>
                    <th scope="col" className="px-4 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-graphite">
                      Parent
                    </th>
                    <th scope="col" className="px-4 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-graphite">
                      Products
                    </th>
                    <th scope="col" className="px-4 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-graphite">
                      Visibility
                    </th>
                    <th scope="col" className="px-4 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-graphite">
                      Updated
                    </th>
                    <th scope="col" className="px-5 py-3 text-right text-[11.5px] font-semibold uppercase tracking-wider text-graphite">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {list.map((category) => (
                    <tr key={category.id}>
                      <td className="px-5 py-4">
                        <Link
                          to={`/admin/products?categoryId=${category.id}`}
                          className="text-[13.5px] font-medium text-ink underline-offset-4 hover:underline"
                        >
                          {category.name}
                        </Link>
                        <span className="mt-0.5 block font-mono text-[11px] text-graphite">
                          /{category.slug}
                        </span>
                        {category.description && (
                          <span className="mt-1 block max-w-md text-[12.5px] leading-relaxed text-graphite">
                            {category.description}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {category.imageUrl !== null && category.imageUrl !== undefined ? (
                          <div className="relative size-10 overflow-hidden bg-bone rounded-sm">
                            <img
                              src={category.imageUrl}
                              alt={category.altText ?? category.name}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <span className="text-[11px] text-ash">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-[13.5px] text-graphite">
                        {category.parentId === null ? '—' : (parentName.get(category.parentId) ?? 'Unknown')}
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          to={`/admin/products?categoryId=${category.id}`}
                          className="inline-flex min-h-9 items-center gap-1 text-[13.5px] tabular-nums text-ink underline-offset-4 hover:underline"
                        >
                          {products.error !== undefined ? '—' : (counts.get(category.id) ?? 0)}
                          <ArrowUpRight size={12} strokeWidth={1.6} aria-hidden className="text-ash" />
                        </Link>
                      </td>
                      <td className="px-4 py-4">
                        <VisibilityBadge isActive={category.isActive} />
                      </td>
                      <td className="px-5 py-4 text-[13px] text-graphite">{formatDate(category.updatedAt)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(category)}
                            className="inline-flex size-9 items-center justify-center text-graphite transition-colors hover:bg-bone hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2"
                            aria-label={`Edit ${category.name}`}
                          >
                            <Pencil size={15} strokeWidth={1.7} aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              deleteMutation.reset()
                              setPendingDelete(category)
                            }}
                            className="inline-flex size-9 items-center justify-center text-graphite transition-colors hover:bg-signal-soft hover:text-signal focus-visible:outline-2 focus-visible:outline-offset-2"
                            aria-label={`Delete ${category.name}`}
                          >
                            <Trash2 size={15} strokeWidth={1.7} aria-hidden />
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
              {list.map((category) => (
                <li key={category.id}>
                  <div className="p-5">
                    {category.imageUrl !== null && category.imageUrl !== undefined && (
                      <div className="relative size-12 overflow-hidden bg-bone rounded-sm mb-3">
                        <img
                          src={category.imageUrl}
                          alt={category.altText ?? category.name}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        to={`/admin/products?categoryId=${category.id}`}
                        className="inline-flex min-h-11 items-center text-sm font-medium text-ink underline-offset-4 hover:underline"
                      >
                        {category.name}
                      </Link>
                      <VisibilityBadge isActive={category.isActive} />
                    </div>
                    <span className="mt-0.5 block font-mono text-[11px] text-graphite">/{category.slug}</span>
                    {category.description && (
                      <p className="mt-2 text-[13px] leading-relaxed text-graphite">{category.description}</p>
                    )}
                    <dl className="mt-3 space-y-1 text-[13px] text-graphite">
                      <div className="flex items-baseline justify-between gap-4">
                        <dt>Parent</dt>
                        <dd className="text-right text-ink">
                          {category.parentId === null ? '—' : (parentName.get(category.parentId) ?? 'Unknown')}
                        </dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-4">
                        <dt>Products</dt>
                        <dd className="text-right text-ink tabular-nums">
                          {products.error !== undefined ? '—' : (counts.get(category.id) ?? 0)}
                        </dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-4">
                        <dt>Updated</dt>
                        <dd className="text-right text-ink">{formatDate(category.updatedAt)}</dd>
                      </div>
                    </dl>
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-line-soft pt-3">
                      <Link
                        to={`/admin/products?categoryId=${category.id}`}
                        className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-medium text-graphite transition-colors hover:text-ink"
                      >
                        View products
                        <ArrowUpRight size={13} strokeWidth={1.6} aria-hidden />
                      </Link>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(category)}
                          className="inline-flex min-h-11 min-w-11 items-center justify-center text-graphite transition-colors hover:bg-bone hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2"
                          aria-label={`Edit ${category.name}`}
                        >
                          <Pencil size={15} strokeWidth={1.7} aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            deleteMutation.reset()
                            setPendingDelete(category)
                          }}
                          className="inline-flex min-h-11 min-w-11 items-center justify-center text-graphite transition-colors hover:bg-signal-soft hover:text-signal focus-visible:outline-2 focus-visible:outline-offset-2"
                          aria-label={`Delete ${category.name}`}
                        >
                          <Trash2 size={15} strokeWidth={1.7} aria-hidden />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="max-w-2xl text-[13px] leading-relaxed text-graphite">
            The storefront reads the same category records shown here. A category can only be deleted
            while it has no children and no products; otherwise the server keeps it and explains why.
          </p>
        </div>
      )}

      {formState !== null && (
        <CategoryFormModal
          category={formState.category}
          categories={list}
          isSaving={isSaving}
          serverError={formState.category === undefined ? createMutation.error : updateMutation.error}
          onClose={() => setFormState(null)}
          onImageSuccess={refreshCatalogue}
          onSubmit={(values) => {
            if (formState.category === undefined) return createMutation.run(values)
            return updateMutation.run({
              id: formState.category.id,
              values,
              category: formState.category,
            })
          }}
        />
      )}

      {pendingDelete !== null && (
        <DeleteCategoryModal
          category={pendingDelete}
          isDeleting={deleteMutation.isPending}
          error={deleteMutation.error}
          onClose={() => setPendingDelete(null)}
          onConfirm={async () => {
            await deleteMutation.run(pendingDelete.id)
          }}
        />
      )}
    </div>
  )
}

const VisibilityBadge = ({ isActive }: { isActive: boolean }) => (
  <span
    className={`inline-flex w-fit items-center gap-1.5 border px-2 py-1 text-[11px] font-medium whitespace-nowrap ${
      isActive ? 'border-ink/15 bg-bone text-ink' : 'border-line bg-paper text-graphite'
    }`}
  >
    <span aria-hidden className={`size-1.5 rounded-full ${isActive ? 'bg-ink' : 'bg-ash'}`} />
    {isActive ? 'Active' : 'Inactive'}
  </span>
)

const CategoryListSkeleton = () => (
  <div className="border border-line bg-paper p-5 sm:p-6" role="status" aria-busy="true">
    <span className="sr-only">Loading categories</span>
    {Array.from({ length: 6 }, (_, index) => (
      <div key={index} className="flex items-center gap-4 py-3">
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="ml-auto h-3 w-1/6" />
      </div>
    ))}
  </div>
)
