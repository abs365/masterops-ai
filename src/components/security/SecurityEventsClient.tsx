'use client'

import { useState, useMemo } from 'react'
import { SecurityEvent } from '@/types'
import { severityColor, timeAgo } from '@/lib/utils'

interface Props {
  events: SecurityEvent[]
  projects: Array<{ id: string; name: string; slug: string }>
}

export function SecurityEventsClient({ events, projects }: Props) {
  const [severityFilter, setSeverityFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const eventTypes = useMemo(
    () => [...new Set(events.map(e => e.event_type).filter(Boolean))],
    [events]
  )

  const filtered = useMemo(() => {
    return events.filter(e => {
      if (severityFilter && e.severity !== severityFilter) return false
      if (projectFilter && e.project_id !== projectFilter) return false
      if (typeFilter && e.event_type !== typeFilter) return false
      return true
    })
  }, [events, severityFilter, projectFilter, typeFilter])

  const hasFilters = severityFilter || projectFilter || typeFilter

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={severityFilter}
          onChange={e => setSeverityFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All severities</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
          <option value="emergency">Emergency</option>
        </select>

        <select
          value={projectFilter}
          onChange={e => setProjectFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All projects</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All event types</option>
          {(eventTypes as string[]).map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {hasFilters && (
          <button
            onClick={() => { setSeverityFilter(''); setProjectFilter(''); setTypeFilter('') }}
            className="text-sm text-indigo-600 hover:text-indigo-800 px-2"
          >
            Clear filters
          </button>
        )}

        <span className="ml-auto text-xs text-gray-400 self-center">
          {filtered.length} event{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-400">No events match the selected filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 border-b border-gray-200">
                <th className="px-5 py-3 text-left font-medium">Severity</th>
                <th className="px-5 py-3 text-left font-medium">Project</th>
                <th className="px-5 py-3 text-left font-medium">Event Type</th>
                <th className="px-5 py-3 text-left font-medium">Description</th>
                <th className="px-5 py-3 text-left font-medium">IP</th>
                <th className="px-5 py-3 text-left font-medium">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(e => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${severityColor((e.severity ?? 'info') as 'info')}`}>
                      {e.severity ?? 'info'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {e.project?.name ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3 text-gray-700">{e.event_type ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-600 max-w-xs truncate" title={e.description ?? ''}>
                    {e.description ?? '—'}
                  </td>
                  <td className="px-5 py-3 text-gray-400 font-mono text-xs">{e.ip_address ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-400 whitespace-nowrap">{timeAgo(e.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
