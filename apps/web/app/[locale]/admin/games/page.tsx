'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocale } from 'next-intl'
import { AlertCircle, BookOpen, ExternalLink, Gamepad2, RefreshCw, Trophy, Users } from 'lucide-react'
import { apiClient } from '@/lib/api/client'

type GameRecord = {
  id: string
  title: string
  description: string | null
  url: string | null
  createdAt: string
  subject: { id: string; name: string; code?: string | null }
  _count: { sessions: number; scores: number }
}

export default function EducationalGamesPage() {
  const locale = useLocale() === 'en' ? 'en' : 'ar'
  const [games, setGames] = useState<GameRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const t = locale === 'en'
    ? { eyebrow: 'School learning resources', title: 'Educational games', subtitle: 'Games and activity counts recorded for your school.', refresh: 'Refresh', games: 'Games', subjects: 'Subjects', sessions: 'Sessions started', scores: 'Scores recorded', loading: 'Loading educational games…', error: 'Could not load games for this school.', empty: 'No educational games have been added to the school library.', open: 'Open game', added: 'Added', noDescription: 'No description provided.' }
    : { eyebrow: 'موارد المدرسة التعليمية', title: 'الألعاب التعليمية', subtitle: 'الألعاب التعليمية وإحصاءات النشاط المسجلة لمدرستك.', refresh: 'تحديث', games: 'الألعاب', subjects: 'المواد المرتبطة', sessions: 'جلسات بدأت', scores: 'نتائج مسجلة', loading: 'جارٍ تحميل الألعاب التعليمية...', error: 'تعذر تحميل ألعاب هذه المدرسة.', empty: 'لم تُضف ألعاب تعليمية إلى مكتبة المدرسة بعد.', open: 'فتح اللعبة', added: 'تاريخ الإضافة', noDescription: 'لا يوجد وصف لهذه اللعبة.' }

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await apiClient.get('/games')
      setGames(Array.isArray(response.data?.data) ? response.data.data : [])
    } catch {
      setGames([])
      setError(t.error)
    } finally {
      setLoading(false)
    }
  }, [t.error])

  useEffect(() => { void load() }, [load])

  const stats = useMemo(() => ({
    subjects: new Set(games.map((game) => game.subject?.id).filter(Boolean)).size,
    sessions: games.reduce((sum, game) => sum + (game._count?.sessions || 0), 0),
    scores: games.reduce((sum, game) => sum + (game._count?.scores || 0), 0),
  }), [games])

  return <main className="mx-auto max-w-7xl space-y-6 pb-12" dir={locale === 'en' ? 'ltr' : 'rtl'}>
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
      <div><p className="text-sm font-semibold text-violet-700 dark:text-violet-300">{t.eyebrow}</p><h1 className="mt-1 text-3xl font-black">{t.title}</h1><p className="mt-2 text-sm text-muted-foreground">{t.subtitle}</p></div>
      <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />{t.refresh}</button>
    </header>

    {error && <div role="alert" className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><AlertCircle className="h-4 w-4" />{error}</div>}

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        { label: t.games, value: games.length, icon: Gamepad2 },
        { label: t.subjects, value: stats.subjects, icon: BookOpen },
        { label: t.sessions, value: stats.sessions, icon: Users },
        { label: t.scores, value: stats.scores, icon: Trophy },
      ].map(({ label, value, icon: Icon }) => <article key={label} className="rounded-xl border border-border bg-card p-4"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{label}</p><Icon className="h-5 w-5 text-primary" /></div><p className="mt-2 text-2xl font-bold">{loading ? '—' : value.toLocaleString(locale === 'en' ? 'en-US' : 'ar-SA')}</p></article>)}
    </section>

    {loading ? <p className="py-16 text-center text-sm text-muted-foreground">{t.loading}</p> : games.length === 0 ? <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground"><Gamepad2 className="mx-auto mb-3 h-8 w-8 opacity-50" />{t.empty}</div> : <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {games.map((game) => {
        const url = safeHttpUrl(game.url)
        return <article key={game.id} className="space-y-4 rounded-xl border border-border bg-card p-5">
          <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Gamepad2 className="h-5 w-5" /></span><div className="min-w-0"><h2 className="truncate font-bold">{game.title}</h2><p className="mt-1 text-xs text-muted-foreground">{game.subject?.name || '—'}{game.subject?.code ? ` · ${game.subject.code}` : ''}</p></div></div>
          <p className="min-h-10 text-sm text-muted-foreground">{game.description || t.noDescription}</p>
          <div className="grid grid-cols-2 gap-2 border-y border-border py-3 text-xs"><p className="text-muted-foreground">{t.sessions}<strong className="mt-1 block text-base text-foreground">{game._count?.sessions ?? 0}</strong></p><p className="text-muted-foreground">{t.scores}<strong className="mt-1 block text-base text-foreground">{game._count?.scores ?? 0}</strong></p></div>
          <div className="flex items-center justify-between gap-3"><time className="text-xs text-muted-foreground">{t.added} · {new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'ar-SA', { dateStyle: 'medium' }).format(new Date(game.createdAt))}</time>{url && <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"><ExternalLink className="h-4 w-4" />{t.open}</a>}</div>
        </article>
      })}
    </section>}
  </main>
}

function safeHttpUrl(raw: string | null | undefined) {
  if (!raw) return null
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
  } catch {
    return null
  }
}
