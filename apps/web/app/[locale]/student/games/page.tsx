'use client'

import { useCallback, useEffect, useState } from 'react'
import { ExternalLink, Gamepad2, RefreshCw } from 'lucide-react'
import { apiClient } from '@/lib/api/client'

interface SchoolGame {
  id: string
  title: string
  description?: string | null
  url?: string | null
  subject?: { name?: string | null }
}

export default function StudentGamesPage() {
  const [games, setGames] = useState<SchoolGame[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await apiClient.get('/games')
      setGames(Array.isArray(response.data?.data) ? response.data.data : [])
    } catch {
      setError('تعذر تحميل الألعاب المنشورة من المدرسة.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 md:p-6" dir="rtl">
      <header className="flex items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-3"><Gamepad2 className="h-7 w-7 text-emerald-700" /><div><h1 className="text-xl font-bold">الألعاب التعليمية المنشورة</h1><p className="text-sm text-muted-foreground">الألعاب المضافة إلى مكتبة المدرسة</p></div></div>
        <button onClick={() => void load()} aria-label="تحديث الألعاب" className="rounded-lg border p-2"><RefreshCw className="h-4 w-4" /></button>
      </header>
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {loading ? <p className="py-12 text-center text-sm text-muted-foreground">جارٍ تحميل الألعاب...</p>
        : games.length === 0 ? <p className="rounded-lg border p-8 text-center text-sm text-muted-foreground">لم تنشر المدرسة ألعابًا تعليمية بعد.</p>
          : <div className="divide-y rounded-lg border">{games.map((game) => {
            const url = game.url ? safeHttpUrl(game.url) : null
            return <div key={game.id} className="flex items-center gap-4 p-4"><Gamepad2 className="h-5 w-5 shrink-0 text-emerald-700" /><div className="min-w-0 flex-1"><p className="font-semibold">{game.title}</p>{game.description && <p className="mt-1 text-sm text-muted-foreground">{game.description}</p>}{game.subject?.name && <p className="mt-1 text-xs text-muted-foreground">{game.subject.name}</p>}</div>{url && <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm"><ExternalLink className="h-4 w-4" /> فتح</a>}</div>
          })}</div>}
    </main>
  )
}

function safeHttpUrl(raw: string) {
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
  } catch {
    return null
  }
}
