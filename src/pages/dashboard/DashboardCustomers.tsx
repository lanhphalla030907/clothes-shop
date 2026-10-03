import { useMemo, useState } from 'react'
import { Download, Mail, Plus } from 'lucide-react'
import { Panel, Section } from '@/components/dashboard/Panel'
import { Badge, StatGrid } from '@/components/dashboard/Badge'
import { DataTable, TableFooter, type Column } from '@/components/dashboard/DataTable'
import { Button, ChipRow, RankedList, SearchField, StatRow } from '@/components/dashboard/Controls'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { Reveal } from '@/components/ui/Reveal'
import {
  cohort,
  customerSummary,
  customers,
  formatDayLong,
  regions,
  segmentTone,
  TODAY,
} from '@/data/dashboard'
import type { Customer } from '@/data/dashboard'
import { formatPrice } from '@/lib/format'

type SegmentFilter = Customer['segment'] | 'All'

const SEGMENTS: SegmentFilter[] = ['All', 'VIP', 'Returning', 'New', 'At risk']

/** Beyond this many days without an order, an account is drifting. */
const DRIFT_DAYS = 45

/** Shown as a badge when we don't already say it in a column. */
const segmentLabel: Record<Customer['segment'], string> = {
  VIP: 'VIP',
  Returning: 'Returning',
  New: 'New',
  'At risk': 'At risk',
}

export default function DashboardCustomers() {
  const [segment, setSegment] = useState<SegmentFilter>('All')
  const [query, setQuery] = useState('')

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return customers.filter((customer) => {
      if (segment !== 'All' && customer.segment !== segment) return false
      if (!needle) return true
      return (
        customer.name.toLowerCase().includes(needle) ||
        customer.email.toLowerCase().includes(needle) ||
        customer.region.toLowerCase().includes(needle) ||
        customer.id.includes(needle)
      )
    })
  }, [segment, query])

  const filters = SEGMENTS.map((value) => ({
    value,
    label: value === 'All' ? 'All customers' : segmentLabel[value],
    count:
      value === 'All' ? customers.length : customers.filter((c) => c.segment === value).length,
  }))

  const columns: Column<Customer>[] = [
    {
      key: 'name',
      header: 'Customer',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium">{row.name}</p>
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
      key: 'orders',
      header: 'Orders',
      align: 'right',
      width: 'w-20',
      mono: true,
      render: (row) => row.orders,
    },
    {
      key: 'spend',
      header: 'Lifetime spend',
      align: 'right',
      width: 'w-32',
      mono: true,
      render: (row) => formatPrice(row.spend),
    },
    {
      key: 'lastOrder',
      header: 'Last order',
      align: 'right',
      width: 'w-28',
      mono: true,
      render: (row) => (row.lastOrderDays === 0 ? 'Today' : `${row.lastOrderDays}d ago`),
    },
    {
      key: 'segment',
      header: 'Segment',
      width: 'w-32',
      render: (row) => <Badge tone={segmentTone[row.segment]}>{segmentLabel[row.segment]}</Badge>,
    },
    {
      key: 'contact',
      header: '',
      align: 'right',
      width: 'w-16',
      render: (row) => (
        <a
          href={`mailto:${row.email}`}
          aria-label={`Email ${row.name}`}
          className="grid size-10 place-items-center text-graphite transition-colors duration-200 hover:bg-bone hover:text-ink"
        >
          <Mail size={15} strokeWidth={1.5} />
        </a>
      ),
    },
  ]

  const tiles = [
    {
      label: 'Total customers',
      value: customerSummary.total.toLocaleString('en-US'),
      delta: 8.1,
      favourable: true,
      footnote: `${customerSummary.newThisMonth} joined this month`,
    },
    {
      label: 'Returning rate',
      value: `${Math.round(customerSummary.returningRate * 100)}%`,
      delta: 3.4,
      favourable: true,
      footnote: 'vs. 35% last period',
    },
    {
      label: 'Lifetime value',
      value: formatPrice(customerSummary.lifetimeValue),
      footnote: 'average across all accounts',
    },
    {
      label: 'Drifting',
      value: String(customers.filter((c) => c.lastOrderDays > DRIFT_DAYS).length).padStart(2, '0'),
      footnote: `no order in ${DRIFT_DAYS}+ days`,
    },
  ]

  const totalNew = cohort.reduce((sum, row) => sum + row.newCustomers, 0)
  const maxCohort = Math.max(...cohort.map((row) => row.newCustomers + row.returning))
  const topAccounts = [...customers].sort((a, b) => b.spend - a.spend).slice(0, 6)

  return (
    <div className="flex flex-col gap-8">
      <Reveal>
        <PageHeader
          kicker="Audience"
          title="Customers"
          lede="Who is buying, how often, and who has gone quiet. One filter, one search, one table."
          actions={
            <>
              <Button variant="secondary">
                <Download size={14} strokeWidth={1.6} />
                Export
              </Button>
              <Button variant="primary">
                <Plus size={14} strokeWidth={1.6} />
                Add customer
              </Button>
            </>
          }
          facts={[
            { label: 'Snapshot', value: formatDayLong(TODAY) },
            { label: 'New this month', value: String(customerSummary.newThisMonth) },
            { label: 'Returning', value: `${Math.round(customerSummary.returningRate * 100)}%` },
          ]}
        />
      </Reveal>

      <Reveal>
        <StatGrid metrics={tiles} />
      </Reveal>

      <Reveal>
        <Section
          title={
            rows.length === customers.length ? 'All customers' : `${rows.length} matching customers`
          }
          action={
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder="Search name, email, region"
              className="w-full sm:w-72"
            />
          }
        >
          <div className="mb-4">
            <ChipRow
              ariaLabel="Filter by segment"
              value={segment}
              onChange={setSegment}
              options={filters}
              counts
            />
          </div>

          <Panel flush>
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(row) => row.id}
              empty="No customers match this filter. Clear the search or pick another segment."
              footer={
                <TableFooter
                  left={`Showing ${rows.length} of ${customers.length} in this prototype`}
                  right={`${formatPrice(rows.reduce((sum, c) => sum + c.spend, 0))} lifetime spend`}
                />
              }
              mobile={{
                primary: (row) => row.name,
                secondary: (row) => `${row.email} · ${row.region}`,
                trailing: (row) => (
                  <span className="font-mono text-[13px] tabular-nums">{formatPrice(row.spend)}</span>
                ),
                tags: (row) => (
                  <>
                    <Badge tone={segmentTone[row.segment]}>{segmentLabel[row.segment]}</Badge>
                    <Badge tone="muted">
                      {row.lastOrderDays === 0 ? 'Ordered today' : `${row.lastOrderDays}d since`}
                    </Badge>
                  </>
                ),
              }}
            />
          </Panel>
        </Section>
      </Reveal>

      <Reveal>
        <div className="grid gap-5 lg:grid-cols-12">
          <Panel title="Top markets" meta="By lifetime revenue" className="lg:col-span-7">
            <ul className="divide-y divide-line-soft">
              {regions.map((region) => (
                <li key={region.country}>
                  <StatRow
                    label={region.country}
                    value={`${region.customers.toLocaleString('en-US')} · ${formatPrice(region.revenue)}`}
                    meter={region.revenue}
                    meterMax={regions[0].revenue}
                  />
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Highest value" meta="Lifetime spend" className="lg:col-span-5">
            <RankedList
              rows={topAccounts.map((customer) => ({
                id: customer.id,
                label: customer.name,
                meta: `${customer.orders} orders · ${customer.region}`,
                value: formatPrice(customer.spend),
                share: Math.round((customer.spend / topAccounts[0].spend) * 100),
              }))}
            />
          </Panel>
        </div>
      </Reveal>

      <Reveal>
        <Section title="New versus returning" meta="Eight months to date">
          <Panel flush>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse">
                <thead>
                  <tr className="border-b border-line">
                    <th
                      scope="col"
                      className="px-5 py-3 text-left text-[13px] font-semibold text-graphite"
                    >
                      Month
                    </th>
                    {['New', 'Returning', 'Total', 'Returning share'].map((heading) => (
                      <th
                        key={heading}
                        scope="col"
                        className="px-5 py-3 text-right text-[13px] font-semibold text-graphite"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cohort.map((row) => {
                    const total = row.newCustomers + row.returning
                    return (
                      <tr key={row.month} className="border-b border-line-soft last:border-0">
                        <th scope="row" className="px-5 py-3.5 text-left text-[13px] font-medium">
                          {row.month}
                        </th>
                        <td className="px-5 py-3.5 text-right font-mono text-[13px] tabular-nums">
                          {row.newCustomers}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-[13px] tabular-nums">
                          {row.returning}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-[13px] tabular-nums">
                          {total}
                        </td>
                        <td className="w-1/3 px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="h-1.5 flex-1 bg-bone">
                              <div
                                className="h-full bg-ink"
                                style={{ width: `${(total / maxCohort) * 100}%` }}
                              />
                            </div>
                            <span className="w-9 shrink-0 text-right font-mono text-[13px] tabular-nums text-graphite">
                              {Math.round((row.returning / total) * 100)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <th
                      scope="row"
                      className="border-t border-line px-5 py-3.5 text-left text-[13px] font-semibold"
                    >
                      Total
                    </th>
                    <td className="border-t border-line px-5 py-3.5 text-right font-mono text-[13px] font-semibold tabular-nums">
                      {totalNew}
                    </td>
                    <td className="border-t border-line px-5 py-3.5 text-right font-mono text-[13px] font-semibold tabular-nums">
                      {cohort.reduce((sum, row) => sum + row.returning, 0)}
                    </td>
                    <td className="border-t border-line px-5 py-3.5" />
                    <td className="border-t border-line px-5 py-3.5" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </Panel>
        </Section>
      </Reveal>
    </div>
  )
}