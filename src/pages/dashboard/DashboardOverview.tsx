import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Panel, Section } from '@/components/dashboard/Panel'
import { Badge, StatGrid } from '@/components/dashboard/Badge'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { DataTable, TableFooter, type Column } from '@/components/dashboard/DataTable'
import { Button, ChipRow, Meter, RankedList } from '@/components/dashboard/Controls'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { Reveal } from '@/components/ui/Reveal'
import {
  activity,
  formatDay,
  formatDayLong,
  fulfilmentTone,
  inventory,
  kpiTiles,
  orderStatusTone,
  orders,
  revenueSeries,
  TODAY,
  topProducts,
} from '@/data/dashboard'
import type { DashboardOrder } from '@/data/dashboard'
import { formatPrice } from '@/lib/format'

type Range = '7d' | '14d' | '30d'

const RANGES: { value: Range; label: string }[] = [
  { value: '7d', label: '7 days' },
  { value: '14d', label: '14 days' },
  { value: '30d', label: '30 days' },
]

export default function DashboardOverview() {
  const [range, setRange] = useState<Range>('30d')

  const series = useMemo(
    () => revenueSeries.slice(range === '30d' ? 0 : range === '14d' ? -14 : -7),
    [range],
  )

  const periodRevenue = series.reduce((sum, point) => sum + point.revenue, 0)

  /** Everything on this list is a thing a human has to go and fix. */
  const attention = useMemo(
    () => [
      ...inventory
        .filter((row) => row.onHand === 0)
        .map((row) => ({
          id: `stock-${row.id}`,
          title: row.name,
          detail: 'Sold out — 0 on hand',
          to: '/dashboard/products',
          urgent: true,
        })),
      ...inventory
        .filter((row) => row.onHand > 0 && row.onHand <= 24)
        .map((row) => ({
          id: `low-${row.id}`,
          title: row.name,
          detail: `Low stock — ${row.onHand} left`,
          to: '/dashboard/products',
          urgent: false,
        })),
      ...orders
        .filter((order) => order.status === 'Failed')
        .map((order) => ({
          id: `order-${order.id}`,
          title: order.id,
          detail: `Payment failed — ${order.customer}`,
          to: '/dashboard/orders',
          urgent: true,
        })),
      ...orders
        .filter((order) => order.status === 'Refunded')
        .map((order) => ({
          id: `refund-${order.id}`,
          title: order.id,
          detail: `Refund issued — ${formatPrice(order.total)}`,
          to: '/dashboard/orders',
          urgent: false,
        })),
    ],
    [],
  )

  const columns: Column<DashboardOrder>[] = [
    {
      key: 'id',
      header: 'Order',
      width: 'w-36',
      render: (row) => (
        <span className="font-mono text-[13px] tracking-[0.06em]">{row.id}</span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium">{row.customer}</p>
          <p className="mt-0.5 truncate text-xs text-graphite">{row.region}</p>
        </div>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      width: 'w-24',
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

  const peak = Math.max(...series.map((point) => point.revenue))

  return (
    <div className="flex flex-col gap-8">
      <Reveal>
        <PageHeader
          kicker="Overview"
          title="Store"
          lede="How Release 01 is trading, and the few things that need a decision today."
          actions={
            <Button onClick={() => undefined} variant="secondary">
              <Plus size={14} strokeWidth={1.6} />
              New order
            </Button>
          }
          facts={[
            { label: 'Period', value: '01 Sep — 01 Oct 2026' },
            { label: 'Revenue', value: formatPrice(periodRevenue) },
            { label: 'Peak day', value: formatPrice(peak) },
          ]}
        />
      </Reveal>

      <Reveal>
        <StatGrid metrics={kpiTiles} />
      </Reveal>

      <Reveal>
        <div className="grid gap-5 lg:grid-cols-12">
          <Panel
            title="Revenue"
            meta={`${series.length}-day total ${formatPrice(periodRevenue)}`}
            className="lg:col-span-8"
            action={
              <ChipRow
                ariaLabel="Time range"
                value={range}
                onChange={setRange}
                options={RANGES}
              />
            }
          >
            <RevenueChart series={series} />
          </Panel>

          <Panel
            title="Needs attention"
            meta={`${attention.length} items`}
            className="lg:col-span-4"
            action={
              <span
                aria-hidden
                className={`grid size-8 place-items-center ${
                  attention.some((item) => item.urgent) ? 'bg-signal-soft text-signal' : 'text-ash'
                }`}
              >
                <AlertTriangle size={15} strokeWidth={1.5} />
              </span>
            }
          >
            {attention.length === 0 ? (
              <p className="text-[13px] text-graphite">Nothing outstanding. All clear.</p>
            ) : (
              <ul className="divide-y divide-line-soft">
                {attention.slice(0, 6).map((item) => (
                  <li key={item.id}>
                    <Link
                      to={item.to}
                      className="group flex items-center gap-3 py-3 transition-colors duration-200 hover:text-ink"
                    >
                      <span
                        aria-hidden
                        className={`size-1.5 shrink-0 ${item.urgent ? 'bg-signal' : 'bg-ash'}`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium">{item.title}</span>
                        <span className="mt-0.5 block truncate text-xs text-graphite">
                          {item.detail}
                        </span>
                      </span>
                      <ArrowRight
                        size={14}
                        strokeWidth={1.5}
                        aria-hidden
                        className="shrink-0 text-ash transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-ink"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </Reveal>

      <Reveal>
        <Section
          title="Recent orders"
          action={
            <Link
              to="/dashboard/orders"
              className="inline-flex items-center gap-2 text-[13px] text-graphite transition-colors duration-200 hover:text-ink"
            >
              All orders
              <ArrowRight size={14} strokeWidth={1.5} />
            </Link>
          }
        >
          <Panel flush>
            <DataTable
              columns={columns}
              rows={orders.slice(0, 8)}
              rowKey={(row) => row.id}
              footer={
                <TableFooter
                  left={`Showing 8 of 312 orders`}
                  right={formatPrice(orders.slice(0, 8).reduce((sum, order) => sum + order.total, 0))}
                />
              }
              mobile={{
                primary: (row) => row.id,
                secondary: (row) => `${row.customer} · ${row.region}`,
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
          <Panel title="Top sellers" meta="Last 30 days">
            <RankedList
              rows={topProducts.slice(0, 5).map((product) => ({
                id: product.name,
                label: product.name,
                meta: `${product.units} units`,
                value: formatPrice(product.revenue),
                share: product.share,
              }))}
            />
          </Panel>

          <Panel title="Activity" meta="Today">
            <ul className="divide-y divide-line-soft">
              {activity.slice(0, 6).map((item) => (
                <li key={item.id} className="flex items-baseline gap-4 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium">{item.title}</span>
                    <span className="mt-0.5 block text-xs text-graphite">{item.detail}</span>
                  </span>
                  <span className="shrink-0 text-xs whitespace-nowrap text-ash">{item.at}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </Reveal>

      <div className="grid gap-5 lg:grid-cols-12">
        <Panel title="Revenue by channel" className="lg:col-span-6" meta="Share of sessions">
          <ul className="divide-y divide-line-soft">
            {[
              { label: 'Direct', share: 42, sessions: 18420 },
              { label: 'Organic search', share: 27, sessions: 11850 },
              { label: 'Instagram', share: 18, sessions: 7890 },
              { label: 'Referral', share: 8, sessions: 3510 },
              { label: 'Email', share: 5, sessions: 2190 },
            ].map((channel) => (
              <li key={channel.label} className="py-3.5">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-[13px]">{channel.label}</span>
                  <span className="font-mono text-[13px] tabular-nums">
                    {channel.share}% · {channel.sessions.toLocaleString('en-US')}
                  </span>
                </div>
                <Meter value={channel.share} max={100} className="mt-2.5" />
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Fulfilment queue" className="lg:col-span-6" meta="Awaiting action">
          <ul className="divide-y divide-line-soft">
            {[
              { label: 'Awaiting fulfilment', value: 9 },
              { label: 'Ready to ship', value: 4 },
              { label: 'In transit', value: 7 },
              { label: 'Returns open', value: 2 },
            ].map((row) => (
              <li key={row.label} className="flex items-center justify-between gap-4 py-3.5">
                <span className="text-[13px] text-graphite">{row.label}</span>
                <span className="font-mono text-[15px] tabular-nums">
                  {String(row.value).padStart(2, '0')}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <p className="text-xs leading-relaxed text-ash">
        Static prototype — figures are illustrative and frozen at {formatDayLong(TODAY)}. Nothing
        here is fetched or editable.
      </p>
    </div>
  )
}
