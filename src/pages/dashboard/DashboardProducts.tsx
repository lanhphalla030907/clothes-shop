import { useMemo, useState } from 'react'
import { Download, Pencil, Plus } from 'lucide-react'
import { Panel, Section } from '@/components/dashboard/Panel'
import { Badge, StatGrid } from '@/components/dashboard/Badge'
import { DataTable, TableFooter, type Column } from '@/components/dashboard/DataTable'
import { Button, ChipRow, Meter, RankedList, SearchField } from '@/components/dashboard/Controls'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { SmartImage } from '@/components/ui/SmartImage'
import { Reveal } from '@/components/ui/Reveal'
import { fulfilmentTone, inventory, topProducts } from '@/data/dashboard'
import type { InventoryRow } from '@/data/dashboard'
import type { ProductCategory } from '@/types'
import { formatPrice } from '@/lib/format'

const CATEGORIES: ProductCategory[] = ['Tops', 'Bottoms', 'Outerwear', 'Accessories']

type Filter = 'All' | ProductCategory

/** Anything at or under this is a reorder, not a stockout. */
const REORDER_AT = 24

export default function DashboardProducts() {
  const [filter, setFilter] = useState<Filter>('All')
  const [query, setQuery] = useState('')

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return inventory.filter((row) => {
      if (filter !== 'All' && row.category !== filter) return false
      if (!needle) return true
      return row.name.toLowerCase().includes(needle) || row.id.includes(needle)
    })
  }, [filter, query])

  const stockValue = inventory.reduce((sum, row) => sum + row.price * row.onHand, 0)
  const units = inventory.reduce((sum, row) => sum + row.onHand, 0)
  const lowStock = inventory.filter((row) => row.onHand > 0 && row.onHand <= REORDER_AT)
  const soldOut = inventory.filter((row) => row.onHand === 0)

  const filters: { value: Filter; label: string; count?: number }[] = [
    { value: 'All', label: 'All', count: inventory.length },
    ...CATEGORIES.map((category) => ({
      value: category,
      label: category,
      count: inventory.filter((row) => row.category === category).length,
    })),
  ]

  const columns: Column<InventoryRow>[] = [
    {
      key: 'product',
      header: 'Product',
      render: (row) => (
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="w-9 shrink-0 border border-line bg-bone">
            <SmartImage src={row.image} alt={row.name} className="aspect-3/4 w-full" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium">{row.name}</p>
            <p className="mt-0.5 truncate text-xs text-graphite">{row.category}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      align: 'right',
      width: 'w-24',
      mono: true,
      render: (row) => formatPrice(row.price),
    },
    {
      key: 'onHand',
      header: 'On hand',
      align: 'right',
      width: 'w-24',
      mono: true,
      render: (row) => row.onHand,
    },
    {
      key: 'reserved',
      header: 'Reserved',
      align: 'right',
      width: 'w-24',
      mono: true,
      secondary: true,
      render: (row) => row.reserved,
    },
    {
      key: 'sold',
      header: 'Sold 30d',
      align: 'right',
      width: 'w-28',
      mono: true,
      secondary: true,
      render: (row) => row.sold,
    },
    {
      key: 'state',
      header: 'State',
      width: 'w-36',
      render: (row) => (
        <Badge tone={fulfilmentTone[row.state]} dot>
          {row.state}
        </Badge>
      ),
    },
    {
      key: 'edit',
      header: '',
      align: 'right',
      width: 'w-16',
      render: () => (
        <button
          type="button"
          aria-label="Edit product"
          className="grid size-10 place-items-center text-graphite transition-colors duration-200 hover:bg-bone hover:text-ink"
        >
          <Pencil size={15} strokeWidth={1.5} />
        </button>
      ),
    },
  ]

  const tiles = [
    {
      label: 'Active products',
      value: String(inventory.length).padStart(2, '0'),
      footnote: 'across 4 categories',
    },
    {
      label: 'Units on hand',
      value: units.toLocaleString('en-US'),
      delta: -4.2,
      favourable: false,
      footnote: 'vs. last count',
    },
    {
      label: 'Stock value',
      value: formatPrice(stockValue),
      footnote: 'at retail price',
    },
    {
      label: 'Reorder soon',
      value: String(lowStock.length + soldOut.length).padStart(2, '0'),
      footnote: `${lowStock.length} low · ${soldOut.length} sold out`,
    },
  ]

  return (
    <div className="flex flex-col gap-8">
      <Reveal>
        <PageHeader
          kicker="Catalogue"
          title="Products"
          lede="Stock for Release 01. Anything at or below twenty-four units is flagged so a reorder never becomes a stockout."
          actions={
            <>
              <Button variant="secondary">
                <Download size={14} strokeWidth={1.6} />
                Export
              </Button>
              <Button variant="primary">
                <Plus size={14} strokeWidth={1.6} />
                New product
              </Button>
            </>
          }
          facts={[
            { label: 'Release', value: '01 — June 2026' },
            { label: 'Next drop', value: '02 — 15 Oct' },
            { label: 'Reorder', value: String(lowStock.length + soldOut.length) },
          ]}
        />
      </Reveal>

      <Reveal>
        <StatGrid metrics={tiles} />
      </Reveal>

      <Reveal>
        <Section
          title={rows.length === inventory.length ? 'Inventory' : `${rows.length} matching products`}
          action={
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder="Search products"
              className="w-full sm:w-72"
            />
          }
        >
          <div className="mb-4">
            <ChipRow
              ariaLabel="Filter by category"
              value={filter}
              onChange={setFilter}
              options={filters}
              counts
            />
          </div>

          <Panel flush>
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(row) => row.id}
              empty="No products match this filter. Clear the search or pick another category."
              footer={
                <TableFooter
                  left={`Showing ${rows.length} of ${inventory.length} products`}
                  right={`${formatPrice(stockValue)} at retail`}
                />
              }
              mobile={{
                primary: (row) => row.name,
                secondary: (row) =>
                  `${row.category} · ${formatPrice(row.price)} · ${row.onHand} on hand`,
                trailing: (row) => (
                  <span className="font-mono text-[13px] tabular-nums">{row.sold} sold</span>
                ),
                tags: (row) => (
                  <Badge tone={fulfilmentTone[row.state]} dot>
                    {row.state}
                  </Badge>
                ),
              }}
            />
          </Panel>
        </Section>
      </Reveal>

      <Reveal>
        <div className="grid gap-5 lg:grid-cols-12">
          <Panel title="Best sellers" meta="Last 30 days" className="lg:col-span-7">
            <RankedList
              rows={topProducts.slice(0, 5).map((product) => ({
                id: product.name,
                label: product.name,
                meta: `${product.units} units sold`,
                value: formatPrice(product.revenue),
                share: product.share,
              }))}
            />
          </Panel>

          <Panel title="Reorder list" meta={`${lowStock.length + soldOut.length} styles`} className="lg:col-span-5">
            <ul className="divide-y divide-line-soft">
              {[...soldOut, ...lowStock].map((row) => (
                <li key={row.id} className="py-3.5">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="truncate text-[13px] font-medium">{row.name}</span>
                    <span className="shrink-0 font-mono text-[13px] tabular-nums">
                      {row.onHand === 0 ? 'Sold out' : `${row.onHand} left`}
                    </span>
                  </div>
                  <Meter
                    value={row.onHand}
                    max={REORDER_AT * 2}
                    tone={row.onHand === 0 ? 'signal' : 'signal'}
                    className="mt-2.5"
                  />
                </li>
              ))}
              {lowStock.length + soldOut.length === 0 && (
                <li className="py-3.5 text-[13px] text-graphite">Nothing needs reordering.</li>
              )}
            </ul>
          </Panel>
        </div>
      </Reveal>

      <Reveal>
        <Section title="By category" meta="Units on hand and 30-day sell-through">
          <div className="grid gap-px border border-line bg-line sm:grid-cols-2 xl:grid-cols-4">
            {CATEGORIES.map((category) => {
              const group = inventory.filter((row) => row.category === category)
              const onHand = group.reduce((sum, row) => sum + row.onHand, 0)
              const sold = group.reduce((sum, row) => sum + row.sold, 0)
              const revenue = group.reduce((sum, row) => sum + row.price * row.sold, 0)

              return (
                <div key={category} className="bg-paper px-5 py-5">
                  <p className="text-[13px] font-semibold uppercase">{category}</p>
                  <p className="mt-4 font-mono text-[1.4rem] leading-none tabular-nums">
                    {onHand}
                  </p>
                  <p className="mt-2 text-xs text-graphite">
                    on hand · {sold} sold in 30d
                  </p>
                  <Meter value={sold} max={470} className="mt-4" />
                  <p className="mt-2 text-xs text-ash">{formatPrice(revenue)} revenue</p>
                </div>
              )
            })}
          </div>
        </Section>
      </Reveal>
    </div>
  )
}
