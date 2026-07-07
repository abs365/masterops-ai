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
  LucideIcon,
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

const overviewAnchor: NavItem = { href: '/dashboard', label: 'Control Centre', icon: LayoutDashboard }

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Portfolio & Risk',
    items: [
      { href: '/projects', label: 'Portfolio Registry', icon: FolderKanban },
      { href: '/security', label: 'Security Centre', icon: ShieldAlert },
      { href: '/alerts', label: 'Risk & Alerts', icon: Bell },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/costs', label: 'Cost Intelligence', icon: DollarSign },
      { href: '/backups', label: 'Continuity', icon: HardDrive },
      { href: '/deployments', label: 'Release & Deployments', icon: Rocket },
    ],
  },
  {
    label: 'Growth & Intelligence',
    items: [
      { href: '/leads', label: 'Opportunity Intelligence', icon: Users },
      { href: '/reports', label: 'Executive Intelligence', icon: FileText },
    ],
  },
]

const configurationAnchor: NavItem = { href: '/settings', label: 'Configuration', icon: Settings }

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
        active
          ? 'bg-indigo-600 text-white'
          : 'text-gray-400 hover:text-white hover:bg-gray-800'
      )}
    >
      <Icon size={16} />
      {item.label}
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const isActive = (href: string) => pathname.startsWith(href)

  return (
    <aside className="w-64 min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="px-6 py-5 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-sm font-bold">M</div>
          <div>
            <p className="text-sm font-bold leading-tight">MasterOps</p>
            <p className="text-xs text-gray-400">Enterprise Platform</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <NavLink item={overviewAnchor} active={isActive(overviewAnchor.href)} />

        {navGroups.map(group => (
          <div key={group.label} className="pt-4">
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              {group.label}
            </p>
            {group.items.map(item => (
              <NavLink key={item.href} item={item} active={isActive(item.href)} />
            ))}
          </div>
        ))}

        <div className="pt-4 mt-1 border-t border-gray-800">
          <div className="pt-3">
            <NavLink item={configurationAnchor} active={isActive(configurationAnchor.href)} />
          </div>
        </div>
      </nav>

      <div className="px-4 py-4 border-t border-gray-800">
        <p className="text-xs text-gray-500">Admin: tosinlawal05@gmail.com</p>
      </div>
    </aside>
  )
}
