'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocale } from 'next-intl'
import { BookOpen, CircleAlert, ExternalLink, FileText, Image as ImageIcon, RefreshCw, Search, Video } from 'lucide-react'
import { apiClient } from '@/lib/api/client'

type LibraryCategory = { id: string; name: string; description: string | null; _count?: { items: number } }
type LibraryItem = {
  id: string
  title: string
  description: string | null
  type: string
  url: string
  coverUrl: string | null
  createdAt: string
  category?: { id: string; name: string } | null
  subject?: { id: string; name: string } | null
}

export default function ContentLibraryPage() {
  const locale = useLocale() === 'en' ? 'en' : 'ar'
  const [categories, setCategories] = useState<LibraryCategory[]>([])
  const [items, setItems] = useState<LibraryItem[]>([])
  const [categoryId, setCategoryId] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const t = locale === 'en'
    ? { eyebrow: 'School resources', title: 'Educational library', subtitle: 'Browse learning resources saved in the school library.', refresh: 'Refresh', search: 'Search title, subject, or category', all: 'All categories', books: 'Books', videos: 'Videos', other: 'Other resources', category: 'Category', subject: 'Subject', open: 'Open resource', empty: 'No library resources match this selection.', loading: 'Loading school resources…', error: 'Could not load library resources.', date: 'Added', noDescription: 'No description provided.' }
    : { eyebrow: 'موارد المدرسة', title: 'المكتبة التعليمية', subtitle: 'استعراض المصادر التعليمية المسجلة في مكتبة المدرسة.', refresh: 'تحديث', search: 'ابحث بالعنوان أو المادة أو التصنيف', all: 'كل التصنيفات', books: 'الكتب', videos: 'الفيديوهات', other: 'مصادر أخرى', category: 'التصنيف', subject: 'المادة', open: 'فتح المصدر', empty: 'لا توجد مصادر مطابقة للاختيار.', loading: 'جارٍ تحميل مصادر المدرسة...', error: 'تعذر تحميل مصادر المكتبة.', date: 'تاريخ الإضافة', noDescription: 'لا يوجد وصف لهذا المصدر.' }

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [categoryResponse, itemResponse] = await Promise.all([
        apiClient.get('/content/categories'),
        apiClient.get('/content/items'),
      ])
      setCategories(Array.isArray(categoryResponse.data?.data) ? categoryResponse.data.data : [])
      setItems(Array.isArray(itemResponse.data?.data) ? itemResponse.data.data : [])
    } catch {
      setCategories([])
      setItems([])
      setError(t.error)
    } finally {
      setLoading(false)
    }
  }, [t.error])

  useEffect(() => { void load() }, [load])

  const filteredItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return items.filter((item) => {
      const categoryMatches = categoryId === 'all' || item.category?.id === categoryId
      const text = [item.title, item.description, item.subject?.name, item.category?.name].filter(Boolean).join(' ').toLocaleLowerCase()
      return categoryMatches && (!query || text.includes(query))
    })
  }, [categoryId, items, search])
  const countByType = (type: string) => items.filter((item) => item.type.toUpperCase() === type).length
  const typeLabel = (type: string) => {
    const normalized = type.toUpperCase()
    if (normalized === 'BOOK') return locale === 'en' ? 'Book' : 'كتاب'
    if (normalized === 'VIDEO') return locale === 'en' ? 'Video' : 'فيديو'
    if (normalized === 'ARTICLE') return locale === 'en' ? 'Article' : 'مقال'
    return type
  }
  const typeIcon = (type: string) => type.toUpperCase() === 'VIDEO' ? Video : type.toUpperCase() === 'BOOK' ? BookOpen : FileText

  return <main className="mx-auto max-w-7xl space-y-6 pb-12" dir={locale === 'en' ? 'ltr' : 'rtl'}>
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
      <div><p className="text-sm font-semibold text-violet-700 dark:text-violet-300">{t.eyebrow}</p><h1 className="mt-1 text-3xl font-black">{t.title}</h1><p className="mt-2 text-sm text-muted-foreground">{t.subtitle}</p></div>
      <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />{t.refresh}</button>
    </header>

    {error && <div role="alert" className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><CircleAlert className="h-4 w-4" />{error}</div>}

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        { label: t.all, value: items.length, icon: BookOpen },
        { label: t.books, value: countByType('BOOK'), icon: BookOpen },
        { label: t.videos, value: countByType('VIDEO'), icon: Video },
        { label: t.other, value: items.filter((item) => !['BOOK', 'VIDEO'].includes(item.type.toUpperCase())).length, icon: ImageIcon },
      ].map(({ label, value, icon: Icon }) => <article key={label} className="rounded-xl border border-border bg-card p-4"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{label}</p><Icon className="h-5 w-5 text-primary" /></div><p className="mt-2 text-2xl font-bold">{loading ? '—' : value}</p></article>)}
    </section>

    <section className="flex flex-wrap gap-3 rounded-xl border border-border bg-card p-4">
      <label className="grid min-w-52 flex-1 gap-1.5 text-sm font-semibold"><span>{t.category}</span><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2.5"><option value="all">{t.all}</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <label className="grid min-w-52 flex-1 gap-1.5 text-sm font-semibold"><span>{locale === 'en' ? 'Search' : 'بحث'}</span><span className="relative"><Search className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ${locale === 'en' ? 'left-3' : 'right-3'}`} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.search} className={`w-full rounded-lg border border-border bg-background py-2.5 ${locale === 'en' ? 'pl-9 pr-3' : 'pr-9 pl-3'}`} /></span></label>
    </section>

    {loading ? <p className="py-16 text-center text-sm text-muted-foreground">{t.loading}</p> : filteredItems.length === 0 ? <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground"><BookOpen className="mx-auto mb-3 h-8 w-8 opacity-50" />{t.empty}</div> : <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {filteredItems.map((item) => {
        const Icon = typeIcon(item.type)
        const url = safeHttpUrl(item.url)
        return <article key={item.id} className="overflow-hidden rounded-xl border border-border bg-card">
          {item.coverUrl && safeHttpUrl(item.coverUrl) && <img src={safeHttpUrl(item.coverUrl)!} alt="" className="h-40 w-full object-cover" loading="lazy" />}
          <div className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><Icon className="h-5 w-5 shrink-0 text-primary" /><h2 className="truncate font-bold">{item.title}</h2></div><span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{typeLabel(item.type)}</span></div>
            <p className="min-h-10 text-sm text-muted-foreground">{item.description || t.noDescription}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span>{t.category}: {item.category?.name || '—'}</span><span>{t.subject}: {item.subject?.name || '—'}</span></div>
            <div className="flex items-center justify-between gap-3 border-t border-border pt-3"><time className="text-xs text-muted-foreground">{t.date} · {new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'ar-SA', { dateStyle: 'medium' }).format(new Date(item.createdAt))}</time>{url && <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"><ExternalLink className="h-4 w-4" />{t.open}</a>}</div>
          </div>
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
