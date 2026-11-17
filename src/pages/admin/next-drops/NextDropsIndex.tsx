import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Play,
  Pause,
  Pencil,
  Trash2,
  ExternalLink,
  Package,
  ShoppingCart,
  User,
} from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminBadge } from '@/components/admin/AdminBadge'
import { FormError, TextField, SelectField } from '@/components/account/Field'
import { EmptyState, ErrorState } from '@/components/account/States'
import { Modal } from '@/components/account/Modal'
import { useFeedback } from '@/context/feedbackContext'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { toUserMessage } from '@/lib/api/errors'
import {
  createNextDrop,
  deleteNextDrop,
  fetchAdminNextDrops,
  publishNextDrop,
  unpublishNextDrop,
  updateNextDrop,
} from '@/features/next-drops/api'
import { fetchCollections } from '@/features/collections/api'
import { fetchAdminPromotions } from '@/features/promotions/api'
import { fetchAdminProducts } from '@/features/adminProducts/api'
import {
  DESTINATION_OPTIONS,
  type DestinationType,
  destinationUrl,
  inferDestinationType,
} from './destination'
import type {
  CreateNextDropInput,
  NextDrop,
  Promotion,
  UpdateNextDropInput,
} from '@/types/api'

const PAGE_SIZE = 20

const formatLaunchAt = (value: string | null): string | null => {
  if (value === null) return 'Not scheduled'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Invalid date'
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatPromotionLabel = (promotion: Promotion): string => {
  const parts: string[] = []
  if (promotion.code !== null) {
    parts.push(promotion.code)
  }
  if (promotion.discountType === 'PERCENTAGE' && promotion.percentOff !== null) {
    parts.push(`${promotion.percentOff}% off`)
  } else if (
    promotion.discountType === 'FIXED_AMOUNT' &&
    promotion.amountOff !== null
  ) {
    parts.push(`${promotion.amountOff} off`)
  } else if (promotion.discountType === 'FREE_SHIPPING') {
    parts.push('Free shipping')
  }
  return `${promotion.name} (${parts.join(' · ') || 'promotion'})`
}

const isPromotionSelectable = (promotion: Promotion): boolean => {
  if (promotion.archivedAt !== null) return false
  if (!promotion.isActive) return false
  const now = Date.now()
  if (
    promotion.endsAt !== null &&
    new Date(promotion.endsAt).getTime() < now
  ) {
    return false
  }
  return true
}

export default function NextDropsIndex() {
  const { showFeedback, confirmFeedback } = useFeedback()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [editing, setEditing] = useState<NextDrop | null | undefined>(undefined)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<unknown>()

  const query = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      isPublished: status === '' ? undefined : status === 'published',
    }),
    [page, status],
  )

  const drops = useAsyncResource((signal) => fetchAdminNextDrops(query, signal), [query])
  const refresh = () => drops.refetch()

  const mutate = async (
    work: () => Promise<unknown>,
    success: string,
  ): Promise<boolean> => {
    setSaving(true)
    setActionError(undefined)
    try {
      await work()
      showFeedback({ type: 'success', title: 'Next drop updated', message: success })
      refresh()
      return true
    } catch (error) {
      setActionError(error)
      return false
    } finally {
      setSaving(false)
    }
  }

  const toggle = (drop: NextDrop) =>
    void mutate(
      () => (drop.isPublished ? unpublishNextDrop(drop.id) : publishNextDrop(drop.id)),
      drop.isPublished ? 'The drop was unpublished.' : 'The drop is published.',
    )

  const remove = async (drop: NextDrop) => {
    const confirmed = await confirmFeedback({
      type: 'warning',
      title: 'Delete next drop?',
      message: `${drop.title} will be removed permanently.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Keep drop',
    })
    if (confirmed) {
      void mutate(() => deleteNextDrop(drop.id), 'The next drop was deleted.')
    }
  }

  const save = (drop: NextDrop | null, input: CreateNextDropInput | UpdateNextDropInput) => {
    void mutate(
      () => (drop ? updateNextDrop(drop.id, input) : createNextDrop(input as CreateNextDropInput)),
      drop ? 'Changes were saved.' : 'The next drop was created.',
    ).then((saved) => {
      if (saved) setEditing(undefined)
    })
  }

  const items = drops.data ?? []
  const total = items.length
  const firstRow = total === 0 ? 0 : 1
  const lastRow = total

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Commerce"
        title="Next drops"
        description="Schedule upcoming releases. Only one drop can be published at a time; publishing another unpublishes the current one."
        action={
          <Action size="sm" onClick={() => setEditing(null)}>
            <Plus size={15} strokeWidth={1.8} aria-hidden />
            New next drop
          </Action>
        }
      />

      {actionError !== undefined && editing === undefined && (
        <FormError message={toUserMessage(actionError)} />
      )}

      {drops.isLoading && <NextDropsSkeleton />}

      {!drops.isLoading && drops.error !== undefined && (
        <ErrorState message={toUserMessage(drops.error)} onRetry={refresh} />
      )}

      {!drops.isLoading &&
        drops.error === undefined &&
        items.length === 0 && (
          <EmptyState
            align="left"
            eyebrow="No next drops"
            title="No scheduled releases"
            description="Create a next drop to surface an upcoming collection on the homepage."
            action={
              <Action size="sm" onClick={() => setEditing(null)}>
                New next drop
              </Action>
            }
          />
        )}

      {!drops.isLoading &&
        drops.error === undefined &&
        items.length > 0 && (
          <section aria-label="Next drop list" className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.09em] text-graphite/80 uppercase">
                  Filter
                </p>
                <h2 className="mt-1 text-[15px] font-semibold text-ink">Refine drops</h2>
              </div>
              {status !== '' && (
                <Action variant="ghost" size="sm" onClick={() => setStatus('')}>
                  Reset filter
                </Action>
              )}
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <SelectField
                name="next-drop-status"
                label="Status"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value)
                  setPage(1)
                }}
              >
                <option value="">Any status</option>
                <option value="published">Published</option>
                <option value="unpublished">Unpublished</option>
              </SelectField>
            </div>

            <div className="flex items-center justify-between gap-4">
              <p className="text-[12px] text-graphite" aria-live="polite">
                Showing {firstRow}–{lastRow} of {total}
              </p>
              {drops.isRefreshing && (
                <span className="text-[12px] text-graphite" role="status">
                  Refreshing…
                </span>
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-line bg-paper-pure shadow-xs">
              <table className="w-full min-w-[960px] text-left text-[13px]">
                <thead className="border-b border-line bg-canvas/40">
                  <tr>
                    <Column>Drop</Column>
                    <Column>Launches at</Column>
                    <Column>Collection</Column>
                    <Column>Promotion</Column>
                    <Column className="text-center">Status</Column>
                    <Column className="text-right">Actions</Column>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {items.map((drop) => (
                    <DropRow
                      key={drop.id}
                      drop={drop}
                      busy={saving}
                      onEdit={() => setEditing(drop)}
                      onToggle={() => toggle(drop)}
                      onDelete={() => void remove(drop)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <NextDropPagination
              page={page}
              totalPages={1}
              onPage={setPage}
            />
          </section>
        )}

      {editing !== undefined && (
        <NextDropFormModal
          key={editing === null ? 'new' : editing.id}
          drop={editing}
          saving={saving}
          error={actionError}
          onCancel={() => setEditing(undefined)}
          onSave={(input) => save(editing, input)}
        />
      )}
    </div>
  )
}

function Column({
  children,
  className = '',
}: {
  children: string
  className?: string
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 text-[11.5px] font-semibold tracking-wider text-graphite uppercase first:pl-5 last:pr-5 ${className}`}
    >
      {children}
    </th>
  )
}

function RowAction({
  label,
  onClick,
  disabled = false,
  danger = false,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`grid size-9 place-items-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        danger
          ? 'text-graphite hover:bg-signal-soft hover:text-signal'
          : 'text-graphite hover:bg-bone hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

function DropStatus({ drop }: { drop: NextDrop }) {
  if (drop.isPublished) {
    return (
      <AdminBadge variant="success" size="sm">
        Published
      </AdminBadge>
    )
  }
  return (
    <AdminBadge variant="neutral" size="sm">
      Draft
    </AdminBadge>
  )
}

function DropRow({
  drop,
  busy,
  onEdit,
  onToggle,
  onDelete,
}: {
  drop: NextDrop
  busy: boolean
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  return (
    <tr className="border-b border-line-soft transition-colors last:border-b-0 hover:bg-bone/40">
      <td className="px-4 py-4 first:pl-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[13.5px] font-medium text-ink">{drop.title}</p>
          {drop.buttonText !== null && (
            <span className="rounded-md border border-line bg-bone px-1.5 py-0.5 font-mono text-[10.5px] tracking-[0.04em] text-graphite">
              "{drop.buttonText}"
            </span>
          )}
        </div>
        {drop.buttonUrl && (
          <p className="mt-1 max-w-xs text-[12px] leading-relaxed text-graphite">
            {drop.buttonUrl}
          </p>
        )}
      </td>
      <td className="px-4 py-4">
        <p className="font-mono text-[12.5px] tabular-nums text-ink">
          {formatLaunchAt(drop.launchAt)}
        </p>
      </td>
      <td className="px-4 py-4">
        <p className="text-[12.5px] text-ink">
          {drop.collection?.title ?? (drop.collectionId !== null ? drop.collectionId : '—')}
        </p>
      </td>
      <td className="px-4 py-4">
        <p className="text-[12.5px] text-ink">
          {drop.promotion?.code ?? (drop.promotionId !== null ? drop.promotionId : '—')}
        </p>
      </td>
      <td className="px-4 py-4 text-center">
        <DropStatus drop={drop} />
      </td>
      <td className="px-4 py-4 last:pr-5">
        <div className="flex items-center justify-end gap-1">
          <RowAction label="Edit" onClick={onEdit} disabled={busy}>
            <Pencil size={15} strokeWidth={1.8} aria-hidden />
          </RowAction>
          <RowAction
            label={drop.isPublished ? 'Unpublish' : 'Publish'}
            onClick={onToggle}
            disabled={busy}
          >
            {drop.isPublished ? (
              <Pause size={15} strokeWidth={1.8} aria-hidden />
            ) : (
              <Play size={15} strokeWidth={1.8} aria-hidden />
            )}
          </RowAction>
          <RowAction label="Delete" onClick={onDelete} disabled={busy} danger>
            <Trash2 size={15} strokeWidth={1.8} aria-hidden />
          </RowAction>
        </div>
      </td>
    </tr>
  )
}

function NextDropPagination({
  page,
  totalPages,
  onPage,
}: {
  page: number
  totalPages: number
  onPage: (page: number) => void
}) {
  const last = Math.max(1, totalPages)
  return (
    <nav
      aria-label="Next drop pagination"
      className="flex flex-col gap-4 rounded-xl border border-line bg-paper-pure px-5 py-4 shadow-xs sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-[12.5px] text-graphite" aria-live="polite">
        Page {page} of {last}
      </p>
      <div className="flex items-center gap-2">
        <Action
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft size={14} strokeWidth={1.8} aria-hidden />
          Previous
        </Action>
        <Action
          variant="outline"
          size="sm"
          disabled={page >= last}
          onClick={() => onPage(page + 1)}
        >
          Next
          <ChevronRight size={14} strokeWidth={1.8} aria-hidden />
        </Action>
      </div>
    </nav>
  )
}

function NextDropsSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="overflow-hidden rounded-xl border border-line bg-paper-pure shadow-xs"
    >
      <span className="sr-only">Loading next drops…</span>
      {Array.from({ length: 5 }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 border-b border-line-soft px-5 py-4 last:border-b-0"
        >
          <div className="h-4 w-40 animate-pulse bg-line-soft" />
          <div className="h-4 w-32 animate-pulse bg-line-soft" />
          <div className="h-4 w-28 animate-pulse bg-line-soft" />
          <div className="ml-auto h-4 w-24 animate-pulse bg-line-soft" />
          <div className="h-4 w-20 animate-pulse bg-line-soft" />
        </div>
      ))}
    </div>
  )
}

function ButtonPreview({
  label,
  url,
}: {
  label: string
  url: string
}) {
  const iconByUrl = (urlValue: string): React.ReactNode => {
    const path = new URL(urlValue, window.location.origin).pathname
    if (path.startsWith('/collections/')) return <Package size={14} strokeWidth={1.8} aria-hidden />
    if (path.startsWith('/product/')) return <ShoppingCart size={14} strokeWidth={1.8} aria-hidden />
    if (path === '/register') return <User size={14} strokeWidth={1.8} aria-hidden />
    if (path === '/shop') return <Package size={14} strokeWidth={1.8} aria-hidden />
    return <ExternalLink size={14} strokeWidth={1.8} aria-hidden />
  }

  return (
    <div className="rounded-lg border border-line bg-paper-pure p-4">
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-graphite/70">
          Button preview
        </span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md border border-line bg-bone px-3 py-2 text-[14px] font-medium text-ink hover:bg-bone/80 transition-colors"
        >
          {iconByUrl(url)}
          {label}
        </a>
      </div>
      <p className="mt-2 text-[12px] font-mono text-graphite truncate">{url}</p>
    </div>
  )
}

function NextDropFormModal({
  drop,
  saving,
  error,
  onCancel,
  onSave,
}: {
  drop: NextDrop | null
  saving: boolean
  error: unknown
  onCancel: () => void
  onSave: (input: CreateNextDropInput | UpdateNextDropInput) => void
}) {
  const [values, setValues] = useState<{
    title: string
    launchAt: string
    collectionId: string | null
    promotionId: string | null
    buttonText: string | null
    isPublished: boolean
    destinationType: DestinationType
    destCollectionId: string | null
    destProductId: string | null
    customUrl: string
  }>(() =>
    drop
      ? {
          title: drop.title,
          launchAt: drop.launchAt === null ? '' : drop.launchAt.slice(0, 16),
          collectionId: drop.collectionId,
          promotionId: drop.promotionId,
          buttonText: drop.buttonText === null ? 'Get Access' : drop.buttonText,
          isPublished: drop.isPublished,
          destinationType: inferDestinationType(drop.buttonUrl),
          destCollectionId: null,
          destProductId: null,
          customUrl:
            drop.buttonUrl.startsWith('/collections/') ||
            drop.buttonUrl.startsWith('/product/') ||
            drop.buttonUrl === '/register' ||
            drop.buttonUrl === '/shop'
              ? ''
              : drop.buttonUrl,
        }
      : {
          title: '',
          launchAt: '',
          collectionId: null,
          promotionId: null,
          buttonText: 'Get Access',
          isPublished: false,
          destinationType: 'collection',
          destCollectionId: null,
          destProductId: null,
          customUrl: '',
        },
  )
  const [formError, setFormError] = useState<string>()

  const collections = useAsyncResource(
    (signal) => fetchCollections(50, signal),
    [],
  )

  const promotions = useAsyncResource(
    (signal) =>
      fetchAdminPromotions(
        { page: 1, limit: 100, isActive: true, archived: false },
        signal,
      ),
    [],
  )

  const products = useAsyncResource(
    (signal) => fetchAdminProducts({ isActive: true }, signal),
    [],
  )

  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) =>
    setValues((current) => ({ ...current, [key]: value }))

  const buttonUrl = useMemo(
    () =>
      destinationUrl(
        values.destinationType,
        values.destCollectionId,
        values.destProductId,
        values.customUrl,
        collections.data ?? [],
        products.data ?? [],
      ),
    [
      values.destinationType,
      values.destCollectionId,
      values.destProductId,
      values.customUrl,
      collections.data,
      products.data,
    ],
  )

  const resolvedDestCollectionId = useMemo(() => {
    if (values.destCollectionId !== null) return values.destCollectionId
    if (drop && values.destinationType === 'collection') {
      const path = new URL(drop.buttonUrl, window.location.origin).pathname
      const slug = path.replace('/collections/', '')
      const col = collections.data?.find((c) => c.slug === slug)
      return col ? col.id : null
    }
    return null
  }, [values.destCollectionId, drop, values.destinationType, collections.data])

  const resolvedDestProductId = useMemo(() => {
    if (values.destProductId !== null) return values.destProductId
    if (drop && values.destinationType === 'product') {
      const path = new URL(drop.buttonUrl, window.location.origin).pathname
      const id = path.replace('/product/', '')
      const prod = products.data?.find((p) => p.id === id)
      return prod ? prod.id : null
    }
    return null
  }, [values.destProductId, drop, values.destinationType, products.data])

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (values.title.trim() === '') {
      setFormError('Title is required.')
      return
    }
    if (buttonUrl === '') {
      setFormError('Please select a destination to generate a button URL.')
      return
    }
    try {
      new URL(buttonUrl, window.location.origin)
    } catch {
      setFormError('Button URL must be a valid URL.')
      return
    }
    setFormError(undefined)
    const input: CreateNextDropInput | UpdateNextDropInput = {
      title: values.title.trim(),
      launchAt: values.launchAt === '' ? undefined : values.launchAt,
      collectionId: values.collectionId === '' ? null : values.collectionId,
      promotionId: values.promotionId === '' ? null : values.promotionId,
      buttonText: values.buttonText === null || values.buttonText === '' ? null : values.buttonText.trim(),
      buttonUrl,
      isPublished: values.isPublished,
    }
    onSave(input)
  }

  const handleDestinationChange = (value: DestinationType) => {
    set('destinationType', value)
    if (value !== 'collection') set('destCollectionId', null)
    if (value !== 'product') set('destProductId', null)
    if (value !== 'custom') set('customUrl', '')
  }

  const handleCollectionChange = (value: string) => {
    set('destCollectionId', value === '' ? null : value)
  }

  const handleProductChange = (value: string) => {
    set('destProductId', value === '' ? null : value)
  }

  const handleCustomUrlChange = (value: string) => {
    set('customUrl', value)
  }

  const selectablePromotions = useMemo(
    () => promotions.data?.items?.filter(isPromotionSelectable) ?? [],
    [promotions.data],
  )

  return (
    <Modal
      title={drop ? 'Edit next drop' : 'New next drop'}
      onClose={onCancel}
      className="w-[min(56rem,calc(100vw-1.5rem))]"
    >
      <form onSubmit={submit} className="space-y-5">
        {formError !== undefined && <FormError message={formError} />}
        {error !== undefined && <FormError message={toUserMessage(error)} />}

        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            name="next-drop-title"
            label="Title"
            required
            value={values.title}
            onChange={(event) => set('title', event.target.value)}
          />
          <TextField
            name="next-drop-launch"
            type="datetime-local"
            label="Launch at"
            value={values.launchAt}
            onChange={(event) => set('launchAt', event.target.value)}
            hint="When the drop goes live on the storefront."
          />

          <SelectField
            name="next-drop-destination"
            label="Button destination"
            required
            value={values.destinationType}
            onChange={(event) => handleDestinationChange(event.target.value as DestinationType)}
            hint="Where the button takes shoppers when tapped."
          >
            {DESTINATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>

          {values.destinationType === 'collection' && (
            <SelectField
              name="next-drop-dest-collection"
              label="Collection"
              required
              error={collections.error !== undefined ? 'Failed to load collections.' : undefined}
              value={resolvedDestCollectionId ?? ''}
              onChange={(event) => handleCollectionChange(event.target.value)}
            >
              <option value="">Select a collection</option>
              {collections.isLoading && (
                <option disabled>Loading collections…</option>
              )}
              {!collections.isLoading &&
                collections.error === undefined &&
                collections.data?.length === 0 && (
                  <option disabled>No collections available</option>
                )}
              {!collections.isLoading &&
                collections.error === undefined &&
                collections.data?.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.title}
                  </option>
                ))}
            </SelectField>
          )}

          {values.destinationType === 'product' && (
            <SelectField
              name="next-drop-dest-product"
              label="Product"
              required
              error={products.error !== undefined ? 'Failed to load products.' : undefined}
              value={resolvedDestProductId ?? ''}
              onChange={(event) => handleProductChange(event.target.value)}
            >
              <option value="">Select a product</option>
              {products.isLoading && (
                <option disabled>Loading products…</option>
              )}
              {!products.isLoading &&
                products.error === undefined &&
                products.data?.length === 0 && (
                  <option disabled>No products available</option>
                )}
              {!products.isLoading &&
                products.error === undefined &&
                products.data?.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
            </SelectField>
          )}

          {values.destinationType === 'custom' && (
            <TextField
              name="next-drop-custom-url"
              label="URL"
              required
              type="url"
              value={values.customUrl}
              onChange={(event) => handleCustomUrlChange(event.target.value)}
              hint="Must be an HTTP or HTTPS URL."
            />
          )}

          <SelectField
            name="next-drop-collection"
            label="Featured collection (optional)"
            error={collections.error !== undefined ? 'Failed to load collections.' : undefined}
            value={values.collectionId ?? ''}
            onChange={(event) => set('collectionId', event.target.value === '' ? null : event.target.value)}
          >
            <option value="">None</option>
            {collections.isLoading && (
              <option disabled>Loading collections…</option>
            )}
            {!collections.isLoading &&
              collections.error === undefined &&
              collections.data?.length === 0 && (
                <option disabled>No collections available</option>
              )}
            {!collections.isLoading &&
              collections.error === undefined &&
              collections.data?.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.title}
                </option>
              ))}
          </SelectField>

          <SelectField
            name="next-drop-promotion"
            label="Featured promotion (optional)"
            error={promotions.error !== undefined ? 'Failed to load promotions.' : undefined}
            value={values.promotionId ?? ''}
            onChange={(event) => set('promotionId', event.target.value === '' ? null : event.target.value)}
          >
            <option value="">None</option>
            {promotions.isLoading && (
              <option disabled>Loading promotions…</option>
            )}
            {!promotions.isLoading &&
              promotions.error === undefined &&
              selectablePromotions.length === 0 && (
                <option disabled>No promotions available</option>
              )}
            {!promotions.isLoading &&
              promotions.error === undefined &&
              selectablePromotions.map((promotion: Promotion) => (
                <option key={promotion.id} value={promotion.id}>
                  {formatPromotionLabel(promotion)}
                </option>
              ))}
          </SelectField>

          <TextField
            name="next-drop-button-text"
            label="Button text"
            value={values.buttonText ?? 'Get Access'}
            onChange={(event) => set('buttonText', event.target.value)}
            hint="Defaults to 'Get Access' when left empty."
          />
        </div>

        <ButtonPreview
          label={values.buttonText === null || values.buttonText === '' ? 'Get Access' : values.buttonText}
          url={buttonUrl}
        />

        <label className="flex items-center gap-2 text-[13px] text-ink">
          <input
            type="checkbox"
            checked={values.isPublished}
            onChange={(event) => set('isPublished', event.target.checked)}
          />
          {values.isPublished ? 'Publish when saved' : 'Save as draft'}
        </label>

        {values.isPublished && (
          <p className="text-[12px] text-graphite">
            Only one next drop can be published at a time. Publishing this drop
            will unpublish any currently published drop.
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
          <Action type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Action>
          <Action type="submit" size="sm" disabled={saving}>
            {saving ? 'Saving…' : drop ? 'Save changes' : 'Create drop'}
          </Action>
        </div>
      </form>
    </Modal>
  )
}