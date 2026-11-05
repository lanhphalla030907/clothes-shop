import { useState } from 'react'
import { ImagePlus, Link2, Pencil, Star, Trash2 } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { Panel, PanelHeader } from '@/components/account/PageHeader'
import { EmptyState, ErrorState, InlineNotice } from '@/components/account/States'
import { Skeleton } from '@/components/account/Skeleton'
import {
  ImageMetadataModal,
  ImageUploadModal,
} from '@/features/adminProducts/components/ImageModals'
import {
  buildCreateImageRequest,
  buildUpdateImageRequest,
} from '@/features/adminProducts/catalogueRules'
import {
  createAdminProductImage,
  deleteAdminProductImage,
  fetchAdminProductImages,
  updateAdminProductImage,
  uploadAdminProductImage,
} from '@/features/adminProducts/subresourcesApi'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { useMutation } from '@/hooks/useMutation'
import { useFeedback } from '@/context/feedbackContext'
import { toUserMessage } from '@/lib/api/errors'
import type {
  ImageMetadataFormValues,
  ImageUploadFormValues,
  Product,
  ProductImage,
} from '@/types/api'

type Panel =
  | { kind: 'upload' }
  | { kind: 'url' }
  | { kind: 'edit'; image: ProductImage }
  | null

/**
 * The product gallery.
 *
 * Images are a separate resource — a product response never includes them — so
 * this section owns one list read and refetches it after every write. Uploading
 * goes through the multipart route; adding by URL goes through the metadata
 * route. Both land in the same list, and the primary-image invariant is left to
 * the service rather than re-implemented here.
 */
export function ProductImagesSection({ product }: { product: Product }) {
  const images = useAsyncResource<ProductImage[]>(
    (signal) => fetchAdminProductImages(product.id, signal),
    [product.id],
  )
  const { showFeedback, confirmFeedback } = useFeedback()
  const [panel, setPanel] = useState<Panel>(null)

  const refresh = () => {
    void images.refetch()
  }

  const uploadMutation = useMutation(
    (values: ImageUploadFormValues) => {
      if (values.file === null) {
        return Promise.reject(new Error('Choose an image before uploading.'))
      }
      return uploadAdminProductImage(product.id, {
        file: values.file,
        altText: values.altText,
        sortOrder: Number(values.sortOrder),
        isPrimary: values.isPrimary,
      })
    },
    {
      onSuccess: () => {
        refresh()
        showFeedback({
          type: 'success',
          title: 'Image uploaded',
          message: 'The product image was uploaded and added to the gallery.',
        })
      },
    },
  )
  const createMutation = useMutation(
    (values: ImageMetadataFormValues) =>
      createAdminProductImage(product.id, buildCreateImageRequest(product.id, values)),
    {
      onSuccess: () => {
        refresh()
        showFeedback({
          type: 'success',
          title: 'Image added',
          message: 'The image was added to the product gallery.',
        })
      },
    },
  )
  const updateMutation = useMutation(
    (input: { image: ProductImage; values: ImageMetadataFormValues }) =>
      updateAdminProductImage(
        product.id,
        input.image.id,
        buildUpdateImageRequest(input.values, input.image),
      ),
    {
      onSuccess: () => {
        refresh()
        showFeedback({
          type: 'success',
          title: 'Image updated',
          message: 'Your image details were saved.',
        })
      },
    },
  )
  const deleteMutation = useMutation(
    (image: ProductImage) => deleteAdminProductImage(product.id, image.id),
    {
      onSuccess: () => {
        refresh()
        setPanel(null)
        showFeedback({
          type: 'success',
          title: 'Image deleted',
          message: 'The product image was deleted.',
        })
      },
      onError: (error) =>
        showFeedback({
          type: 'error',
          title: 'Could not delete image',
          message: toUserMessage(error),
        }),
    },
  )
  const primaryMutation = useMutation(
    (image: ProductImage) =>
      updateAdminProductImage(product.id, image.id, { isPrimary: true }),
    {
      onSuccess: () => {
        refresh()
        showFeedback({
          type: 'success',
          title: 'Primary image updated',
          message: 'The product page will now feature the selected image first.',
        })
      },
    },
  )

  const imageList = images.data ?? []
  const defaultPrimary = imageList.length === 0

  const openPanel = (next: Panel) => {
    uploadMutation.reset()
    createMutation.reset()
    updateMutation.reset()
    deleteMutation.reset()
    primaryMutation.reset()
    setPanel(next)
  }

  const requestDelete = async (image: ProductImage) => {
    const confirmed = await confirmFeedback({
      type: 'warning',
      title: 'Delete this image?',
      message: 'This image will be permanently removed from the product gallery.',
      confirmLabel: 'Delete image',
    })
    if (confirmed) await deleteMutation.run(image)
  }

  return (
    <Panel>
      <PanelHeader
        title="Images"
        hint="Gallery media shown on the product page. Upload a file or add an existing URL."
        action={
          <div className="flex flex-wrap gap-2">
            <Action size="sm" onClick={() => openPanel({ kind: 'upload' })}>
              <ImagePlus size={14} strokeWidth={1.7} aria-hidden />
              Upload
            </Action>
            <Action
              variant="outline"
              size="sm"
              onClick={() => openPanel({ kind: 'url' })}
            >
              <Link2 size={14} strokeWidth={1.7} aria-hidden />
              Add by URL
            </Action>
          </div>
        }
      />

      {images.isLoading && (
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-busy="true">
          <span className="sr-only">Loading images</span>
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="aspect-[4/5] w-full" />
          ))}
        </div>
      )}

      {!images.isLoading && images.error !== undefined && (
        <div className="p-5">
          <ErrorState message={toUserMessage(images.error)} onRetry={images.refetch} />
        </div>
      )}

      {primaryMutation.error !== undefined && (
        <div className="px-5 pt-5">
          <InlineNotice
            message={toUserMessage(primaryMutation.error)}
            onDismiss={primaryMutation.reset}
          />
        </div>
      )}

      {!images.isLoading && images.error === undefined && imageList.length === 0 && (
        <div className="p-5">
          <EmptyState
            align="left"
            eyebrow="No images"
            title="This product has no gallery images"
            description="Upload a file or add an existing URL. Products without images still exist in the catalogue, but the storefront has nothing to show."
            action={
              <>
                <Action size="sm" onClick={() => openPanel({ kind: 'upload' })}>
                  Upload image
                </Action>
                <Action variant="outline" size="sm" onClick={() => openPanel({ kind: 'url' })}>
                  Add by URL
                </Action>
              </>
            }
          />
        </div>
      )}

      {!images.isLoading && imageList.length > 0 && (
        <ul className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {imageList.map((image) => (
            <li key={image.id} className="border border-line bg-paper-pure">
              <div className="relative aspect-[4/5] overflow-hidden bg-bone">
                <img
                  src={image.imageUrl}
                  alt={image.altText ?? `${product.name} image`}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                {image.isPrimary && (
                  <span className="absolute top-2 left-2 inline-flex items-center gap-1 border border-ink/15 bg-paper px-2 py-1 text-[10px] font-semibold tracking-[0.06em] uppercase text-ink">
                    <Star size={11} strokeWidth={2} aria-hidden />
                    Primary
                  </span>
                )}
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <p className="text-[13px] leading-relaxed text-graphite">
                    {image.altText ?? <span className="italic">No alt text</span>}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-ash">
                    Sort {image.sortOrder} · {image.publicId}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t border-line-soft pt-3">
                  {!image.isPrimary && (
                    <button
                      type="button"
                      onClick={() => primaryMutation.run(image)}
                      disabled={primaryMutation.isPending}
                      className="inline-flex min-h-9 items-center gap-1.5 text-[12px] font-medium text-graphite transition-colors hover:text-ink disabled:opacity-40"
                    >
                      <Star size={13} strokeWidth={1.7} aria-hidden />
                      Set primary
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openPanel({ kind: 'edit', image })}
                    className="inline-flex min-h-9 items-center gap-1.5 text-[12px] font-medium text-graphite transition-colors hover:text-ink"
                  >
                    <Pencil size={13} strokeWidth={1.7} aria-hidden />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void requestDelete(image)}
                    disabled={image.isPrimary}
                    title={
                      image.isPrimary
                        ? 'Promote another image to primary before deleting this one.'
                        : undefined
                    }
                    className="ml-auto inline-flex min-h-9 items-center gap-1.5 text-[12px] font-medium text-graphite transition-colors hover:text-signal disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 size={13} strokeWidth={1.7} aria-hidden />
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {panel?.kind === 'upload' && (
        <ImageUploadModal
          defaultPrimary={defaultPrimary}
          isSaving={uploadMutation.isPending}
          serverError={uploadMutation.error}
          onClose={() => setPanel(null)}
          onSubmit={(values) => uploadMutation.run(values)}
        />
      )}

      {panel?.kind === 'url' && (
        <ImageMetadataModal
          image={undefined}
          defaultPrimary={defaultPrimary}
          isSaving={createMutation.isPending}
          serverError={createMutation.error}
          onClose={() => setPanel(null)}
          onSubmit={(values) => createMutation.run(values)}
        />
      )}

      {panel?.kind === 'edit' && (
        <ImageMetadataModal
          image={panel.image}
          defaultPrimary={defaultPrimary}
          isSaving={updateMutation.isPending}
          serverError={updateMutation.error}
          onClose={() => setPanel(null)}
          onSubmit={(values) => updateMutation.run({ image: panel.image, values })}
        />
      )}

    </Panel>
  )
}
