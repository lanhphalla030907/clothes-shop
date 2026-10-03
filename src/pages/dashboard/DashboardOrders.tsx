import { useMemo, useState } from 'react'
import { Download, Plus } from 'lucide-react'
import { Panel, Section } from '@/components/dashboard/Panel'
import { Badge, StatGrid } from '@/components/dashboard/Badge'
import { DataTable, TableFooter, type Column } from '@/components/dashboard/DataTable'
import { Button, ChipRow, SearchField, StatRow } from '@/components/dashboard/Controls'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { Reveal } from '@/components/ui/Reveal'
import {
  fulfilmentTone,
  formatDay,
  formatDayLong,
  orderStatusTone,
  orderStatuses,
  orderSummary,
  orders,
  TODAY,
} from '@/data/dashboard'
import type { DashboardOrder, OrderStatus } from '@/data/dashboard'
import { formatPrice } from '@/lib/format'

type StatusFilter = OrderStatus | 'All'

const FILTERS: { value: StatusFilter; label: string; count?: number }[] = [
  { value: 'All', label: 'All orders' },
  ...orderStatuses.map((status) => ({ value: status, label: status })),
]

export default function DashboardOrders() {
  const [status, setStatus] = useState<StatusFilter>('All')
  const [query, setQuery] = useState('')

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return orders.filter((order) => {
      if (status !== 'All' && order.status !== status) return false
      if (!needle) return true
      return (
        order.id.toLowerCase().includes(needle) ||
        order.customer.toLowerCase().includes(needle) ||
        order.email.toLowerCase().includes(needle) ||
        order.region.toLowerCase().includes(needle)
      )
    })
  }, [status, query])

  const revenueShown = rows.reduce((sum, order) => sum + order.total, 0)

  const filters = FILTERS.map((filter) => ({
    ...filter,
    count:
      filter.value === 'All'
        ? orders.length
        : orders.filter((order) => order.status === filter.value).length,
  }))

  const columns: Column<DashboardOrder>[] = [
    {
      key: 'id',
      header: 'Order',
      width: 'w-36',
      render: (row) => <span className="font-mono text-[13px] tracking-[0.06em]">{row.id}</span>,
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium">{row.customer}</p>
          <p className="mt-0.5 truncate text-xs text-graphite">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'region',
      header: 'Region',
      width: 'w-40',
      secondary: true,
      render: (row) => <span className="text-[13px] text-graphite">{row.region}</span>,
    },
    {
      key: 'items',
      header: 'Items',
      align: 'right',
      width: 'w-20',
      mono: true,
      secondary: true,
      render: (row) => row.items,
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      width: 'w-28',
      mono: true,
      render: (row) => formatPrice(row.total),
    },
    {
      key: 'status',
      header: 'Status',
      width: 'w-32',
      render: (row) => (
        <Badge tone={orderStatusTone[row.status]} dot>
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'fulfilment',
      header: 'Fulfilment',
      width: 'w-32',
      secondary: true,
      render: (row) => <Badge tone={fulfilmentTone[row.fulfilment]}>{row.fulfilment}</Badge>,
    },
    {
      key: 'date',
      header: 'Placed',
      align: 'right',
      width: 'w-28',
      mono: true,
      secondary: true,
      render: (row) => formatDay(row.date),
    },
  ]

  const tiles = [
    {
      label: 'Orders',
      value: '312',
      delta: 9.7,
      favourable: true,
      footnote: 'vs. 284 last period',
      spark: [18, 21, 19, 24, 22, 26, 23, 28, 25, 31, 27, 33, 29, 36],
    },
    {
      label: 'Revenue',
      value: formatPrice(118460),
      delta: 18.4,
      favourable: true,
      footnote: 'vs. $100,040',
      spark: [98, 104, 96, 112, 108, 121, 118, 132, 128, 141, 136, 152, 148, 163],
    },
    {
      label: 'Average order',
      value: formatPrice(orderSummary.averageOrderValue),
      delta: 4.1,
      favourable: true,
      footnote: 'vs. $352',
      spark: [344, 351, 348, 356, 349, 361, 358, 366, 362, 371, 368, 376, 373, 380],
    },
    {
      label: 'Open issues',
      value: String(orderSummary.awaitingFulfilment + orderSummary.returnsOpen).padStart(2, '0'),
      footnote: `${orderSummary.awaitingFulfilment} to fulfil · ${orderSummary.returnsOpen} returns`,
    },
  ]

  const channels = [
    { label: 'Online store', share: 68, revenue: 80552 },
    { label: 'Instagram', share: 19, revenue: 22507 },
    { label: 'Retail partners', share: 9, revenue: 10661 },
    { label: 'Other', share: 4, revenue: 4738 },
  ]

  return (
    <div className="flex flex-col gap-8">
      <Reveal>
        <PageHeader
          kicker="Fulfilment"
          title="Orders"
          lede="Every order in the queue, filterable by state. Search runs in the browser."
          actions={
            <>
              <Button variant="secondary">
                <Download size={14} strokeWidth={1.6} />
                Export
              </Button>
              <Button variant="primary">
                <Plus size={14} strokeWidth={1.6} />
                New order
              </Button>
            </>
          }
          facts={[
            { label: 'Awaiting fulfilment', value: String(orderSummary.awaitingFulfilment) },
            { label: 'Awaiting payment', value: String(orderSummary.awaitingPayment) },
            { label: 'Snapshot', value: formatDayLong(TODAY) },
          ]}
        />
      </Reveal>

      <Reveal>
        <StatGrid metrics={tiles} />
      </Reveal>

      <Reveal>
        <Section
          title={rows.length === orders.length ? 'All orders' : `${rows.length} matching orders`}
          action={
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder="Search order, customer, region"
              className="w-full sm:w-72"
            />
          }
        >
          {/* Filters and search sit above the table, not buried in its header, so
              the two controls that change the result are in the same place. */}
          <div className="mb-4">
            <ChipRow
              ariaLabel="Filter by status"
              value={status}
              onChange={setStatus}
              options={filters}
              counts
            />
          </div>

          <Panel flush>
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(row) => row.id}
              empty="No orders match this filter. Clear the search or pick a different status."
              footer={
                <TableFooter
                  left={`Showing ${rows.length} of ${orders.length}`}
                  right={`${formatPrice(revenueShown)} subtotal`}
                />
              }
              mobile={{
                primary: (row) => `${row.id} · ${row.customer}`,
                secondary: (row) => `${row.region} · ${formatDay(row.date)}`,
                trailing: (row) => (
                  <span className="font-mono text-[13px] tabular-nums">{formatPrice(row.total)}</span>
                ),
                tags: (row) => (
                  <>
                    <Badge tone={orderStatusTone[row.status]} dot>
                      {row.status}
                    </Badge>
                    <Badge tone={fulfilmentTone[row.fulfilment]}>{row.fulfilment}</Badge>
                  </>
                ),
              }}
            />
          </Panel>
        </Section>
      </Reveal>

      <Reveal>
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Channel mix" meta="Share of revenue">
            <ul className="divide-y divide-line-soft">
              {channels.map((channel) => (
                <li key={channel.label}>
                  <StatRow
                    label={channel.label}
                    value={`${channel.share}% · ${formatPrice(channel.revenue)}`}
                    meter={channel.share}
                  />
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Largest orders" meta="By value in this view">
            <ul className="divide-y divide-line-soft">
              {[...orders]
                .sort((a, b) => b.total - a.total)
                .slice(0, 6)
                .map((order) => (
                  <li key={order.id}>
                    <StatRow
                      label={`${order.id} · ${order.customer}`}
                      value={formatPrice(order.total)}
                      hint={`${order.region} · ${order.items} items`}
                    />
                  </li>
                ))}
            </ul>
          </Panel>
        </div>
      </Reveal>

      <p className="text-xs leading-relaxed text-ash">
        Static prototype — 14 representative orders out of 312. Filters and search narrow this
        local set only.
      </p>
    </div>
  )
}
