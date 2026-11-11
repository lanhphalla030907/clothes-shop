import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react'

export function AdminTable({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`overflow-x-auto rounded-xl border border-line bg-paper-pure shadow-xs ${className}`}
    >
      <table className="w-full text-left text-[13px] border-collapse">
        {children}
      </table>
    </div>
  )
}

export function AdminTableHead({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <thead className={`border-b border-line bg-canvas/40 ${className}`}>
      {children}
    </thead>
  )
}

export function AdminTableHeaderCell({
  children,
  className = '',
  ...rest
}: ThHTMLAttributes<HTMLTableCellElement> & {
  children?: ReactNode
  className?: string
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 text-[11.5px] font-semibold tracking-wider text-graphite uppercase first:pl-5 last:pr-5 ${className}`}
      {...rest}
    >
      {children}
    </th>
  )
}

export function AdminTableRow({
  children,
  className = '',
  ...rest
}: HTMLAttributes<HTMLTableRowElement> & {
  children: ReactNode
  className?: string
}) {
  return (
    <tr
      className={`border-b border-line-soft transition-colors hover:bg-bone/40 last:border-b-0 ${className}`}
      {...rest}
    >
      {children}
    </tr>
  )
}

export function AdminTableCell({
  children,
  className = '',
  ...rest
}: TdHTMLAttributes<HTMLTableCellElement> & {
  children?: ReactNode
  className?: string
}) {
  return (
    <td
      className={`px-4 py-3.5 text-ink first:pl-5 last:pr-5 ${className}`}
      {...rest}
    >
      {children}
    </td>
  )
}
