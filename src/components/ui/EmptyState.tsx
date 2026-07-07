import { LucideIcon } from 'lucide-react'
import Link from 'next/link'

interface EmptyStateProps {
  icon: LucideIcon
  message: string
  action?: { label: string; href: string }
}

export function EmptyState({ icon: Icon, message, action }: EmptyStateProps) {
  return (
    <div className="px-5 py-8 flex flex-col items-center text-center gap-2">
      <Icon size={22} className="text-gray-300" />
      <p className="text-sm text-gray-400 max-w-xs">{message}</p>
      {action && (
        <Link href={action.href} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
          {action.label} →
        </Link>
      )}
    </div>
  )
}
