import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  padded?: boolean
}

export function Card({ children, className, padded = true }: CardProps) {
  return (
    <div className={cn('bg-white rounded-xl border border-gray-200', padded && 'p-5', className)}>
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title: string
  action?: React.ReactNode
}

export function CardHeader({ title, action }: CardHeaderProps) {
  return (
    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {action}
    </div>
  )
}
