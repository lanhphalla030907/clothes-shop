import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { PageHeader, Panel } from '@/components/account/PageHeader'
import { FormError, TextField, TextAreaField } from '@/components/account/Field'
import { EmptyState, InlineNotice } from '@/components/account/States'
import { Modal } from '@/components/account/Modal'
import { SkeletonCard } from '@/components/account/Skeleton'
import {
  createFeedback,
  deleteFeedback,
  fetchFeedbackPage,
  updateFeedback,
} from '@/features/feedback/api'
import { FEEDBACK_LIMITS } from '@/features/feedback/rules'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { toUserMessage } from '@/lib/api/errors'
import type { CustomerFeedbackPage, Feedback } from '@/types/api'

/**
 * A customer's own feedback: what they have said about the studio, and the
 * form to add or change it.
 *
 * Every row is scoped to the caller by the session. A row stays `UNPUBLISHED`
 * until an administrator publishes it, and the customer can never flip that
 * switch themselves.
 */
export default function Feedback() {
  const page = useAsyncResource<CustomerFeedbackPage>(
    (signal) => fetchFeedbackPage({ page: 1, limit: 20 }, signal),
    [],
  )

  const [editing, setEditing] = useState<Feedback | 'new' | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Feedback | null>(null)

  const rows = page.data?.items ?? []

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Account"
        title="Feedback"
        description="Tell the studio what you think. Your note is held privately until a team member publishes it, so nothing appears on the storefront without a review."
        action={
          <Action size="sm" onClick={() => setEditing('new')} withArrow>
            Add feedback
          </Action>
        }
      />

      {page.error !== undefined && (
        <InlineNotice message={toUserMessage(page.error)} onDismiss={() => page.refetch()} />
      )}

      {page.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <SkeletonCard rows={2} />
          <SkeletonCard rows={2} />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          eyebrow="No feedback yet"
          title="You have not shared any feedback yet"
          description="Once you add a note it will appear here, held privately until it is published on the storefront."
          action={
            <Action onClick={() => setEditing('new')} withArrow>
              Add your first note
            </Action>
          }
        />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {rows.map((row) => (
            <li key={row.id}>
              <FeedbackRow
                row={row}
                onEdit={() => setEditing(row)}
                onDelete={() => setPendingDelete(row)}
              />
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <FeedbackFormModal
          key={editing === 'new' ? 'new' : editing.id}
          feedback={editing === 'new' ? undefined : editing}
          isSaving={false}
          serverError={page.error}
          onClose={() => setEditing(null)}
          onSubmit={async (values) => {
            if (editing === 'new') {
              if (await createFeedback(values)) setEditing(null)
              return
            }
            if (await updateFeedback(editing.id, values)) setEditing(null)
          }}
        />
      )}

      {pendingDelete && (
        <DeleteFeedbackModal
          row={pendingDelete}
          onClose={() => setPendingDelete(null)}
          onConfirm={async () => {
            await deleteFeedback(pendingDelete.id)
            setPendingDelete(null)
            page.refetch()
          }}
        />
      )}
    </div>
  )
}

type FeedbackRowProps = {
  row: Feedback
  onEdit: () => void
  onDelete: () => void
}

const FeedbackRow = ({ row, onEdit, onDelete }: FeedbackRowProps) => (
  <Panel className="flex h-full flex-col p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-[15px] font-semibold text-ink">{row.title}</h2>
        <span className={`inline-flex items-center gap-1.5 mt-2 border px-2.5 py-0.5 rounded text-[11px] font-medium ${
          row.status === 'PUBLISHED'
            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600'
            : 'border-line bg-bone text-graphite'
        }`}>
          {row.status === 'PUBLISHED' ? 'Published' : 'Unpublished'}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex min-h-9 items-center gap-1.5 text-[13px] font-medium text-graphite transition-colors hover:text-ink"
        >
          <Pencil size={13} strokeWidth={1.6} aria-hidden />
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="ml-auto inline-flex min-h-9 items-center gap-1.5 text-[13px] font-medium text-graphite transition-colors hover:text-signal"
        >
          <Trash2 size={13} strokeWidth={1.6} aria-hidden />
          Delete
        </button>
      </div>
    </div>

    <p className="mt-4 leading-relaxed text-graphite not-italic">{row.message}</p>

    <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-6 border-t border-line-soft">
      <span className="text-xs text-graphite/60 font-mono">
        {new Date(row.createdAt).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })}
      </span>
    </div>
  </Panel>
)

type FeedbackFormModalProps = {
  feedback: Feedback | undefined
  isSaving: boolean
  serverError: unknown
  onClose: () => void
  onSubmit: (values: { title: string; message: string }) => Promise<void>
}

const FEEDBACK_FORM_ID = 'feedback-form'

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
      title={feedback ? 'Edit your note' : 'Add your note'}
      onClose={onClose}
      footer={
        <>
          <Action variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Action>
          <Action size="sm" type="submit" form={FEEDBACK_FORM_ID} disabled={isSaving}>
            {isSaving ? 'Saving' : feedback ? 'Save changes' : 'Add note'}
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
          maxLength={FEEDBACK_LIMITS.title}
          required
          autoComplete="off"
        />

        <TextAreaField
          name="message"
          label="Message"
          placeholder="Tell us what you think…"
          value={values.message}
          onChange={(event) => set('message')(event.target.value)}
          error={errors.message}
          maxLength={FEEDBACK_LIMITS.message}
          required
        />
      </form>
    </Modal>
  )
}

type DeleteFeedbackModalProps = {
  row: Feedback
  onClose: () => void
  onConfirm: () => Promise<void>
}

const DeleteFeedbackModal = ({ row, onClose, onConfirm }: DeleteFeedbackModalProps) => (
  <Modal title="Delete this note?" onClose={onClose}>
    <p className="text-sm leading-relaxed text-graphite">
      <span className="text-ink">{row.title}</span> will be removed from your feedback. It will
      no longer appear on your account or, if it was published, on the storefront.
    </p>
    <div className="mt-6 flex justify-end gap-2.5">
      <Action variant="ghost" size="sm" onClick={onClose}>
        Keep it
      </Action>
      <Action size="sm" onClick={() => void onConfirm()}>
        Delete note
      </Action>
    </div>
  </Modal>
)
