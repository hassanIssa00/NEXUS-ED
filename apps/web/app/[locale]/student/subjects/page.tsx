'use client'

import { useState } from 'react'
import { useLocale } from 'next-intl'
import { Link } from '@/i18n/routing'
import {
  BookOpen, Search, Sparkles, GraduationCap, Layers3, PenTool, CheckCircle2
} from 'lucide-react'
import { curriculaList } from '@/lib/curriculaData'

const curriculumEnglish: Record<string, { title: string; shortTitle: string; subtitle: string; badge: string; promise: string; units: string[] }> = {
  lughati: { title: 'My Language', shortTitle: 'My Language', subtitle: 'Student textbook and interactive activities', badge: 'Arabic language foundations', promise: 'The approved interactive Arabic language textbook for Grade 1, with pen tools for writing, coloring, and completing exercises throughout the lessons.', units: ['Family and readiness guide', 'Unit 1: My Family', 'Unit 2: My School', 'Unit 3: My City'] },
  math: { title: 'Mathematics', shortTitle: 'Mathematics', subtitle: 'Student textbook and interactive exercises', badge: 'Numbers and operations', promise: 'The interactive Grade 1 mathematics book covers comparison, classification, numbers to 20, and interactive addition and subtraction.', units: ['Chapter 1: Comparing and sorting', 'Chapter 2: Numbers to 5', 'Chapter 3: Position and patterns', 'Chapter 4: Numbers to 10', 'Chapter 5: Numbers to 20 and introduction to addition'] },
  islamic: { title: 'Islamic Studies', shortTitle: 'Islamic Studies', subtitle: 'Quran, monotheism, jurisprudence, and conduct', badge: 'Quran, faith, and manners', promise: 'The interactive Islamic studies book includes assigned Quran chapters, the pillars of Islam, daily manners and conduct, and interactive exercises.', units: ['Section 1: The Holy Quran and recitation', 'Section 2: Monotheism and Islamic faith', 'Section 3: Jurisprudence, conduct, and manners'] },
  science: { title: 'Science', shortTitle: 'Science', subtitle: 'Student textbook, experiments, and discovery', badge: 'Exploration and scientific thinking', promise: 'The interactive science book covers living things, plants, animals, and habitats, with interactive drawing and matching activities.', units: ['Unit 1: Plants and living things', 'Unit 2: Animals and their habitats', 'Unit 3: Earth, environment, and resources'] },
  english: { title: 'English (We Can 1)', shortTitle: 'English · We Can', subtitle: 'Student’s book and interactive phonics', badge: 'English and phonics', promise: 'The We Can 1 interactive English book helps students practise English letters, first words, simple conversations, and activities using the interactive pen.', units: ['Unit 1: Feelings and greetings', 'Unit 2: Things we wear', 'Unit 3: Things on the desk and in the classroom', 'Phonics and alphabet practice', 'Picture dictionary and workbook'] },
  'life-skills': { title: 'Life and Family Skills', shortTitle: 'Life Skills', subtitle: 'Student textbook and practical activities', badge: 'Skills, conduct, and independence', promise: 'The interactive life and family skills book develops independence, personal hygiene, safety, and positive family interactions.', units: ['Unit 1: My health and safety', 'Unit 2: My personality and responsibilities at home', 'Unit 3: My time, games, and daily routine'] },
  art: { title: 'Art Education', shortTitle: 'Art Education', subtitle: 'Student textbook, artistic expression, and composition', badge: 'Drawing and creative expression', promise: 'The interactive art book develops drawing, simple decoration, color printing, and three-dimensional composition.', units: ['Unit 1: Drawing and coloring', 'Unit 2: Simple decoration', 'Unit 3: Color printing', 'Unit 4: Three-dimensional composition'] },
  quran: { title: 'Juz Amma · Holy Quran', shortTitle: 'Juz Amma', subtitle: 'Interactive reading, memorization, and recitation', badge: 'Holy Quran · 30th section', promise: 'An interactive display for reading, memorizing, and reciting the short chapters of Juz Amma.', units: ['An-Naba, An-Naziat, and Abasa', 'At-Takwir through At-Tariq', 'Al-Ala through Ash-Sharh', 'At-Tin through An-Nas'] },
}

export default function StudentSubjectsPage() {
  const isEnglish = useLocale() === 'en'
  const [search, setSearch] = useState('')

  const filtered = curriculaList.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.title.toLowerCase().includes(q) ||
      c.badge.toLowerCase().includes(q) ||
      c.subtitle.toLowerCase().includes(q) ||
      c.shortTitle.toLowerCase().includes(q) ||
      (curriculumEnglish[c.slug] && Object.values(curriculumEnglish[c.slug]).flat().join(' ').toLowerCase().includes(q))
    )
  })

  const totalPages = curriculaList.reduce((acc, c) => acc + c.pageCount, 0)

  return (
    <div className="min-h-screen" dir={isEnglish ? 'ltr' : 'rtl'}>
      {/* ── Hero Banner ── */}
      <header className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-l from-slate-950 via-indigo-950 to-blue-900 p-6 text-white shadow-xl mb-6">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3.5 py-1 text-xs font-black text-amber-300 ring-1 ring-amber-400/40">
                <Sparkles size={14} />
                {isEnglish ? 'Approved official curricula · 1448 AH' : 'المناهج الرسمية المعتمدة 1448هـ'}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/80">
                {isEnglish ? 'Grade 1 · Primary' : 'الصف الأول الابتدائي'}
              </span>
            </div>
            <h1 className="text-3xl font-black md:text-4xl">{isEnglish ? 'Interactive curriculum library' : 'مجلد المناهج التعليمية التفاعلية'}</h1>
            <p className="mt-3 max-w-2xl text-sm font-bold leading-7 text-slate-300">
              {isEnglish ? 'Official textbooks are available in an interactive reader. Browse pages, write and annotate, and move between units.' : 'جميع الكتب المدرسية الرسمية مدمجة بنظام التفاعل — تصفح الصفحات بالقلم، ارسم وعلّق، وانتقل بين الوحدات بضغطة واحدة.'}
            </p>
          </div>

          <div className="flex flex-col gap-2 rounded-2xl bg-white/10 p-4 backdrop-blur-sm ring-1 ring-white/20 sm:min-w-[240px]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white/70">{isEnglish ? 'Subjects' : 'إجمالي المواد'}</span>
              <span className="text-xl font-black text-amber-300">{curriculaList.length} {isEnglish ? 'subjects' : 'مواد'}</span>
            </div>
            <div className="flex items-center justify-between border-t border-white/10 pt-2">
              <span className="text-xs font-bold text-white/70">{isEnglish ? 'Total pages' : 'إجمالي الصفحات'}</span>
              <span className="text-xl font-black text-white">{totalPages} {isEnglish ? 'pages' : 'صفحة'}</span>
            </div>
            <div className="flex items-center justify-between border-t border-white/10 pt-2">
              <span className="text-xs font-bold text-white/70">{isEnglish ? 'Available units' : 'الوحدات المتاحة'}</span>
              <span className="text-xl font-black text-emerald-300">
                {curriculaList.reduce((acc, c) => acc + c.units.length, 0)} {isEnglish ? 'units' : 'وحدة'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Features Strip ── */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { icon: <PenTool size={14} />, label: isEnglish ? 'Interactive pen on every page' : 'قلم تفاعلي على كل الصفحات', color: 'text-blue-700 bg-blue-50 border-blue-200' },
          { icon: <Layers3 size={14} />, label: isEnglish ? 'Move quickly between pages' : 'تصفح فوري بين الصفحات', color: 'text-amber-700 bg-amber-50 border-amber-200' },
          { icon: <CheckCircle2 size={14} />, label: isEnglish ? 'Drawings save automatically' : 'حفظ تلقائي للرسومات', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
          { icon: <GraduationCap size={14} />, label: isEnglish ? 'Approved curriculum · 1448 AH' : 'منهج معتمد 1448هـ', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
        ].map((f) => (
          <span key={f.label} className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-black ${f.color}`}>
            {f.icon}
            {f.label}
          </span>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="relative mb-6">
        <Search size={18} className={`absolute ${isEnglish ? 'left-3.5' : 'right-3.5'} top-1/2 -translate-y-1/2 text-slate-400`} />
        <input
          type="text"
          placeholder={isEnglish ? 'Search subjects or textbooks…' : 'ابحث عن مادة أو كتاب دراسي...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`w-full rounded-2xl border border-slate-200 bg-white py-3 ${isEnglish ? 'pl-10 pr-4' : 'pr-10 pl-4'} text-sm font-bold text-slate-900 shadow-sm outline-none focus:border-blue-600 transition`}
        />
      </div>

      {/* ── Curricula Grid ── */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((curriculum) => (
          (() => {
            const translated = curriculumEnglish[curriculum.slug]
            const displayTitle = isEnglish ? (translated?.title || curriculum.title) : curriculum.title
            const displayUnits = isEnglish ? (translated?.units || []) : []
            return (
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
                    {isEnglish ? translated?.badge || curriculum.badge : curriculum.badge}
                  </span>
                  <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold">
                    {curriculum.pageCount} {isEnglish ? 'pages' : 'صفحة'}
                  </span>
                </div>
                <h2 className="text-2xl font-black">{displayTitle}</h2>
                <p className="mt-1 text-xs font-bold text-white/80">{isEnglish ? translated?.subtitle || curriculum.subtitle : curriculum.subtitle}</p>
              </div>
            </div>

            {/* Body */}
            <div className="flex flex-1 flex-col justify-between p-5">
              <div>
                <p className="text-xs font-bold leading-6 text-slate-600">{isEnglish ? translated?.promise || curriculum.promise : curriculum.promise}</p>

                {/* Units preview */}
                <div className="mt-4 rounded-xl bg-slate-50 p-3 border border-slate-100">
                  <p className="text-[11px] font-black text-slate-500 mb-1.5">{isEnglish ? 'Units and chapters:' : 'الوحدات والفصول:'}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {curriculum.units.map((u, index) => (
                      <span
                        key={u.title}
                        className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200"
                      >
                        {isEnglish ? displayUnits[index] || u.title : u.title}
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
                  {isEnglish ? (curriculum.isQuran ? 'Open Quran' : 'Open interactive book') : (curriculum.isQuran ? 'فتح المصحف' : 'فتح الكتاب التفاعلي')}
                </Link>
              </div>
            </div>
          </article>
            )
          })()
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Search size={40} className="mb-3 opacity-40" />
          <p className="text-sm font-bold">{isEnglish ? 'No subjects match your search' : 'لا توجد مواد تطابق البحث'}</p>
        </div>
      )}
    </div>
  )
}
