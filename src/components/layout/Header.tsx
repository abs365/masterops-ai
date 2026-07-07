'use client'

import { usePathname } from 'next/navigation'

const titles: Record<string, string> = {
  '/dashboard': 'Enterprise Control Centre',
  '/projects': 'Portfolio Workspace',
  '/security': 'Enterprise Security Centre',
  '/alerts': 'Enterprise Risk and Alert Centre',
  '/costs': 'Enterprise Cost Intelligence',
  '/backups': 'Enterprise Continuity',
  '/deployments': 'Enterprise Release and Deployment Centre',
  '/leads': 'Enterprise Opportunity Intelligence',
  '/reports': 'Executive Intelligence',
  '/settings': 'Enterprise Configuration',
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
