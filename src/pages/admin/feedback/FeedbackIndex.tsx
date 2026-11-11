import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { EmptyState, ErrorState, InlineNotice } from '@/components/account/States'
import { FormError, SelectField, TextField, TextAreaField } from '@/components/account/Field'
import { Modal } from '@/components/account/Modal'
import {
  createAdminFeedback,
  deleteAdminFeedback,
  fetchAdminFeedbackPage,
  setFeedbackStatus,
  updateAdminFeedback,
} from '@/features/feedback/api'
import {
  FEEDBACK_PAGE_SIZES,
  FEEDBACK_FILTER_OPTIONS,
  feedbackStatusLabel,
  isPublished,
} from '@/features/feedback/rules'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { toUserMessage } from '@/lib/api/errors'
import type { AdminFeedbackListResponse, Feedback } from '@/types/api'

/**
 * The administrative feedback list.
 *
 * Filter state lives in the URL, matching the other admin indexes. Every row can
 * be edited, published or unpublished, and removed. A new row is created for an
 * existing customer account through the same create modal.
 */
export default function FeedbackIndex() {
  const [params, setParams] = useSearchParams()

  const page = parsePositivePage(params.get('page'))
  const limit = parsePageSize(params.get('limit'))
  const searchParam = params.get('search') ?? ''
  const appliedSearch = searchParam.trim()
  const statusParam = params.get('status')
  const appliedStatus = isFeedbackStatus(statusParam) ? statusParam : undefined

  const [searchDraft, setSearchDraft] = useState(searchParam)

  const query = useMemo(
    () => ({
      page,
      limit,
      search: appliedSearch === '' ? undefined : appliedSearch,
      status: appliedStatus,
    }),
    [page, limit, appliedSearch, appliedStatus],
  )

  const feedback = useAsyncResource<AdminFeedbackListResponse>(
    (signal) => fetchAdminFeedbackPage(query, signal),
    [query],
  )

  const rows = feedback.data?.items ?? []
  const pagination = feedback.data?.pagination
  const totalPages = pagination?.totalPages ?? 0
  const hasFilters = appliedSearch !== '' || appliedStatus !== undefined

  const [creating, setCreating] = useState<Feedback | null>(null)
  const [editing, setEditing] = useState<Feedback | null>(null)
  const [toggling, setToggling] = useState<Feedback | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Feedback | null>(null)

  const updateParam = (key: string, value: string, resetPage = false) => {
    const next = new URLSearchParams(params)
    if (value === '') next.delete(key)
    else next.set(key, value)
    if (resetPage) next.delete('page')
    setParams(next, { replace: true })
  }

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    updateParam('search', searchDraft.trim(), true)
  }

  const goToPage = (nextPage: number) => {
    updateParam('page', String(nextPage))
  }

  const clearFilters = () => {
    setSearchDraft('')
    setParams({}, { replace: true })
  }

  const searchFailedWithData = feedback.error !== undefined && feedback.data !== undefined

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Feedback"
        title="Feedback"
        description="Every note a customer has left about the studio. Create a note for a customer, publish or unpublish any row, and remove what should not stay."
        action={
          <Action size="sm" onClick={() => setCreating(null)} withArrow>
            Create feedback
          </Action>
        }
      />

      {feedback.error !== undefined && (
        <InlineNotice message={toUserMessage(feedback.error)} onDismiss={() => feedback.refetch()} />
      )}

      <div className="space-y-4">
        <form onSubmit={submitSearch} className="flex flex-wrap items-end gap-x-4 gap-y-4 rounded-xl border border-line bg-paper-pure p-5 shadow-xs">
          <div className="w-full sm:min-w-64 sm:flex-1">
            <TextField
              name="feedback-search"
              label="Search feedback"
              placeholder="Title, message, or customer name…"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="w-full sm:w-44">
            <SelectField
              name="feedback-status"
              label="Status"
              value={appliedStatus ?? ''}
              onChange={(event) => updateParam('status', event.target.value, true)}
            >
              <option value="">All statuses</option>
              {FEEDBACK_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>
          </div>
          <div className="flex items-center gap-2">
            <Action type="submit" size="sm">
              <Search size={14} strokeWidth={1.8} aria-hidden />
              Search
            </Action>
            {hasFilters && (
              <Action type="button" variant="ghost" size="sm" onClick={clearFilters}>
                Clear
              </Action>
            )}
          </div>
        </form>

        {searchFailedWithData && (
          <InlineNotice
            message={toUserMessage(feedback.error)}
            onDismiss={() => undefined}
          />
        )}

        {feedback.isLoading && <FeedbackSkeleton />}

        {!feedback.isLoading && feedback.error !== undefined && feedback.data === undefined && (
          <ErrorState message={toUserMessage(feedback.error)} onRetry={feedback.refetch} />
        )}

        {!feedback.isLoading && rows.length === 0 && (
          <EmptyState
            align="left"
            eyebrow={hasFilters ? 'No matches' : 'No feedback yet'}
            title={hasFilters ? 'No feedback matches these filters' : 'No feedback has been left'}
            description={
              hasFilters
                ? 'Try a broader search, another status, or clear the filters.'
                : 'Feedback appears here as customers leave it.'
            }
            action={
              hasFilters ? (
                <Action variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Action>
              ) : (
                <Action variant="ghost" size="sm" onClick={feedback.refetch}>
                  Refresh
                </Action>
              )
            }
          />
        )}

        {!feedback.isLoading && rows.length > 0 && (
          <>
            <div className="flex items-center justify-between gap-4">
              <p className="text-[12px] text-graphite" aria-live="polite">
                Showing {rows.length} of {pagination?.total ?? rows.length}{' '}
                {(pagination?.total ?? rows.length) === 1 ? 'note' : 'notes'}
              </p>
              {feedback.isRefreshing && (
                <span className="text-[12px] text-graphite" role="status">
                  Refreshing…
                </span>
              )}
            </div>

            <div className="overflow-hidden rounded-xl border border-line bg-paper-pure shadow-xs">
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-left text-[13px] border-collapse">
                  <thead>
                    <tr className="border-b border-line bg-canvas/40">
                      <th scope="col" className="px-5 py-3 text-[12px] font-medium text-graphite first:pl-5 last:pr-5">
                        Note
                      </th>
                      <th scope="col" className="px-4 py-3 text-[12px] font-medium text-graphite">
                        Customer
                      </th>
                      <th scope="col" className="px-4 py-3 text-[12px] font-medium text-graphite">
                        Status
                      </th>
                      <th scope="col" className="px-4 py-3 text-[12px] font-medium text-graphite">
                        Left
                      </th>
                      <th scope="col" className="px-5 py-3 text-right text-[12px] font-medium text-graphite">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-soft">
                    {rows.map((row) => (
                      <tr key={row.id}>
                        <td className="px-5 py-4">
                          <Link
                            to={`/admin/feedback/${row.id}`}
                            className="font-mono text-[12.5px] font-medium text-ink underline-offset-4 hover:underline"
                          >
                            {row.title}
                          </Link>
                          <p className="mt-1 block text-[11.5px] text-graphite">
                            {row.message}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="truncate text-[13.5px] font-medium text-ink">
                            {row.customerName}
                          </p>
                          <p className="mt-0.5 truncate text-[12px] text-graphite">
                            {row.customerEmail}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 border px-2.5 py-0.5 rounded text-[11px] font-medium ${
                              isPublished(row.status)
                                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600'
                                : 'border-line bg-bone text-graphite'
                            }`}
                          >
                            {feedbackStatusLabel(row.status)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-[13px] text-graphite">
                          {new Date(row.createdAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center gap-2">
                            <Action
                              variant="outline"
                              size="sm"
                              onClick={() => setEditing(row)}
                              disabled={toggling !== null}
                            >
                              Edit
                            </Action>
                            <Action
                              variant="outline"
                              size="sm"
                              onClick={() => setToggling(row)}
                              disabled={toggling !== null}
                            >
                              {isPublished(row.status) ? 'Unpublish' : 'Publish'}
                            </Action>
                            <Action
                              variant="ghost"
                              size="sm"
                              onClick={() => setPendingDelete(row)}
                              disabled={toggling !== null}
                            >
                              Delete
                            </Action>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-line-soft lg:hidden">
                {rows.map((row) => (
                  <li key={row.id} className="space-y-3 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          to={`/admin/feedback/${row.id}`}
                          className="font-mono text-[12.5px] font-medium text-ink underline-offset-4 hover:underline"
                        >
                          {row.title}
                        </Link>
                        <p className="mt-1 text-[11.5px] text-graphite">{row.message}</p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 border px-2.5 py-0.5 rounded text-[11px] font-medium ${
                          isPublished(row.status)
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600'
                            : 'border-line bg-bone text-graphite'
                        }`}
                      >
                        {feedbackStatusLabel(row.status)}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <p className="text-[13.5px] font-medium text-ink">{row.customerName}</p>
                      <p className="mt-0.5 truncate text-[12px] text-graphite">
                        {row.customerEmail}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t border-line-soft pt-3">
                      <span className="text-[12px] text-graphite">
                        {new Date(row.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <div className="flex items-center gap-2">
                        <Action
                          variant="outline"
                          size="sm"
                          onClick={() => setEditing(row)}
                          disabled={toggling !== null}
                        >
                          Edit
                        </Action>
                        <Action
                          variant="outline"
                          size="sm"
                          onClick={() => setToggling(row)}
                          disabled={toggling !== null}
                        >
                          {isPublished(row.status) ? 'Unpublish' : 'Publish'}
                        </Action>
                        <Action
                          variant="ghost"
                          size="sm"
                          onClick={() => setPendingDelete(row)}
                          disabled={toggling !== null}
                        >
                          Delete
                        </Action>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <Pagination
              page={pagination?.page ?? page}
              totalPages={totalPages}
              limit={limit}
              isRefreshing={feedback.isRefreshing}
              onPage={goToPage}
              onLimit={(next) => updateParam('limit', String(next), true)}
            />
          </>
        )}
      </div>

      {creating && (
        <FeedbackFormModal
          key="create"
          feedback={undefined}
          isSaving={false}
          serverError={feedback.error}
          onClose={() => setCreating(null)}
          onSubmit={async (values) => {
            const customerId = window.prompt('Customer account id')
            if (!customerId) return
            if (await createAdminFeedback({ customerId, ...values })) {
              setCreating(null)
              feedback.refetch()
            }
          }}
        />
      )}

      {editing && (
        <FeedbackFormModal
          key="edit"
          feedback={editing}
          isSaving={false}
          serverError={feedback.error}
          onClose={() => setEditing(null)}
          onSubmit={async (values) => {
            if (await updateAdminFeedback(editing.id, values)) {
              setEditing(null)
              feedback.refetch()
            }
          }}
        />
      )}

      {toggling && (
        <Modal
          title={
            isPublished(toggling.status)
              ? 'Unpublish this note?'
              : 'Publish this note?'
          }
          onClose={() => setToggling(null)}
        >
          <p className="text-sm leading-relaxed text-graphite">
            Publishing makes the note visible on the storefront. Unpublishing hides it
            again but keeps it on the customer's account.
          </p>
          <div className="mt-6 flex justify-end gap-2.5">
            <Action variant="ghost" size="sm" onClick={() => setToggling(null)}>
              Cancel
            </Action>
            <Action size="sm" onClick={async () => {
              await setFeedbackStatus(toggling.id, {
                status: isPublished(toggling.status)
                  ? 'UNPUBLISHED'
                  : 'PUBLISHED',
              })
              setToggling(null)
              feedback.refetch()
            }}>
              {isPublished(toggling.status) ? 'Unpublish' : 'Publish'}
            </Action>
          </div>
        </Modal>
      )}

      {pendingDelete && (
        <Modal title="Delete this note?" onClose={() => setPendingDelete(null)}>
          <p className="text-sm leading-relaxed text-graphite">
            <span className="text-ink">{pendingDelete.title}</span> will be removed from
            feedback entirely. The customer's copy goes with it.
          </p>
          <div className="mt-6 flex justify-end gap-2.5">
            <Action variant="ghost" size="sm" onClick={() => setPendingDelete(null)}>
              Keep it
            </Action>
            <Action size="sm" onClick={async () => {
              await deleteAdminFeedback(pendingDelete.id)
              setPendingDelete(null)
              feedback.refetch()
            }}>
              Delete note
            </Action>
          </div>
        </Modal>
      )}
    </div>
  )
}

function parsePositivePage(value: string | null): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1
}

function parsePageSize(value: string | null): number {
  const parsed = Number(value)
  return (FEEDBACK_PAGE_SIZES as readonly number[]).includes(parsed)
    ? parsed
    : FEEDBACK_PAGE_SIZES[1]
}

function isFeedbackStatus(value: string | null | undefined): value is 'PUBLISHED' | 'UNPUBLISHED' {
  return value === 'PUBLISHED' || value === 'UNPUBLISHED'
}

function Pagination({
  page,
  totalPages,
  limit,
  isRefreshing,
  onPage,
  onLimit,
}: {
  page: number
  totalPages: number
  limit: number
  isRefreshing: boolean
  onPage: (page: number) => void
  onLimit: (limit: number) => void
}) {
  const lastPage = Math.max(totalPages, 1)

  return (
    <nav
      aria-label="Feedback pagination"
      className="flex flex-col gap-4 rounded-xl border border-line bg-paper-pure px-5 py-4 shadow-xs sm:flex-row sm:items-end sm:justify-between"
    >
      <div className="w-full sm:w-36">
        <SelectField
          name="feedback-page-size"
          label="Per page"
          value={String(limit)}
          onChange={(event) => onLimit(Number(event.target.value))}
        >
          {FEEDBACK_PAGE_SIZES.map((size) => (
            <option key={size} value={String(size)}>
              {size}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="flex items-center gap-2 sm:pb-0.5">
        <Action
          variant="outline"
          size="sm"
          disabled={page <= 1 || isRefreshing}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft size={14} strokeWidth={1.8} aria-hidden />
          Previous
        </Action>
        <p className="min-w-28 text-center text-[12.5px] text-graphite" aria-live="polite">
          Page {page} of {lastPage}
        </p>
        <Action
          variant="outline"
          size="sm"
          disabled={page >= lastPage || isRefreshing}
          onClick={() => onPage(page + 1)}
        >
          Next
          <ChevronRight size={14} strokeWidth={1.8} aria-hidden />
        </Action>
      </div>
    </nav>
  )
}

const FeedbackSkeleton = () => (
  <div
    className="border border-line bg-paper p-5 sm:p-6"
    role="status"
    aria-busy="true"
    aria-label="Loading feedback"
  >
    <span className="sr-only">Loading feedback</span>
    {Array.from({ length: 5 }, (_, index) => (
      <div key={index} className="flex items-center gap-4 py-3">
        <div className="h-3 w-1/5 animate-pulse bg-line-soft" />
        <div className="h-3 w-1/3 animate-pulse bg-line-soft" />
        <div className="ml-auto h-3 w-1/6 animate-pulse bg-line-soft" />
      </div>
    ))}
  </div>
)

type FeedbackFormModalProps = {
  feedback: Feedback | undefined
  isSaving: boolean
  serverError: unknown
  onClose: () => void
  onSubmit: (values: { title: string; message: string }) => Promise<void>
}

const FEEDBACK_FORM_ID = 'admin-feedback-form'

const FeedbackFormModal = ({
  feedback,
  isSaving,
  serverError,
  onClose,
  onSubmit,
}: FeedbackFormModalProps) => {
  const [values, setValues] = useState<{ title: string; message: string }>(() =>
    feedback ? { title: feedback.title, message: feedback.message } : { title: '', message: '' },
  )
  const [errors, setErrors] = useState<{ title?: string; message?: string }>({})

  const set = (field: 'title' | 'message') => (value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current))
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const found: { title?: string; message?: string } = {}
    if (values.title.trim() === '') found.title = 'Title is required.'
    if (values.message.trim() === '') found.message = 'Message is required.'
    setErrors(found)
    if (Object.keys(found).length > 0) {
      const first = document.querySelector<HTMLElement>('[aria-invalid="true"]')
      first?.focus()
      return
    }
    await onSubmit({ title: values.title.trim(), message: values.message.trim() })
  }

  return (
    <Modal
      title={feedback ? 'Edit feedback' : 'Create feedback'}
      onClose={onClose}
      footer={
        <>
          <Action variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Action>
          <Action size="sm" type="submit" form={FEEDBACK_FORM_ID} disabled={isSaving}>
            {isSaving ? 'Saving' : feedback ? 'Save changes' : 'Create note'}
          </Action>
        </>
      }
    >
      <form id={FEEDBACK_FORM_ID} onSubmit={(event) => void submit(event)} className="space-y-5">
        {serverError !== undefined && <FormError message={toUserMessage(serverError)} />}

        <TextField
          name="title"
          label="Title"
          placeholder="What stood out?"
          value={values.title}
          onChange={(event) => set('title')(event.target.value)}
          error={errors.title}
          required
          autoComplete="off"
        />

        <TextAreaField
          name="message"
          label="Message"
          placeholder="Tell us what the customer thinks…"
          value={values.message}
          onChange={(event) => set('message')(event.target.value)}
          error={errors.message}
          required
        />
      </form>
    </Modal>
  )
}
