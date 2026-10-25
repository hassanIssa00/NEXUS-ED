'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { ExternalLink, Gamepad2, Loader2, RefreshCw, Trophy } from 'lucide-react'
import { apiClient } from '@/lib/api/client'

type Game = { id: string; title: string; description?: string | null; url?: string | null; subject?: { name?: string | null } }
type Score = { id: string; score: number; user?: { name?: string | null } }

export default function TeacherGamesPage() {
  const isEnglish = useLocale() === 'en'
  const [games, setGames] = useState<Game[]>([])
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [scores, setScores] = useState<Score[]>([])
  const [loading, setLoading] = useState(true)
  const [scoresLoading, setScoresLoading] = useState(false)
  const [error, setError] = useState('')

  const loadGames = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await apiClient.get('/games')
      const rows = Array.isArray(response.data?.data) ? response.data.data : []
      setGames(rows)
      setSelectedGame((current) => rows.find((game: Game) => game.id === current?.id) || null)
    } catch (reason: any) {
      setError(reason?.response?.data?.message || (isEnglish ? 'Could not load your school games.' : 'تعذر تحميل ألعاب مدرستك من النظام.'))
    } finally {
      setLoading(false)
    }
  }, [isEnglish])

  useEffect(() => { void loadGames() }, [loadGames])

  const showScores = async (game: Game) => {
    setSelectedGame(game)
    setScores([])
    setScoresLoading(true)
    setError('')
    try {
      const response = await apiClient.get(`/games/${encodeURIComponent(game.id)}/leaderboard`)
      setScores(Array.isArray(response.data?.data) ? response.data.data : [])
    } catch (reason: any) {
      setError(reason?.response?.data?.message || (isEnglish ? 'Could not load the saved results for this game.' : 'تعذر تحميل النتائج المسجلة لهذه اللعبة.'))
    } finally {
      setScoresLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 md:p-6" dir={isEnglish ? 'ltr' : 'rtl'}>
      <header className="flex items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-3"><Gamepad2 className="h-7 w-7 text-emerald-700" /><div><h1 className="text-xl font-bold">{isEnglish ? 'School games' : 'ألعاب المدرسة'}</h1><p className="text-sm text-muted-foreground">{isEnglish ? 'Games and saved results for your school.' : 'الألعاب والنتائج المحفوظة لمدرستك من قاعدة البيانات.'}</p></div></div>
        <button onClick={() => void loadGames()} disabled={loading} aria-label={isEnglish ? 'Refresh games' : 'تحديث الألعاب'} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />{isEnglish ? 'Refresh' : 'تحديث'}</button>
      </header>

      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {loading ? <p className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{isEnglish ? 'Loading games…' : 'جارٍ تحميل الألعاب...'}</p>
        : games.length === 0 ? <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{isEnglish ? 'No games are linked to your school subjects yet.' : 'لا توجد ألعاب مرتبطة بمواد مدرستك حتى الآن.'}</p>
          : <section className="grid gap-3 md:grid-cols-2">{games.map((game) => <article key={game.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-start gap-3"><Gamepad2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" /><div className="min-w-0 flex-1"><h2 className="font-semibold">{game.title}</h2>{game.description && <p className="mt-1 text-sm text-muted-foreground">{game.description}</p>}{game.subject?.name && <p className="mt-2 text-xs text-muted-foreground">{isEnglish ? 'Subject:' : 'المادة:'} {game.subject.name}</p>}</div></div>
            <div className="mt-4 flex flex-wrap gap-2">{safeHttpUrl(game.url) && <a href={safeHttpUrl(game.url) as string} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"><ExternalLink className="h-4 w-4" />{isEnglish ? 'Open game' : 'فتح اللعبة'}</a>}<button onClick={() => void showScores(game)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"><Trophy className="h-4 w-4" />{isEnglish ? 'View saved scores' : 'عرض النتائج المسجلة'}</button></div>
          </article>)}</section>}

      {selectedGame && <section className="rounded-xl border bg-card p-4">
        <h2 className="font-semibold">{isEnglish ? 'Top scores:' : 'أفضل النتائج:'} {selectedGame.title}</h2>
        {scoresLoading ? <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{isEnglish ? 'Loading scores…' : 'جارٍ تحميل النتائج...'}</p>
          : scores.length ? <ol className="mt-3 divide-y">{scores.map((score, index) => <li key={score.id} className="flex items-center justify-between gap-3 py-3 text-sm"><span>{index + 1}. {score.user?.name || (isEnglish ? 'Student' : 'طالب')}</span><strong>{score.score}</strong></li>)}</ol>
            : <p className="py-6 text-sm text-muted-foreground">{isEnglish ? 'No saved scores for this game.' : 'لا توجد نتائج محفوظة لهذه اللعبة.'}</p>}
      </section>}
    </main>
  )
}

function safeHttpUrl(raw?: string | null) {
  if (!raw) return null
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
  } catch {
    return null
  }
}
