import { cn } from '@/lib/utils'

function Table({ children, footer, className = '' }) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-3xl border border-border bg-surface shadow-sm shadow-black/20',
        className,
      )}
    >
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          {children}
        </table>
      </div>
      {footer && (
        <div className="border-t border-border bg-background/50 px-5 py-4">
          {footer}
        </div>
      )}
    </div>
  )
}

function TableHeader({ children }) {
  return (
    <thead className="bg-background text-foreground">
      {children}
    </thead>
  )
}

function TableBody({ children }) {
  return <tbody className="divide-y divide-border">{children}</tbody>
}

function TableRow({ children, className = '' }) {
  return (
    <tr className={cn('transition hover:bg-background/60', className)}>
      {children}
    </tr>
  )
}

function TableHead({ children, className = '' }) {
  return (
    <th
      className={cn(
        'px-6 py-4 text-sm font-black tracking-tight text-foreground first:rounded-tl-3xl last:rounded-tr-3xl',
        className,
      )}
    >
      {children}
    </th>
  )
}

function TableCell({ children, className = '' }) {
  return <td className={cn('px-6 py-4 align-middle text-foreground', className)}>{children}</td>
}

export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow }
