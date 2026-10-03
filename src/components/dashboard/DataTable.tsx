import type { ReactNode } from 'react'

export interface Column<T> {
  key: string
  header: string
  align?: 'left' | 'right'
  /** Tailwind width utility applied to the header and body cells. */
  width?: string
  /** Mono with tabular figures — the default for anything numeric. */
  mono?: boolean
  /** Dropped below `lg` to keep the table from needing sideways scroll. */
  secondary?: boolean
  /** Sticky first column — use for the identifier a reader anchors on. */
  sticky?: boolean
  render: (row: T) => ReactNode
}

/** Below `lg` each row collapses to this instead of scrolling sideways. */
export interface MobileRow<T> {
  primary: (row: T) => ReactNode
  secondary: (row: T) => ReactNode
  /** Right-aligned figure or status. */
  trailing?: (row: T) => ReactNode
  /** Full-width chip row under the meta line, e.g. status + fulfilment. */
  tags?: (row: T) => ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  footer?: ReactNode
  empty?: ReactNode
  /** Supplying this renders a stacked list on small screens. */
  mobile?: MobileRow<T>
}

const alignFor = (align: Column<unknown>['align']) => (align === 'right' ? 'text-right' : 'text-left')

/**
 * The dashboard's table, in two forms from one column spec.
 *
 * On `lg` and up it is a real `<table>` — sticky header semantics for screen
 * readers, hairline rules instead of zebra striping, numeric columns right
 * aligned in tabular mono. Below `lg` the same data renders as a stacked list,
 * because a 900px-wide table forced into a phone viewport is how you make people
 * scroll sideways to find the order number.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  footer,
  empty,
  mobile,
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <div className="px-5 py-16 text-center sm:px-6">
        <p className="text-[13px] font-semibold uppercase">Nothing here</p>
        {empty && <p className="mx-auto mt-2 max-w-xs text-[13px] leading-relaxed text-graphite">{empty}</p>}
      </div>
    )
  }

  return (
    <>
      {/* Desktop / tablet */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-paper">
            <tr className="border-b border-line">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`px-6 py-3.5 font-mono text-[10px] font-normal uppercase leading-none tracking-[0.14em] text-ash ${alignFor(
                    column.align,
                  )} ${column.width ?? ''} ${column.secondary ? 'hidden xl:table-cell' : ''}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                className="border-b border-line-soft transition-colors duration-200 last:border-b-0 hover:bg-bone/50"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-6 py-4 align-middle ${alignFor(column.align)} ${
                      column.mono
                        ? 'font-mono text-[13px] tracking-[0.02em] tabular-nums'
                        : 'text-[13px]'
                    } ${column.width ?? ''} ${column.secondary ? 'hidden xl:table-cell' : ''}`}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      {mobile && (
        <ul className="divide-y divide-line-soft lg:hidden">
          {rows.map((row) => (
            <li key={rowKey(row)} className="px-5 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold tracking-[-0.01em]">
                    {mobile.primary(row)}
                  </div>
                  <div className="mt-1 text-[13px] leading-relaxed text-graphite">
                    {mobile.secondary(row)}
                  </div>
                </div>
                {mobile.trailing && (
                  <div className="shrink-0 text-right">{mobile.trailing(row)}</div>
                )}
              </div>
              {mobile.tags && <div className="mt-3 flex flex-wrap gap-2">{mobile.tags(row)}</div>}
            </li>
          ))}
        </ul>
      )}

      {/* No rule here — TableFooter draws its own. */}
      {footer && <div>{footer}</div>}
    </>
  )
}

/** Totals strip shown beneath a table on every breakpoint. */
export function TableFooter({
  left,
  right,
}: {
  left: ReactNode
  right?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <span className="text-xs text-ash">{left}</span>
      {right && <span className="font-mono text-[13px] tabular-nums">{right}</span>}
    </div>
  )
}
