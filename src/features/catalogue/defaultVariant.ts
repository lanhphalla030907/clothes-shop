import { loadVariantsOnce } from './api'
import type { UUID } from '@/types/api'

/** What quick add bought, and what to call it on the button. */
export interface QuickAddTarget {
  id: UUID
  /** The variant's own SKU — the one identifier the shopper can quote. */
  label: string
}

/**
 * The variant a quick add buys: the cheapest active one.
 *
 * `undefined` means the product has nothing sellable, which is the collection's
 * way of saying the quick-add bar must not be offered at all.
 *
 * Stock is deliberately not part of this decision. The variants endpoint carries
 * none, so deciding here would mean guessing; the cart endpoint is the authority
 * and rejects what it cannot sell. The cheapest *active* variant is therefore the
 * honest default: the same figure the card's price shows.
 */
export const defaultVariantFor = async (productId: UUID): Promise<QuickAddTarget | undefined> => {
  const variants = await loadVariantsOnce(productId)

  const cheapest = variants
    .filter((variant) => variant.isActive)
    .sort((a, b) => Number(a.price) - Number(b.price) || a.sku.localeCompare(b.sku))[0]

  return cheapest ? { id: cheapest.id, label: cheapest.sku } : undefined
}