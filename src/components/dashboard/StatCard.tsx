import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/Card'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  color?: 'default' | 'green' | 'red' | 'yellow' | 'indigo'
  sub?: string
}

const colorMap = {
  default: 'text-gray-500 bg-gray-50',
  green: 'text-green-600 bg-green-50',
  red: 'text-red-600 bg-red-50',
  yellow: 'text-yellow-600 bg-yellow-50',
  indigo: 'text-indigo-600 bg-indigo-50',
}

export function StatCard({ title, value, icon: Icon, color = 'default', sub }: StatCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={cn('p-2.5 rounded-lg', colorMap[color])}>
          <Icon size={18} />
        </div>
      </div>
    </Card>
  )
}
