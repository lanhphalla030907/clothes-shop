import { useState } from 'react'
import type { FormEvent } from 'react'
import { Action } from '@/components/ui/Action'
import { EmptyState, ErrorState } from '@/components/account/States'
import { Skeleton } from '@/components/account/Skeleton'
import { TextField } from '@/components/account/Field'
import { useAdminProducts } from '@/features/adminProducts/useAdminProducts'
import { toUserMessage } from '@/lib/api/errors'
import type { Product } from '@/types/api'

/**
 * A searchable product picker used by the standalone catalogue pages.
 *
 * It owns its own search term: typing only updates a draft, and the server is
 * asked for matches when the administrator applies the search. Every mutation
 * the pages then run is scoped to the product the administrator picks here, so
 * no image or variant write ever leaves this component without a valid product.
 */

type ProductSelectorProps = {
  onSelect: (product: Product) => void
  placeholder?: string
}

export function ProductSelector({ onSelect, placeholder = 'Search products' }: ProductSelectorProps) {
  const [searchDraft, setSearchDraft] = useState('')
  const [applied, setApplied] = useState<string | undefined>(undefined)
  const products = useAdminProducts({ search: applied })
  const list = products.data ?? []

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setApplied(searchDraft.trim() === '' ? undefined : searchDraft.trim())
  }

  const clear = () => {
    setSearchDraft('')
    setApplied(undefined)
  }

  const select = (product: Product) => {
    setSearchDraft('')
    setApplied(undefined)
    onSelect(product)
  }

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-0">
          <TextField
            name="product-search"
            label="Product"
            placeholder={placeholder}
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            autoComplete="off"
          />
        </div>
        <Action type="submit" size="sm">
          {applied === undefined ? 'Search' : 'Apply'}
        </Action>
        {applied !== undefined && (
          <Action variant="ghost" size="sm" onClick={clear}>
            Clear
          </Action>
        )}
      </form>

      {products.isLoading && (
        <div className="space-y-3 p-5" role="status" aria-busy="true">
          <span className="sr-only">Searching products</span>
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-11 w-full" />
          ))}
        </div>
      )}

      {!products.isLoading && products.error !== undefined && (
        <ErrorState message={toUserMessage(products.error)} onRetry={products.refetch} />
      )}

      {!products.isLoading && products.error === undefined && applied !== undefined && list.length === 0 && (
        <EmptyState
          align="left"
          eyebrow="No matches"
          title="No products match that search"
          description="Try a different search term, or clear the search to see every product."
          action={<Action variant="outline" size="sm" onClick={clear}>Clear search</Action>}
        />
      )}

      {!products.isLoading && products.error === undefined && list.length > 0 && (
        <ul className="divide-y divide-line border border-line bg-paper">
          {list.map((product) => (
            <li key={product.id} className="px-5 py-3">
              <button
                type="button"
                onClick={() => select(product)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-bone/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-ink">{product.name}</p>
                  <span className="mt-0.5 block font-mono text-[11px] text-graphite">/{product.slug}</span>
                </div>
                <span className="ml-auto text-[12px] text-ash">Select</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
