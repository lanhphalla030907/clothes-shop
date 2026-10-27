import { Action } from '@/components/ui/Action'
import { FormError } from '@/components/account/Field'
import { Modal } from '@/components/account/Modal'
import { toUserMessage } from '@/lib/api/errors'
import type { Product } from '@/types/api'

/**
 * Confirmation for permanently removing a product.
 *
 * Stays open until the write resolves, so one tap is one request and the pending
 * state is visible. A failure keeps the product listed — the most useful one is
 * the server's 409 ("referenced by a wishlist, a cart or an order; deactivate it
 * instead"), which is shown verbatim rather than translated, because the action
 * that satisfies it (deactivating instead of deleting) is exactly what that
 * sentence says.
 */

type DeleteProductModalProps = {
  product: Product
  isDeleting: boolean
  error: unknown
  onClose: () => void
  onConfirm: () => Promise<void>
}

export function DeleteProductModal({
  product,
  isDeleting,
  error,
  onClose,
  onConfirm,
}: DeleteProductModalProps) {
  return (
    <Modal
      title="Delete this product?"
      onClose={onClose}
      footer={
        <>
          <Action variant="ghost" size="sm" onClick={onClose} disabled={isDeleting}>
            Keep it
          </Action>
          <Action size="sm" onClick={() => void onConfirm()} disabled={isDeleting}>
            {isDeleting ? 'Deleting' : 'Delete product'}
          </Action>
        </>
      }
    >
      <div className="space-y-4">
        {error !== undefined && <FormError message={toUserMessage(error)} />}
        <p className="text-sm leading-relaxed text-graphite">
          <span className="text-ink">{product.name}</span> will be removed permanently, with its images,
          variants and inventory. If the server refuses because a wishlist, cart or order references it, the
          product is kept — switch it off instead.
        </p>
      </div>
    </Modal>
  )
}