'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

type State = 'idle' | 'loading' | 'success' | 'error'

export function GenerateReportButton() {
  const router = useRouter()
  const [state, setState] = useState<State>('idle')
  const [aiGenerated, setAiGenerated] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleClick() {
    setState('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/reports/daily', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) { setErrorMsg(json.error ?? 'Generation failed'); setState('error'); return }
      setAiGenerated(json.ai_generated ?? false)
      setState('success')
      router.refresh()
      setTimeout(() => setState('idle'), 8000)
    } catch {
      setErrorMsg('Network error')
      setState('error')
      setTimeout(() => setState('idle'), 5000)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        onClick={handleClick}
        disabled={state === 'loading'}
        className={cn(
          'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
          state === 'loading' ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' :
          state === 'success' ? 'bg-green-50 text-green-700 border-green-200' :
          state === 'error' ? 'bg-red-50 text-red-700 border-red-200' :
          'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
        )}
      >
        <Sparkles size={14} className={state === 'loading' ? 'animate-pulse' : ''} />
        {state === 'loading' ? 'Generating…' : state === 'success' ? 'Generated' : state === 'error' ? 'Failed' : 'Generate Report Now'}
      </button>
      {state === 'success' && (
        <p className="text-xs text-gray-500">
          {aiGenerated ? 'AI-powered report generated' : 'Template report generated (add AI API key for smarter reports)'}
        </p>
      )}
      {state === 'error' && <p className="text-xs text-red-500">{errorMsg}</p>}
    </div>
  )
}
