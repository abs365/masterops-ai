'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

type CheckState = 'idle' | 'loading' | 'success' | 'error'

interface CheckResult {
  checked: number
  results: Array<{ name: string; status: string; ms?: number }>
}

export function RunCheckButton({ onComplete }: { onComplete?: () => void } = {}) {
  const router = useRouter()
  const [state, setState] = useState<CheckState>('idle')
  const [result, setResult] = useState<CheckResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleClick() {
    setState('loading')
    setResult(null)
    setErrorMsg('')

    try {
      const res = await fetch('/api/monitor/check-projects', { method: 'POST' })
      const json = await res.json()

      if (!res.ok) {
        setErrorMsg(json.error ?? 'Check failed')
        setState('error')
        return
      }

      setResult(json)
      setState('success')
      router.refresh()
      onComplete?.()

      // Reset to idle after 8 seconds
      setTimeout(() => setState('idle'), 8000)
    } catch {
      setErrorMsg('Network error — could not reach monitoring API')
      setState('error')
      setTimeout(() => setState('idle'), 5000)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleClick}
        disabled={state === 'loading'}
        className={cn(
          'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border',
          state === 'loading'
            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
            : state === 'success'
            ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
            : state === 'error'
            ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
            : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
        )}
      >
        <RefreshCw size={14} className={state === 'loading' ? 'animate-spin' : ''} />
        {state === 'loading' ? 'Checking...' : state === 'success' ? 'Done' : state === 'error' ? 'Failed' : 'Run Check Now'}
      </button>

      {state === 'success' && result && (
        <div className="text-xs text-gray-500 bg-white border border-gray-200 rounded-lg px-3 py-2 max-w-xs w-full">
          <p className="font-medium text-gray-700 mb-1">Checked {result.checked} project{result.checked !== 1 ? 's' : ''}</p>
          <ul className="space-y-0.5">
            {result.results.map((r, i) => (
              <li key={i} className="flex items-center justify-between gap-2">
                <span className="truncate">{r.name}</span>
                <span className={cn(
                  'font-medium shrink-0',
                  r.status === 'online' ? 'text-green-600' :
                  r.status === 'down' ? 'text-red-600' :
                  r.status === 'slow' ? 'text-yellow-600' :
                  'text-gray-400'
                )}>
                  {r.status}{r.ms ? ` (${r.ms}ms)` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {state === 'error' && (
        <p className="text-xs text-red-600">{errorMsg}</p>
      )}
    </div>
  )
}
