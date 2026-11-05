import { useState } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { TextField } from '@/components/account/Field'
import { EmptyState, ErrorState } from '@/components/account/States'
import { SkeletonText } from '@/components/account/Skeleton'
import { fetchAdminUser } from '@/features/adminUsers/api'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { toUserMessage } from '@/lib/api/errors'
import type { AdminUserRecord, ISODateTime } from '@/types/api'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const formatDateTime = (value: ISODateTime | null): string => {
  if (value === null) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Customer record lookup.
 *
 * The backend exposes exactly one user read for an administrator:
 * `GET /admin/users/:id`. There is no customer list, search, update or delete
 * route, so this page deliberately offers only an id lookup and says so. The
 * record is `UserResponseDto`, which carries no password hash or token.
 */
export default function CustomerLookup() {
  const [params, setParams] = useSearchParams()
  const id = (params.get('id') ?? '').trim()
  const validId = UUID_PATTERN.test(id)
  const [draft, setDraft] = useState(id)
  const [inputError, setInputError] = useState<string | undefined>(undefined)

  const user = useAsyncResource<AdminUserRecord | undefined>(
    (signal) => (validId ? fetchAdminUser(id, signal) : Promise.resolve(undefined)),
    [id, validId],
  )

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextId = draft.trim()

    if (nextId === '') {
      setInputError('Enter a customer id to look up')
      return
    }
    if (!UUID_PATTERN.test(nextId)) {
      setInputError('Enter a complete user UUID, for example 75a28c31-1124-4439-840a-48182a0fba7d')
      return
    }

    const next = new URLSearchParams(params)
    next.set('id', nextId)
    setParams(next)
    setInputError(undefined)
  }

  return (
    <div className="max-w-4xl space-y-8">
      <AdminPageHeader
        eyebrow="Customers"
        title="Customer lookup"
        description="The admin API exposes a single user record by id. There is no customer list or search endpoint, so this screen looks up one exact user id at a time."
      />

      <section className="border border-line bg-paper p-5 sm:p-6" aria-label="Customer lookup form">
        <form onSubmit={submit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <TextField
              name="customer-id"
              label="Customer user id"
              required
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value)
                setInputError(undefined)
              }}
              hint="A UUID. The API also returns 404 for an id that does not exist."
              error={inputError}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <Action type="submit" size="sm" className="shrink-0">
            <Search size={14} strokeWidth={1.8} aria-hidden />
            Look up
          </Action>
        </form>
      </section>

      {!validId && id !== '' && (
        <ErrorState
          message="The id in the address bar is not a complete UUID. Enter a valid one above."
          className="border-signal/25"
        />
      )}

      {validId && user.isLoading && (
        <section className="border border-line bg-paper p-5 sm:p-6" role="status" aria-busy="true">
          <span className="sr-only">Loading customer</span>
          <SkeletonText lines={6} />
        </section>
      )}

      {validId && !user.isLoading && user.error !== undefined && (
        <ErrorState message={toUserMessage(user.error)} onRetry={user.refetch} />
      )}

      {validId && !user.isLoading && user.error === undefined && user.data !== undefined && (
        <CustomerRecord user={user.data} />
      )}

      {id === '' && (
        <EmptyState
          align="left"
          eyebrow="Lookup only"
          title="No customer loaded"
          description="Paste a user UUID above. Customer lists, searches, edits and deletes are not available in the backend this dashboard uses."
        />
      )}
    </div>
  )
}

const CustomerRecord = ({ user }: { user: AdminUserRecord }) => (
  <section className="border border-line bg-paper" aria-labelledby="customer-record-heading">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-5 py-5 sm:px-6">
      <div className="min-w-0">
        <p className="eyebrow text-graphite">User record</p>
        <h2
          id="customer-record-heading"
          className="mt-2 text-xl font-semibold tracking-[-0.015em] text-ink"
        >
          {user.firstName} {user.lastName}
        </h2>
        <p className="mt-1 break-all text-[13.5px] text-graphite">{user.email}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <MetaBadge label={user.role} tone={user.role === 'ADMIN' ? 'strong' : 'soft'} />
        <MetaBadge label={user.status} tone={user.status === 'ACTIVE' ? 'soft' : 'warn'} />
      </div>
    </div>

    <dl className="grid gap-px bg-line sm:grid-cols-2">
      <Field label="User id" value={user.id} mono />
      <Field label="Phone" value={user.phone ?? '—'} />
      <Field label="Email verified" value={formatDateTime(user.emailVerifiedAt)} />
      <Field label="Last login" value={formatDateTime(user.lastLoginAt)} />
      <Field label="Created" value={formatDateTime(user.createdAt)} />
      <Field label="Updated" value={formatDateTime(user.updatedAt)} />
    </dl>

    <div className="border-t border-line px-5 py-4 sm:px-6">
      <p className="text-[12.5px] leading-relaxed text-graphite">
        Read-only record. The backend exposes no administrator route to change a user's role,
        status or profile, and this response never includes authentication material.
      </p>
    </div>
  </section>
)

const MetaBadge = ({
  label,
  tone,
}: {
  label: string
  tone: 'strong' | 'soft' | 'warn'
}) => {
  const classes = {
    strong: 'border-ink bg-ink text-paper',
    soft: 'border-line bg-bone text-ink',
    warn: 'border-signal/30 bg-signal-soft text-signal',
  } as const

  return (
    <span
      className={`inline-flex h-7 items-center border px-2.5 text-[11px] font-semibold tracking-[0.06em] uppercase ${classes[tone]}`}
    >
      {label}
    </span>
  )
}

const Field = ({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) => (
  <div className="bg-paper px-5 py-4 sm:px-6">
    <dt className="text-[12px] font-medium text-graphite">{label}</dt>
    <dd className={`mt-1.5 break-all text-[13.5px] text-ink ${mono ? 'font-mono text-[12.5px]' : ''}`}>
      {value}
    </dd>
  </div>
)
