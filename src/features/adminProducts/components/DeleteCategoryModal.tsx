import { Action } from '@/components/ui/Action'
import { FormError } from '@/components/account/Field'
import { Modal } from '@/components/account/Modal'
import { toUserMessage } from '@/lib/api/errors'
import type { Category } from '@/types/api'

type DeleteCategoryModalProps = {
  category: Category
  isDeleting: boolean
  error: unknown
  onClose: () => void
  onConfirm: () => Promise<void>
}

/**
 * Confirmation for deleting a leaf category.
 *
 * The server refuses while the category has children or products; that 409 is
 * shown verbatim because the useful next step — move or delete those first — is
 * exactly what the message describes.
 */
export function DeleteCategoryModal({
  category,
  isDeleting,
  error,
  onClose,
  onConfirm,
}: DeleteCategoryModalProps) {
  return (
    <Modal
      title="Delete this category?"
      onClose={onClose}
      footer={
        <>
          <Action variant="ghost" size="sm" onClick={onClose} disabled={isDeleting}>
            Keep it
          </Action>
          <Action variant="warning" size="sm" onClick={() => void onConfirm()} disabled={isDeleting}>
            {isDeleting ? 'Deleting' : 'Delete category'}
          </Action>
        </>
      }
    >
      <div className="space-y-4">
        {error !== undefined && <FormError message={toUserMessage(error)} />}
        <p className="text-sm leading-relaxed text-graphite">
          <span className="text-ink">{category.name}</span> will be removed permanently. The
          server only allows this for a leaf category with no products; if either exists, the
          category is kept and the reason is shown here.
        </p>
      </div>
    </Modal>
  )
}
