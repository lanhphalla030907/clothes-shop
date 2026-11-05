import { useState } from 'react'
import {
  Eye,
  EyeOff,
  ImageUp,
  Pencil,
  Trash2,
} from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import {
  EmptyState,
  ErrorState,
  InlineNotice,
} from '@/components/account/States'
import { Skeleton } from '@/components/account/Skeleton'
import {
  createAdminPoster,
  deleteAdminPoster,
  fetchAdminPosters,
  replaceAdminPosterImage,
  updateAdminPoster,
} from '@/features/adminPosters/api'
import {
  DeletePosterModal,
  PosterEditModal,
  PosterReplaceImageModal,
  PosterUploadModal,
} from '@/features/adminPosters/components/PosterModals'
import { buildUpdatePosterRequest } from '@/features/adminPosters/rules'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { useMutation } from '@/hooks/useMutation'
import { useFeedback } from '@/context/feedbackContext'
import { toUserMessage } from '@/lib/api/errors'
import type {
  CreatePosterInput,
  Poster,
  PosterFormValues,
} from '@/types/api'

type FormState = { poster: Poster | undefined } | null

/**
 * Poster management.
 *
 * A poster is an image plus optional title, display order and visibility. The
 * image is uploaded as multipart; every other edit is JSON. Both routes are the
 * existing `/admin/posters` contracts — nothing is invented here.
 */
export default function PostersIndex() {
  const { showFeedback } = useFeedback()
  const posters = useAsyncResource<Poster[]>(
    (signal) => fetchAdminPosters(signal),
    [],
  )

  const list = posters.data ?? []

  const [formState, setFormState] = useState<FormState>(null)
  const [replaceTarget, setReplaceTarget] = useState<Poster | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Poster | null>(null)

  const refresh = () => {
    void posters.refetch()
  }

  const createMutation = useMutation(
    (input: CreatePosterInput) => createAdminPoster(input),
    {
      onSuccess: () => {
        refresh()
        showFeedback({
          type: 'success',
          title: 'Poster uploaded',
          message: 'The poster is active and now appears in the homepage carousel.',
        })
      },
    },
  )

  const updateMutation = useMutation(
    (input: { poster: Poster; values: PosterFormValues }) =>
      updateAdminPoster(
        input.poster.id,
        buildUpdatePosterRequest(input.values, input.poster),
      ),
    {
      onSuccess: () => {
        refresh()
        showFeedback({
          type: 'success',
          title: 'Poster updated',
          message: 'The poster title and display order were saved.',
        })
      },
    },
  )

  const replaceMutation = useMutation(
    (input: { poster: Poster; file: File }) =>
      replaceAdminPosterImage(input.poster.id, { file: input.file }),
    {
      onSuccess: () => {
        refresh()
        showFeedback({
          type: 'success',
          title: 'Poster image replaced',
          message: 'The new image is live on the storefront.',
        })
      },
    },
  )

  const toggleMutation = useMutation(
    (poster: Poster) =>
      updateAdminPoster(poster.id, { isActive: !poster.isActive }),
    {
      onSuccess: (poster) => {
        refresh()
        showFeedback({
          type: 'success',
          title: poster.isActive ? 'Poster activated' : 'Poster paused',
          message: poster.isActive
            ? 'The poster is now part of the homepage carousel.'
            : 'The poster is hidden from the storefront until it is activated again.',
        })
      },
    },
  )

  const deleteMutation = useMutation(
    (poster: Poster) => deleteAdminPoster(poster.id),
    {
      onSuccess: () => {
        refresh()
        setPendingDelete(null)
        showFeedback({
          type: 'success',
          title: 'Poster deleted',
          message: 'The poster and its image were removed.',
        })
      },
    },
  )

  const openCreate = () => {
    createMutation.reset()
    updateMutation.reset()
    setFormState({ poster: undefined })
  }

  const openEdit = (poster: Poster) => {
    createMutation.reset()
    updateMutation.reset()
    setFormState({ poster })
  }

  const openReplace = (poster: Poster) => {
    replaceMutation.reset()
    setReplaceTarget(poster)
  }

  const requestDelete = (poster: Poster) => {
    deleteMutation.reset()
    setPendingDelete(poster)
  }

  const editingPoster = formState?.poster

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Storefront"
        title="Posters"
        description="Campaign images shown across the homepage carousel, directly below the category section. Only active posters are visible to shoppers."
        action={
          <Action size="sm" onClick={openCreate}>
            Upload poster
          </Action>
        }
      />

      {toggleMutation.error !== undefined && (
        <InlineNotice
          message={toUserMessage(toggleMutation.error)}
          onDismiss={toggleMutation.reset}
        />
      )}

      {posters.isLoading && <PosterListSkeleton />}

      {!posters.isLoading && posters.error !== undefined && (
        <ErrorState
          message={toUserMessage(posters.error)}
          onRetry={posters.refetch}
        />
      )}

      {!posters.isLoading &&
        posters.error === undefined &&
        list.length === 0 && (
          <EmptyState
            align="left"
            eyebrow="No posters"
            title="The homepage carousel is empty"
            description="Upload the first campaign image. The carousel section stays hidden on the storefront until at least one poster is active."
            action={
              <Action size="sm" onClick={openCreate}>
                Upload poster
              </Action>
            }
          />
        )}

      {!posters.isLoading &&
        posters.error === undefined &&
        list.length > 0 && (
          <div className="space-y-4">
            <p className="text-[12px] text-graphite" aria-live="polite">
              {list.length} {list.length === 1 ? 'poster' : 'posters'} ·{' '}
              {list.filter((poster) => poster.isActive).length} active
            </p>

            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {list.map((poster) => (
                <li
                  key={poster.id}
                  className={`border border-line bg-paper transition-opacity ${
                    toggleMutation.isPending ? 'opacity-80' : ''
                  }`}
                >
                  <div className="relative aspect-[16/9] overflow-hidden bg-bone">
                    <img
                      src={poster.imageUrl}
                      alt={posterLabel(poster)}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                    <PosterStatusBadge isActive={poster.isActive} />
                  </div>

                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold text-ink">
                          {posterLabel(poster)}
                        </p>
                        <p className="mt-1 font-mono text-[11px] text-graphite">
                          Display order {poster.displayOrder}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line-soft pt-3">
                      <button
                        type="button"
                        onClick={() => openEdit(poster)}
                        className="inline-flex min-h-9 items-center gap-1.5 text-[12px] font-medium text-graphite transition-colors hover:text-ink"
                      >
                        <Pencil size={13} strokeWidth={1.7} aria-hidden />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => openReplace(poster)}
                        className="inline-flex min-h-9 items-center gap-1.5 text-[12px] font-medium text-graphite transition-colors hover:text-ink"
                      >
                        <ImageUp size={13} strokeWidth={1.7} aria-hidden />
                        Replace image
                      </button>

                      <button
                        type="button"
                        onClick={() => void toggleMutation.run(poster)}
                        disabled={toggleMutation.isPending}
                        aria-label={`${poster.isActive ? 'Deactivate' : 'Activate'} ${posterLabel(
                          poster,
                        )}`}
                        className="inline-flex min-h-9 items-center gap-1.5 text-[12px] font-medium text-graphite transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {poster.isActive ? (
                          <EyeOff size={13} strokeWidth={1.7} aria-hidden />
                        ) : (
                          <Eye size={13} strokeWidth={1.7} aria-hidden />
                        )}
                        {poster.isActive ? 'Deactivate' : 'Activate'}
                      </button>

                      <button
                        type="button"
                        onClick={() => requestDelete(poster)}
                        aria-label={`Delete ${posterLabel(poster)}`}
                        className="ml-auto inline-flex min-h-9 items-center gap-1.5 text-[12px] font-medium text-graphite transition-colors hover:text-signal"
                      >
                        <Trash2 size={13} strokeWidth={1.7} aria-hidden />
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <p className="max-w-2xl text-[13px] leading-relaxed text-graphite">
              The homepage reads the same records through the public active-poster
              endpoint, ordered by display order. A paused poster stays here but
              is never sent to the storefront.
            </p>
          </div>
        )}

      {formState !== null && editingPoster === undefined && (
        <PosterUploadModal
          isSaving={createMutation.isPending}
          serverError={createMutation.error}
          onClose={() => setFormState(null)}
          onSubmit={(input) => createMutation.run(input)}
        />
      )}

      {formState !== null && editingPoster !== undefined && (
        <PosterEditModal
          poster={editingPoster}
          isSaving={updateMutation.isPending}
          serverError={updateMutation.error}
          onClose={() => setFormState(null)}
          onSubmit={(values) =>
            updateMutation.run({ poster: editingPoster, values })
          }
        />
      )}

      {replaceTarget !== null && (
        <PosterReplaceImageModal
          poster={replaceTarget}
          isSaving={replaceMutation.isPending}
          serverError={replaceMutation.error}
          onClose={() => setReplaceTarget(null)}
          onSubmit={(file) =>
            replaceMutation.run({ poster: replaceTarget, file })
          }
        />
      )}

      {pendingDelete !== null && (
        <DeletePosterModal
          poster={pendingDelete}
          isDeleting={deleteMutation.isPending}
          error={deleteMutation.error}
          onClose={() => {
            setPendingDelete(null)
            deleteMutation.reset()
          }}
          onConfirm={async () => {
            await deleteMutation.run(pendingDelete)
          }}
        />
      )}
    </div>
  )
}

const posterLabel = (poster: Poster): string => {
  const title = poster.title?.trim() ?? ''
  return title === '' ? 'Untitled poster' : title
}

const PosterStatusBadge = ({ isActive }: { isActive: boolean }) => (
  <span
    className={`absolute top-3 left-3 inline-flex h-7 items-center border px-2.5 text-[11px] font-semibold tracking-[0.06em] uppercase ${
      isActive
        ? 'border-line bg-paper text-ink'
        : 'border-line bg-bone/90 text-ash'
    }`}
  >
    {isActive ? 'Active' : 'Inactive'}
  </span>
)

const PosterListSkeleton = () => (
  <div
    className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
    role="status"
    aria-busy="true"
  >
    <span className="sr-only">Loading posters</span>
    {Array.from({ length: 3 }, (_, index) => (
      <div key={index} className="border border-line bg-paper">
        <Skeleton className="aspect-[16/9] w-full" />
        <div className="space-y-3 p-5">
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
    ))}
  </div>
)
