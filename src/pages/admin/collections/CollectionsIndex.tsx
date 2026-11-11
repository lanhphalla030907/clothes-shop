import { useState } from 'react'
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { EmptyState, ErrorState, InlineNotice } from '@/components/account/States'
import { Action } from '@/components/ui/Action'
import { Modal } from '@/components/account/Modal'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { useMutation } from '@/hooks/useMutation'
import { useFeedback } from '@/context/feedbackContext'
import { fetchAdminProducts } from '@/features/adminProducts/api'
import { createAdminCollection, deleteAdminCollection, fetchAdminCollection, fetchAdminCollections, replaceAdminCollectionImage, updateAdminCollection, updateAdminCollectionStatus } from '@/features/adminCollections/api'
import { toUserMessage } from '@/lib/api/errors'
import type { Collection, Product, UUID } from '@/types/api'

type Editor = { collection?: Collection; productIds: UUID[] } | null

export default function CollectionsIndex() {
  const collections = useAsyncResource((signal) => fetchAdminCollections(signal), [])
  const products = useAsyncResource((signal) => fetchAdminProducts({}, signal), [])
  const { showFeedback, confirmFeedback } = useFeedback()
  const [editor, setEditor] = useState<Editor>(null)

  const refresh = () => void collections.refetch()
  const save = useMutation(async (input: { id?: UUID; title: string; description: string; displayOrder: number; productIds: UUID[]; file: File | null }) => {
    if (!input.id) {
      const file = input.file
      if (!file) throw new Error('Choose a cover image before saving the collection.')
      return createAdminCollection({ title: input.title, description: input.description, displayOrder: input.displayOrder, productIds: input.productIds, file })
    }
    const collection = await updateAdminCollection(input.id, { title: input.title, description: input.description, displayOrder: input.displayOrder, productIds: input.productIds })
    return input.file ? replaceAdminCollectionImage(input.id, input.file) : collection
  }, {
    onSuccess: () => { refresh(); setEditor(null); showFeedback({ type: 'success', title: 'Collection saved', message: 'The collection and its selected products are up to date.' }) },
  })
  const status = useMutation((collection: Collection) => updateAdminCollectionStatus(collection.id, !collection.isActive), {
    onSuccess: (collection) => { refresh(); showFeedback({ type: 'success', title: collection.isActive ? 'Collection activated' : 'Collection paused', message: collection.isActive ? 'It can now appear on the storefront.' : 'It is hidden from public collection pages.' }) },
  })
  const remove = useMutation(deleteAdminCollection, {
    onSuccess: () => { refresh(); showFeedback({ type: 'success', title: 'Collection deleted', message: 'Products were left untouched.' }) },
  })

  const openEdit = async (collection: Collection) => {
    try {
      const detail = await fetchAdminCollection(collection.id)
      setEditor({ collection, productIds: detail.products.map((product) => product.id) })
    } catch (error) {
      showFeedback({ type: 'error', title: 'Collection could not be opened', message: toUserMessage(error) })
    }
  }

  const requestDelete = async (collection: Collection) => {
    if (await confirmFeedback({ title: `Delete ${collection.title}?`, message: 'This removes the collection only. Its products remain in the catalogue.', confirmLabel: 'Delete collection' })) void remove.run(collection.id)
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader eyebrow="Storefront" title="Collections" description="Curated product edits displayed on the homepage and their own public pages." action={<Action size="sm" onClick={() => setEditor({ productIds: [] })}><Plus size={15} aria-hidden /> New collection</Action>} />
      {Boolean(save.error || status.error || remove.error) && <InlineNotice message={toUserMessage(save.error ?? status.error ?? remove.error)} onDismiss={() => { save.reset(); status.reset(); remove.reset() }} />}
      {collections.isLoading && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <div key={index} className="aspect-[4/3] animate-pulse bg-bone" />)}</div>}
      {collections.error !== undefined && <ErrorState message={toUserMessage(collections.error)} onRetry={collections.refetch} />}
      {!collections.isLoading && collections.error === undefined && (collections.data?.length ?? 0) === 0 && <EmptyState align="left" eyebrow="No collections" title="Start a curated edit" description="Create a collection, add a cover image and choose products for it." action={<Action size="sm" onClick={() => setEditor({ productIds: [] })}>New collection</Action>} />}
      {!collections.isLoading && collections.error === undefined && (collections.data?.length ?? 0) > 0 && <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {collections.data?.map((collection) => <li key={collection.id} className="overflow-hidden rounded-xl border border-line bg-paper-pure shadow-xs transition-shadow hover:shadow-sm">
          <img src={collection.coverImage} alt={collection.title} className="aspect-[16/10] w-full object-cover" />
          <div className="p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="text-[15px] font-semibold text-ink">{collection.title}</h2><p className="mt-1 font-mono text-[11px] text-graphite">Order {collection.displayOrder} · {collection.productCount ?? 0} products</p></div><span className={`rounded-full border px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider ${collection.isActive ? 'border-emerald-200/80 bg-emerald-50 text-emerald-700' : 'border-line bg-bone text-graphite'}`}>{collection.isActive ? 'Active' : 'Paused'}</span></div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-line-soft pt-3 text-[12.5px] text-graphite"><button type="button" onClick={() => void openEdit(collection)} className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 hover:bg-bone hover:text-ink"><Pencil size={13} strokeWidth={1.8} /> Edit</button><button type="button" disabled={status.isPending} onClick={() => void status.run(collection)} className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 hover:bg-bone hover:text-ink disabled:opacity-40">{collection.isActive ? <EyeOff size={13} strokeWidth={1.8} /> : <Eye size={13} strokeWidth={1.8} />}{collection.isActive ? 'Pause' : 'Activate'}</button><button type="button" onClick={() => void requestDelete(collection)} className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md px-2 hover:bg-rose-50 hover:text-signal"><Trash2 size={13} strokeWidth={1.8} /> Delete</button></div></div>
        </li>)}
      </ul>}
      {editor && <CollectionEditor editor={editor} products={products.data ?? []} productsLoading={products.isLoading} pending={save.isPending} error={save.error} onClose={() => setEditor(null)} onSubmit={(input) => void save.run({ id: editor.collection?.id, ...input })} />}
    </div>
  )
}

function CollectionEditor({ editor, products, productsLoading, pending, error, onClose, onSubmit }: { editor: Exclude<Editor, null>; products: Product[]; productsLoading: boolean; pending: boolean; error: unknown; onClose: () => void; onSubmit: (input: { title: string; description: string; displayOrder: number; productIds: UUID[]; file: File | null }) => void }) {
  const collection = editor.collection
  const [title, setTitle] = useState(collection?.title ?? '')
  const [description, setDescription] = useState(collection?.description ?? '')
  const [displayOrder, setDisplayOrder] = useState(String(collection?.displayOrder ?? 0))
  const [selected, setSelected] = useState<UUID[]>(editor.productIds)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState(collection?.coverImage ?? '')
  const [formError, setFormError] = useState<string>()
  const toggle = (id: UUID) => setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id])
  const submit = () => {
    const order = Number(displayOrder)
    if (!title.trim()) return setFormError('A collection title is required.')
    if (!Number.isInteger(order) || order < 0) return setFormError('Display order must be a whole number of zero or more.')
    if (!collection && !file) return setFormError('Choose a cover image.')
    onSubmit({ title: title.trim(), description, displayOrder: order, productIds: selected, file })
  }
  return <Modal title={collection ? `Edit ${collection.title}` : 'New collection'} onClose={onClose} className="w-[min(54rem,calc(100vw-1.5rem))]" footer={<><Action variant="ghost" size="sm" onClick={onClose}>Cancel</Action><Action size="sm" disabled={pending} onClick={submit}>{pending ? 'Saving' : 'Save collection'}</Action></>}>
    <div className="grid gap-6 md:grid-cols-2"><div className="space-y-4"><label className="block text-[12px] font-semibold text-ink">Title<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={255} className="mt-1.5 h-11 w-full border border-line bg-paper px-3 text-sm" /></label><label className="block text-[12px] font-semibold text-ink">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} rows={4} className="mt-1.5 w-full border border-line bg-paper p-3 text-sm" /></label><label className="block text-[12px] font-semibold text-ink">Display order<input type="number" min="0" step="1" value={displayOrder} onChange={(event) => setDisplayOrder(event.target.value)} className="mt-1.5 h-11 w-full border border-line bg-paper px-3 text-sm" /></label><label className="block text-[12px] font-semibold text-ink">{collection ? 'Replace cover image (optional)' : 'Cover image'}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" onChange={(event) => { const next = event.target.files?.[0] ?? null; setFile(next); if (next) setPreview(URL.createObjectURL(next)) }} className="mt-1.5 block w-full text-xs" /></label>{preview && <img src={preview} alt="Collection cover preview" className="aspect-[16/9] w-full object-cover" />}</div>
    <div><p className="text-[12px] font-semibold text-ink">Assigned products</p><p className="mt-1 text-[12px] text-graphite">Select any existing products. Paused or draft products will remain hidden publicly.</p><div className="mt-3 max-h-96 divide-y divide-line overflow-y-auto border border-line">{productsLoading ? <p className="p-4 text-sm text-graphite">Loading products…</p> : products.map((product) => <label key={product.id} className="flex cursor-pointer items-center gap-3 p-3 text-sm hover:bg-bone"><input type="checkbox" checked={selected.includes(product.id)} onChange={() => toggle(product.id)} /><span className="min-w-0 flex-1 truncate text-ink">{product.name}</span><span className="font-mono text-[10px] text-ash">{product.status}</span></label>)}</div></div></div>
    {Boolean(formError || error) && <p role="alert" className="mt-5 text-sm text-signal">{formError ?? toUserMessage(error)}</p>}
  </Modal>
}
