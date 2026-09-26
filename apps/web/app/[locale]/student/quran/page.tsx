'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, ChevronLeft, ChevronRight, Star } from 'lucide-react'

const JUZ_AMMA_SURAHS = [
  { number: 78, name: 'سورة النبأ', verses: 40, startPage: 1 },
  { number: 79, name: 'سورة النازعات', verses: 46, startPage: 4 },
  { number: 80, name: 'سورة عبس', verses: 42, startPage: 6 },
  { number: 81, name: 'سورة التكوير', verses: 29, startPage: 8 },
  { number: 82, name: 'سورة الانفطار', verses: 19, startPage: 9 },
  { number: 83, name: 'سورة المطففين', verses: 36, startPage: 10 },
  { number: 84, name: 'سورة الانشقاق', verses: 25, startPage: 12 },
  { number: 85, name: 'سورة البروج', verses: 22, startPage: 13 },
  { number: 86, name: 'سورة الطارق', verses: 17, startPage: 14 },
  { number: 87, name: 'سورة الأعلى', verses: 19, startPage: 15 },
  { number: 88, name: 'سورة الغاشية', verses: 26, startPage: 16 },
  { number: 89, name: 'سورة الفجر', verses: 30, startPage: 17 },
  { number: 90, name: 'سورة البلد', verses: 20, startPage: 19 },
  { number: 91, name: 'سورة الشمس', verses: 15, startPage: 20 },
  { number: 92, name: 'سورة الليل', verses: 21, startPage: 21 },
  { number: 93, name: 'سورة الضحى', verses: 11, startPage: 22 },
  { number: 94, name: 'سورة الشرح', verses: 8, startPage: 22 },
  { number: 95, name: 'سورة التين', verses: 8, startPage: 23 },
  { number: 96, name: 'سورة العلق', verses: 19, startPage: 23 },
  { number: 97, name: 'سورة القدر', verses: 5, startPage: 24 },
  { number: 98, name: 'سورة البينة', verses: 8, startPage: 24 },
  { number: 99, name: 'سورة الزلزلة', verses: 8, startPage: 25 },
  { number: 100, name: 'سورة العاديات', verses: 11, startPage: 26 },
  { number: 101, name: 'سورة القارعة', verses: 11, startPage: 26 },
  { number: 102, name: 'سورة التكاثر', verses: 8, startPage: 27 },
  { number: 103, name: 'سورة العصر', verses: 3, startPage: 27 },
  { number: 104, name: 'سورة الهمزة', verses: 9, startPage: 28 },
  { number: 105, name: 'سورة الفيل', verses: 5, startPage: 28 },
  { number: 106, name: 'سورة قريش', verses: 4, startPage: 29 },
  { number: 107, name: 'سورة الماعون', verses: 7, startPage: 29 },
  { number: 108, name: 'سورة الكوثر', verses: 3, startPage: 30 },
  { number: 109, name: 'سورة الكافرون', verses: 6, startPage: 30 },
  { number: 110, name: 'سورة النصر', verses: 3, startPage: 31 },
  { number: 111, name: 'سورة المسد', verses: 5, startPage: 31 },
  { number: 112, name: 'سورة الإخلاص', verses: 4, startPage: 32 },
  { number: 113, name: 'سورة الفلق', verses: 5, startPage: 32 },
  { number: 114, name: 'سورة الناس', verses: 6, startPage: 32 },
]

export default function StudentQuranPage() {
  const [page, setPage] = useState(1)
  const [selectedSurah, setSelectedSurah] = useState(JUZ_AMMA_SURAHS[0])
  const totalPages = 72

  const pageSrc = (n: number) => `/resources/curricula/quran/page-${String(n).padStart(3, '0')}.jpg`

  const currentSurah = [...JUZ_AMMA_SURAHS].reverse().find(s => s.startPage <= page) || JUZ_AMMA_SURAHS[0]

  return (
    <div className="space-y-8 pb-16" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] p-8 text-white shadow-[0_20px_60px_rgba(6,95,70,0.4)]"
        style={{ background: 'linear-gradient(135deg, #065f46 0%, #042f2e 100%)' }}>
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md mb-4">
            <Star className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
            <span className="text-xs font-bold text-emerald-100">جزء عمّ — الجزء الثلاثون</span>
          </div>
          <h1 className="text-4xl font-black mb-2 tracking-tight">المصحف الشريف 📖</h1>
          <p className="text-emerald-100 text-sm font-medium">القرآن الكريم — الجزء الثلاثون للصف الأول الابتدائي</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <div className="bg-white/10 border border-white/15 backdrop-blur-md px-4 py-2.5 rounded-2xl">
              <p className="text-[10px] text-emerald-200 font-medium">عدد السور</p>
              <p className="text-lg font-black">{JUZ_AMMA_SURAHS.length} سورة</p>
            </div>
            <div className="bg-white/10 border border-white/15 backdrop-blur-md px-4 py-2.5 rounded-2xl">
              <p className="text-[10px] text-emerald-200 font-medium">عدد الصفحات</p>
              <p className="text-lg font-black">{totalPages} صفحة</p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* SURAH LIST */}
        <div className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-white/5">
            <h3 className="font-black text-gray-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-500" />فهرس السور
            </h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-white/5 max-h-[500px] overflow-y-auto">
            {JUZ_AMMA_SURAHS.map((s, i) => (
              <motion.button key={s.number} whileHover={{ x: -4 }}
                onClick={() => { setPage(s.startPage); setSelectedSurah(s) }}
                className={`w-full px-5 py-3 flex items-center justify-between gap-3 text-right transition-colors ${
                  selectedSurah.number === s.number
                    ? 'bg-emerald-50 dark:bg-emerald-500/10'
                    : 'hover:bg-gray-50 dark:hover:bg-white/5'
                }`}>
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-black flex items-center justify-center">{i + 1}</div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-gray-900 dark:text-white">{s.name}</p>
                    <p className="text-[10px] text-gray-500">{s.verses} آية</p>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-gray-400" />
              </motion.button>
            ))}
          </div>
        </div>

        {/* PAGE VIEWER */}
        <div className="lg:col-span-2 bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between gap-4">
            <button onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="text-center">
              <p className="font-black text-gray-900 dark:text-white text-sm">{currentSurah.name}</p>
              <p className="text-xs text-gray-500">صفحة {page} من {totalPages}</p>
            </div>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
          <div className="p-6">
            <div className="relative rounded-2xl overflow-hidden bg-amber-50 dark:bg-amber-900/10 border-4 border-amber-200 dark:border-amber-700/30 shadow-inner min-h-[400px] flex items-center justify-center">
              <img
                key={page}
                src={pageSrc(page)}
                alt={`صفحة ${page}`}
                className="w-full rounded-xl object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 pointer-events-none">
                <div className="text-7xl mb-4">📖</div>
                <p className="text-xl font-black text-emerald-800 dark:text-emerald-200 mb-2">{currentSurah.name}</p>
                <p className="text-base text-emerald-700 dark:text-emerald-300 font-bold">بِسۡمِ اللَّهِ الرَّحۡمَٰنِ الرَّحِيمِ</p>
                <p className="text-sm text-emerald-600/70 mt-2">صفحة {page} من {totalPages}</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-1.5 mt-4">
              {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(totalPages - 6, page - 3)) + i
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`h-2 rounded-full transition-all ${p === page ? 'w-6 bg-emerald-500' : 'w-2 bg-gray-200 dark:bg-white/20'}`} />
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
