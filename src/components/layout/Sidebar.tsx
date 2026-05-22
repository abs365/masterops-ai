'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FolderKanban,
  ShieldAlert,
  Bell,
  DollarSign,
  HardDrive,
  Rocket,
  Users,
  FileText,
  Settings,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/security', label: 'Security', icon: ShieldAlert },
  { href: '/alerts', label: 'Alerts', icon: Bell },
  { href: '/costs', label: 'Costs', icon: DollarSign },
  { href: '/backups', label: 'Backups', icon: HardDrive },
  { href: '/deployments', label: 'Deployments', icon: Rocket },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="px-6 py-5 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-sm font-bold">M</div>
          <div>
            <p className="text-sm font-bold leading-tight">MasterOps</p>
            <p className="text-xs text-gray-400">AI Control Centre</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname.startsWith(href)
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-gray-800">
        <p className="text-xs text-gray-500">Admin: tosinlawal05@gmail.com</p>
      </div>
    </aside>
  )
}
