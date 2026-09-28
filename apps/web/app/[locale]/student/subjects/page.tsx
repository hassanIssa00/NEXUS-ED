'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  BookOpen, Search, Sparkles, GraduationCap, Layers3, PenTool, CheckCircle2
} from 'lucide-react'
import { curriculaList } from '@/lib/curriculaData'

export default function StudentSubjectsPage() {
  const [search, setSearch] = useState('')

  const filtered = curriculaList.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.title.toLowerCase().includes(q) ||
      c.badge.toLowerCase().includes(q) ||
      c.subtitle.toLowerCase().includes(q) ||
      c.shortTitle.toLowerCase().includes(q)
    )
  })

  const totalPages = curriculaList.reduce((acc, c) => acc + c.pageCount, 0)

  return (
    <div className="min-h-screen" dir="rtl">
      {/* ── Hero Banner ── */}
      <header className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-l from-slate-950 via-indigo-950 to-blue-900 p-6 text-white shadow-xl mb-6">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3.5 py-1 text-xs font-black text-amber-300 ring-1 ring-amber-400/40">
                <Sparkles size={14} />
                المناهج الرسمية المعتمدة 1448هـ
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/80">
                الصف الأول الابتدائي
              </span>
            </div>
            <h1 className="text-3xl font-black md:text-4xl">مجلد المناهج التعليمية التفاعلية</h1>
            <p className="mt-3 max-w-2xl text-sm font-bold leading-7 text-slate-300">
              جميع الكتب المدرسية الرسمية مدمجة بنظام التفاعل — تصفح الصفحات بالقلم، ارسم وعلّق، وانتقل بين الوحدات بضغطة واحدة.
            </p>
          </div>

          <div className="flex flex-col gap-2 rounded-2xl bg-white/10 p-4 backdrop-blur-sm ring-1 ring-white/20 sm:min-w-[240px]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white/70">إجمالي المواد</span>
              <span className="text-xl font-black text-amber-300">{curriculaList.length} مواد</span>
            </div>
            <div className="flex items-center justify-between border-t border-white/10 pt-2">
              <span className="text-xs font-bold text-white/70">إجمالي الصفحات</span>
              <span className="text-xl font-black text-white">{totalPages} صفحة</span>
            </div>
            <div className="flex items-center justify-between border-t border-white/10 pt-2">
              <span className="text-xs font-bold text-white/70">الوحدات المتاحة</span>
              <span className="text-xl font-black text-emerald-300">
                {curriculaList.reduce((acc, c) => acc + c.units.length, 0)} وحدة
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Features Strip ── */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { icon: <PenTool size={14} />, label: 'قلم تفاعلي على كل الصفحات', color: 'text-blue-700 bg-blue-50 border-blue-200' },
          { icon: <Layers3 size={14} />, label: 'تصفح فوري بين الصفحات', color: 'text-amber-700 bg-amber-50 border-amber-200' },
          { icon: <CheckCircle2 size={14} />, label: 'حفظ تلقائي للرسومات', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
          { icon: <GraduationCap size={14} />, label: 'منهج معتمد 1448هـ', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
        ].map((f) => (
          <span key={f.label} className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-black ${f.color}`}>
            {f.icon}
            {f.label}
          </span>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="relative mb-6">
        <Search size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="ابحث عن مادة أو كتاب دراسي..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white py-3 pr-10 pl-4 text-sm font-bold text-slate-900 shadow-sm outline-none focus:border-blue-600 transition"
        />
      </div>

      {/* ── Curricula Grid ── */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((curriculum) => (
          <article
            key={curriculum.slug}
            className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-lg hover:-translate-y-0.5"
          >
            {/* Color Header */}
            <div
              className="p-5 text-white relative overflow-hidden"
              style={{ backgroundColor: curriculum.color }}
            >
              <div
                className="absolute -top-6 -left-6 w-32 h-32 rounded-full opacity-20"
                style={{ backgroundColor: curriculum.accent }}
              />
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="rounded-full bg-black/25 px-3 py-1 text-xs font-black backdrop-blur-sm">
                    {curriculum.badge}
                  </span>
                  <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold">
                    {curriculum.pageCount} صفحة
                  </span>
                </div>
                <h2 className="text-2xl font-black">{curriculum.title}</h2>
                <p className="mt-1 text-xs font-bold text-white/80">{curriculum.subtitle}</p>
              </div>
            </div>

            {/* Body */}
            <div className="flex flex-1 flex-col justify-between p-5">
              <div>
                <p className="text-xs font-bold leading-6 text-slate-600">{curriculum.promise}</p>

                {/* Units preview */}
                <div className="mt-4 rounded-xl bg-slate-50 p-3 border border-slate-100">
                  <p className="text-[11px] font-black text-slate-500 mb-1.5">الوحدات والفصول:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {curriculum.units.map((u) => (
                      <span
                        key={u.title}
                        className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200"
                      >
                        {u.title}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-5 flex items-center gap-2 pt-3 border-t border-slate-100">
                <Link
                  href={`/student/subjects/${curriculum.slug}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:opacity-90"
                  style={{ backgroundColor: curriculum.color }}
                >
                  <BookOpen size={15} />
                  {curriculum.isQuran ? 'فتح المصحف' : 'فتح الكتاب التفاعلي'}
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Search size={40} className="mb-3 opacity-40" />
          <p className="text-sm font-bold">لا توجد مواد تطابق البحث</p>
        </div>
      )}
    </div>
  )
}
