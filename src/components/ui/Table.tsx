export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  )
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="text-xs text-gray-400 border-b border-gray-100">{children}</tr>
    </thead>
  )
}

export function TableHeaderCell({ children }: { children: React.ReactNode }) {
  return <th className="px-5 py-2 text-left font-medium">{children}</th>
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-gray-50">{children}</tbody>
}

export function TableRow({ children }: { children: React.ReactNode }) {
  return <tr>{children}</tr>
}

export function TableCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-5 py-3 ${className ?? 'text-gray-500'}`}>{children}</td>
}
