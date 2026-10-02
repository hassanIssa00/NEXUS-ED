'use client'

import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Trophy } from 'lucide-react'
import { apiClient } from '@/lib/api/client'

interface LeaderboardEntry {
  rank: number
  userId: string
  name: string
  points: number
  level: number
  levelName: string
}

interface StudentRank {
  rank: number
  points: number
  level: number
  levelName: string
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [myRank, setMyRank] = useState<StudentRank | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [leaderboardResponse, rankResponse] = await Promise.all([
        apiClient.get('/gamification/leaderboard', { params: { limit: 100 } }),
        apiClient.get('/gamification/rank'),
      ])
      setEntries(Array.isArray(leaderboardResponse.data) ? leaderboardResponse.data : [])
      setMyRank(rankResponse.data)
    } catch {
      setError('تعذر تحميل ترتيب المدرسة.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  return (
    <main className="mx-auto max-w-4xl space-y-5 p-4 md:p-6" dir="rtl">
      <header className="flex items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-3"><Trophy className="h-7 w-7 text-amber-600" /><div><h1 className="text-xl font-bold">ترتيب المدرسة</h1><p className="text-sm text-muted-foreground">حسب نقاط الخبرة المسجلة</p></div></div>
        <button onClick={() => void load()} aria-label="تحديث الترتيب" className="rounded-lg border p-2"><RefreshCw className="h-4 w-4" /></button>
      </header>

      {myRank && <section className="flex items-center justify-between gap-4 rounded-lg border p-4"><div><p className="text-sm text-muted-foreground">ترتيبك</p><p className="text-xl font-bold">{myRank.rank > 0 ? `#${myRank.rank}` : 'لا يوجد ترتيب مسجل'}</p></div><div className="text-left"><p className="font-semibold">{myRank.points} XP</p><p className="text-xs text-muted-foreground">المستوى {myRank.level} · {myRank.levelName}</p></div></section>}

      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {loading ? <p className="py-12 text-center text-sm text-muted-foreground">جارٍ تحميل الترتيب...</p>
        : entries.length === 0 ? <p className="rounded-lg border p-8 text-center text-sm text-muted-foreground">لا توجد نقاط خبرة مسجلة في المدرسة بعد.</p>
          : <div className="divide-y rounded-lg border">{entries.map((entry) => <div key={entry.userId} className="flex items-center gap-4 p-4"><span className="w-10 text-center font-bold text-emerald-700">#{entry.rank}</span><div className="min-w-0 flex-1"><p className="truncate font-semibold">{entry.name}</p><p className="text-xs text-muted-foreground">المستوى {entry.level} · {entry.levelName}</p></div><p className="shrink-0 font-bold">{entry.points} XP</p></div>)}</div>}
    </main>
  )
}
