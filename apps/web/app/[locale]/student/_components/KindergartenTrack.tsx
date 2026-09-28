'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Star, Volume2, Palette, Trophy, Award, Smile, Play, Heart, RefreshCw, Check } from 'lucide-react'

export function KindergartenTrack() {
  const [selectedLetter, setSelectedLetter] = useState('أ')
  const [starsCount, setStarsCount] = useState(12)
  const [appleCount, setAppleCount] = useState(3)
  const [selectedColor, setSelectedColor] = useState('#ec4899')

  const LETTERS = [
    { char: 'أ', word: 'أرنب', emoji: '🐰', color: '#f43f5e' },
    { char: 'ب', word: 'بطة', emoji: '🦆', color: '#f59e0b' },
    { char: 'ت', word: 'تفاحة', emoji: '🍎', color: '#10b981' },
    { char: 'ث', word: 'ثعلب', emoji: '🦊', color: '#3b82f6' },
    { char: 'ج', word: 'جمل', emoji: '🐪', color: '#8b5cf6' },
    { char: 'ح', word: 'حصان', emoji: '🐴', color: '#ec4899' },
  ]

  const playLetterSound = (char: string, word: string) => {
    setSelectedLetter(char)
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utter = new SpeechSynthesisUtterance(`${char} ... ${word}`)
      utter.lang = 'ar-SA'
      utter.rate = 0.8
      window.speechSynthesis.speak(utter)
    }
  }

  const addStar = () => {
    setStarsCount(prev => prev + 1)
  }

  return (
    <div className="space-y-8" dir="rtl">
      {/* ─── Playful Top Banner ─── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-[2.5rem] p-8 text-white shadow-xl"
        style={{ background: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 40%, #fbbf24 100%)' }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-2xl -translate-y-12 translate-x-12 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-right">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md mb-3">
              <Sparkles className="w-4 h-4 text-yellow-200 animate-bounce" />
              <span className="text-xs font-black text-white">واحة الروضة والطفولة المبكرة 🎈</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black mb-2 tracking-tight">
              أهلاً بك يا بطلنا الصغير! 🌟
            </h2>
            <p className="text-white/90 text-sm font-bold max-w-lg leading-relaxed">
              هيا نلعب ونتعلم الحروف والأرقام والألوان وقصص القرآن الممتعة بابتسامة ونشاط!
            </p>
          </div>

          {/* Interactive Star Jar */}
          <motion.div
            whileHover={{ scale: 1.08, rotate: [0, -5, 5, 0] }}
            onClick={addStar}
            className="cursor-pointer bg-white/20 border-2 border-white/40 backdrop-blur-md rounded-3xl p-5 flex flex-col items-center justify-center min-w-[140px] shadow-lg"
          >
            <Star className="w-12 h-12 text-yellow-300 fill-yellow-300 animate-pulse" />
            <span className="text-3xl font-black mt-1">{starsCount}</span>
            <span className="text-[11px] font-black text-white/90">نجمة ذهبية ⭐</span>
            <span className="text-[9px] text-yellow-200 mt-1 font-bold">اضغط لجمع نجمة!</span>
          </motion.div>
        </div>
      </motion.div>

      {/* ─── 1. حديقة الحروف والأصوات ─── */}
      <div className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center text-xl">
              🔤
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900 dark:text-white">حديقة الحروف والأصوات التفاعلية</h3>
              <p className="text-xs text-gray-400">انقر على أي حرف لتسمع صوته وتتعرف على كلمته!</p>
            </div>
          </div>
          <span className="text-xs font-black text-rose-500 bg-rose-50 dark:bg-rose-950/30 px-3 py-1 rounded-full">
            استمع وتعلّم 🎧
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {LETTERS.map((l) => (
            <motion.button
              key={l.char}
              whileHover={{ scale: 1.06, y: -4 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => playLetterSound(l.char, l.word)}
              className={`p-4 rounded-3xl flex flex-col items-center justify-center border-2 transition-all cursor-pointer ${
                selectedLetter === l.char
                  ? 'border-rose-500 shadow-lg scale-105'
                  : 'border-gray-100 dark:border-white/5 hover:border-rose-300'
              }`}
              style={{ backgroundColor: `${l.color}12` }}
            >
              <span className="text-3xl mb-1">{l.emoji}</span>
              <span className="text-3xl font-black" style={{ color: l.color }}>{l.char}</span>
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 mt-1">{l.word}</span>
              <Volume2 className="w-4 h-4 mt-2 text-gray-400" />
            </motion.button>
          ))}
        </div>
      </div>

      {/* ─── 2. لعبة عد الأرقام التفاعلية ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center text-xl">
              🍎
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900 dark:text-white">لعبة عَدّ التفاحات المرحة</h3>
              <p className="text-xs text-gray-400">كم تفاحة نضع في سلتنا الجميلة؟</p>
            </div>
          </div>

          <div className="bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl p-6 text-center border border-amber-200 dark:border-amber-900/30">
            <div className="flex items-center justify-center gap-3 mb-4 min-h-[50px] flex-wrap">
              {Array.from({ length: appleCount }).map((_, i) => (
                <motion.span
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-4xl inline-block"
                >
                  🍎
                </motion.span>
              ))}
            </div>
            <p className="text-xl font-black text-amber-800 dark:text-amber-300 mb-4">
              العدد: {appleCount} تفاحات!
            </p>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setAppleCount(prev => Math.min(10, prev + 1))}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs flex items-center gap-1 shadow-md"
              >
                + تفاحة جديدة
              </button>
              <button
                onClick={() => setAppleCount(prev => Math.max(1, prev - 1))}
                className="px-5 py-2.5 rounded-xl bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 font-bold text-xs"
              >
                - أقل
              </button>
            </div>
          </div>
        </div>

        {/* ─── 3. قصص وسور قصيرة مسموعة ─── */}
        <div className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-xl">
              📖
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900 dark:text-white">قصار السور والقصص المصورة</h3>
              <p className="text-xs text-gray-400">استمع لآيات القرآن الكريم بأصوات طفولية عذبة</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {[
              { surah: 'سورة الفاتحة', verses: '7 آيات', color: '#10b981' },
              { surah: 'سورة الإخلاص', verses: '4 آيات', color: '#06b6d4' },
              { surah: 'سورة الفلق', verses: '5 آيات', color: '#6366f1' },
              { surah: 'سورة الناس', verses: '6 آيات', color: '#ec4899' },
            ].map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-white/5 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border border-gray-100 dark:border-white/5 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs text-white" style={{ backgroundColor: s.color }}>
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900 dark:text-white">{s.surah}</p>
                    <p className="text-[10px] text-gray-400">{s.verses}</p>
                  </div>
                </div>
                <button
                  onClick={() => alert(`تشغيل تلاوة تفاعلية لـ ${s.surah}`)}
                  className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 shadow-sm"
                >
                  <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
