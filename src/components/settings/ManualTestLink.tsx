'use client'

import { ExternalLink } from 'lucide-react'

interface ManualTestLinkProps {
  href: string
  method: 'GET' | 'POST'
  label: string
}

export function ManualTestLink({ href, method, label }: ManualTestLinkProps) {
  return (
    <a
      href={method === 'GET' ? href : undefined}
      onClick={
        method === 'POST'
          ? async e => {
              e.preventDefault()
              await fetch(href, { method: 'POST' })
              window.location.reload()
            }
          : undefined
      }
      className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 px-3 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors"
      target={method === 'GET' ? '_blank' : undefined}
      rel="noreferrer"
    >
      <ExternalLink size={11} />
      {label}
    </a>
  )
}
