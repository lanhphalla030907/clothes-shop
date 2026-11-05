import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Action } from '@/components/ui/Action'
import { SmartImage } from '@/components/ui/SmartImage'
import { ProductGrid } from '@/components/product/ProductGrid'
import { ProductGridSkeleton, ProductNotice } from '@/components/product/ProductStates'
import { useCategories } from '@/features/catalogue/useCatalogue'
import { fetchImagesForProducts } from '@/features/catalogue/api'
import { toPieces } from '@/features/catalogue/present'
import { useCollectionDetail } from '@/features/collections/useCollections'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { toUserMessage } from '@/lib/api/errors'
import type { CataloguePiece } from '@/types'

export default function CollectionDetails() {
  const { slug } = useParams()
  const [page, setPage] = useState(1)
  const detail = useCollectionDetail(slug, page)
  const categories = useCategories()
  const pieces = useAsyncResource<CataloguePiece[] | undefined>(async (signal) => {
    const products = detail.data?.products
    if (!products || !categories.data) return undefined
    const images = await fetchImagesForProducts(products, signal)
    return toPieces(products, categories.data, images)
  }, [detail.data?.collection.id, page, categories.data])

  if (detail.error !== undefined) {
    return <ProductNotice eyebrow="Collections" title="Collection unavailable" message={toUserMessage(detail.error)} action={<Action to="/shop" size="sm">Browse the shop</Action>} />
  }

  if (detail.isLoading || !detail.data) return <div className="container-editorial pt-32 pb-24"><ProductGridSkeleton /></div>

  const { collection, pagination } = detail.data
  return (
    <>
      <header className="container-editorial pt-24 pb-12 sm:pt-32 sm:pb-16">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="overflow-hidden bg-bone lg:col-span-7"><SmartImage src={collection.coverImage} alt={collection.title} className="aspect-[16/9]" priority /></div>
          <div className="lg:col-span-5 lg:pb-2">
            <span className="label-micro text-graphite">Curated collection</span>
            <h1 className="type-display mt-5 text-[15vw] leading-[0.83] sm:text-[5.5rem]">{collection.title}</h1>
            {collection.description && <p className="mt-6 max-w-md text-sm leading-[1.8] text-graphite sm:text-[15px]">{collection.description}</p>}
            <p className="mt-6 font-mono text-[11px] tracking-[0.14em] text-graphite uppercase">{pagination?.total ?? collection.productCount ?? 0} pieces</p>
          </div>
        </div>
      </header>

      {(pieces.isLoading || categories.isLoading) && <div className="container-editorial"><ProductGridSkeleton /></div>}
      {pieces.error !== undefined && <ProductNotice eyebrow={collection.title} title="Products unavailable" message={toUserMessage(pieces.error)} />}
      {!pieces.isLoading && pieces.error === undefined && !categories.isLoading && (pieces.data?.length ?? 0) === 0 && <ProductNotice eyebrow={collection.title} title="Nothing here yet" message="This collection does not have any published pieces at the moment." />}
      {!pieces.isLoading && pieces.error === undefined && !categories.isLoading && (pieces.data?.length ?? 0) > 0 && <ProductGrid pieces={pieces.data ?? []} categories={[]} columns={3} />}

      {pagination && pagination.totalPages > 1 && (
        <nav className="container-editorial flex items-center justify-between py-14" aria-label="Collection pages">
          <Action variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Action>
          <span className="font-mono text-[11px] tracking-[0.12em] text-graphite uppercase">Page {page} of {pagination.totalPages}</span>
          <Action variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)}>Next</Action>
        </nav>
      )}
    </>
  )
}
