'use client'

import { usePathname } from 'next/navigation'

const titles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/projects': 'Projects',
  '/security': 'Security Centre',
  '/alerts': 'Alerts',
  '/costs': 'Cost Monitoring',
  '/backups': 'Backups',
  '/deployments': 'Deployments',
  '/leads': 'Lead Generation',
  '/reports': 'Reports',
  '/settings': 'Settings',
}

export function Header() {
  const pathname = usePathname()
  const title = Object.entries(titles).find(([k]) => pathname.startsWith(k))?.[1] ?? 'MasterOps'

  return (
    <header className="h-14 border-b border-gray-200 bg-white px-6 flex items-center justify-between">
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-gray-500">System Active</span>
        </div>
      </div>
    </header>
  )
}
