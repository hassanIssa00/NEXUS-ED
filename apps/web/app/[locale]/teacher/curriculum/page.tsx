'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  BookOpen, Search, Sparkles, Layers3, PenTool, Users
} from 'lucide-react'
import { curriculaList } from '@/lib/curriculaData'

export default function TeacherCurriculumPage() {
  const [search, setSearch] = useState('')

  const filtered = curriculaList.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.title.toLowerCase().includes(q) ||
      c.badge.toLowerCase().includes(q) ||
      c.subtitle.toLowerCase().includes(q)
    )
  })

  const totalPages = curriculaList.reduce((acc, c) => acc + c.pageCount, 0)

  return (
    <div className="min-h-screen" dir="rtl">
      {/* ── Hero ── */}
      <header className="overflow-hidden rounded-3xl bg-gradient-to-l from-blue-950 via-indigo-900 to-slate-900 p-6 text-white shadow-xl mb-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-400/20 px-3.5 py-1 text-xs font-black text-blue-300 ring-1 ring-blue-400/40">
                <Sparkles size={14} />
                إدارة المناهج — المعلم
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/80">
                العام الدراسي 1448هـ
              </span>
            </div>
            <h1 className="text-3xl font-black">إدارة المناهج التعليمية</h1>
            <p className="mt-2 max-w-xl text-sm font-bold leading-7 text-slate-300">
              افتح أي كتاب تفاعلي، راجع الوحدات، وأسند الواجبات والصفحات للطلاب مباشرة.
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-2xl bg-white/10 p-4 ring-1 ring-white/20 sm:min-w-[200px]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white/70">المواد</span>
              <span className="text-xl font-black text-blue-300">{curriculaList.length}</span>
            </div>
            <div className="flex items-center justify-between border-t border-white/10 pt-2">
              <span className="text-xs font-bold text-white/70">الصفحات</span>
              <span className="text-xl font-black">{totalPages}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Features */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { icon: <PenTool size={14} />, label: 'شرح وتوضيح بالقلم التفاعلي', color: 'text-blue-700 bg-blue-50 border-blue-200' },
          { icon: <Layers3 size={14} />, label: 'عرض الصفحات أمام الطلاب', color: 'text-amber-700 bg-amber-50 border-amber-200' },
          { icon: <Users size={14} />, label: 'إسناد الواجبات للطلاب', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
        ].map((f) => (
          <span key={f.label} className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-black ${f.color}`}>
            {f.icon} {f.label}
          </span>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="ابحث عن مادة..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white py-3 pr-10 pl-4 text-sm font-bold text-slate-900 shadow-sm outline-none focus:border-blue-600 transition"
        />
      </div>

      {/* Grid */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((curriculum) => (
          <article
            key={curriculum.slug}
            className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            <div className="p-5 text-white relative overflow-hidden" style={{ backgroundColor: curriculum.color }}>
              <div className="absolute -top-6 -left-6 w-32 h-32 rounded-full opacity-20" style={{ backgroundColor: curriculum.accent }} />
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="rounded-full bg-black/25 px-3 py-1 text-xs font-black">{curriculum.badge}</span>
                  <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold">{curriculum.pageCount} ص</span>
                </div>
                <h2 className="text-xl font-black">{curriculum.title}</h2>
                <p className="mt-1 text-xs font-bold text-white/80">{curriculum.grade}</p>
              </div>
            </div>
            <div className="flex flex-1 flex-col p-5">
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 mb-4">
                <p className="text-[11px] font-black text-slate-500 mb-1.5">الوحدات:</p>
                <div className="flex flex-wrap gap-1.5">
                  {curriculum.units.map((u) => (
                    <span key={u.title} className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200">
                      {u.title}
                    </span>
                  ))}
                </div>
              </div>
              <Link
                href={`/teacher/curriculum/${curriculum.slug}`}
                className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:opacity-90"
                style={{ backgroundColor: curriculum.color }}
              >
                <BookOpen size={14} />
                {curriculum.isQuran ? 'فتح المصحف' : 'فتح الكتاب التفاعلي'}
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
