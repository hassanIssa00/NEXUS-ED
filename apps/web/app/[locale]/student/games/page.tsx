'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Gamepad2, Trophy, Zap, Star, Sparkles, ExternalLink,
  Flame, Crown, Award, Play, CheckCircle2, Target
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const GAMES = [
  {
    id: 'spelling',
    title: 'تحدي الإملاء السريع ✏️',
    emoji: '✏️',
    desc: 'تدرب على كتابة الكلمات وقواعد الإملاء وحروف المد بطريقة ممتعة وتنافسية',
    gradient: 'from-blue-500 to-indigo-600',
    lightBg: 'bg-blue-50 dark:bg-blue-500/10',
    textColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-blue-200 dark:border-blue-500/30',
    subject: 'اللغة العربية',
    difficulty: 'سهل',
    xp: 50,
    players: 28,
    link: '/student/games/spelling',
    badge: '🏅',
  },
  {
    id: 'math-dash',
    title: 'سباق الحساب الذهني 🔢',
    emoji: '🔢',
    desc: 'تحدي الجمع والطرح السريع وحل العمليات الحسابية قبل انتهاء العداد',
    gradient: 'from-amber-500 to-orange-600',
    lightBg: 'bg-amber-50 dark:bg-amber-500/10',
    textColor: 'text-amber-600 dark:text-amber-400',
    borderColor: 'border-amber-200 dark:border-amber-500/30',
    subject: 'الرياضيات',
    difficulty: 'متوسط',
    xp: 75,
    players: 34,
    link: '/student/games/math',
    badge: '⭐',
  },
  {
    id: 'quran-memorize',
    title: 'ترتيل وتثبيت الآيات 📿',
    emoji: '📿',
    desc: 'تطابق الآيات الكريمة وترتيب سور جزء عم المقررة لفصل د. إسماعيل',
    gradient: 'from-emerald-500 to-green-600',
    lightBg: 'bg-emerald-50 dark:bg-emerald-500/10',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    borderColor: 'border-emerald-200 dark:border-emerald-500/30',
    subject: 'القرآن الكريم',
    difficulty: 'سهل',
    xp: 100,
    players: 42,
    link: '/student/games/quran',
    badge: '🌟',
  },
  {
    id: 'science-explorer',
    title: 'مستكشف الطبيعة والعلوم 🔬',
    emoji: '🔬',
    desc: 'استكشف عالم الحيوانات والنباتات والحواس الخمس عبر تجارب مصغرة شيقة',
    gradient: 'from-teal-500 to-cyan-600',
    lightBg: 'bg-teal-50 dark:bg-teal-500/10',
    textColor: 'text-teal-600 dark:text-teal-400',
    borderColor: 'border-teal-200 dark:border-teal-500/30',
    subject: 'العلوم',
    difficulty: 'متوسط',
    xp: 60,
    players: 22,
    link: '/student/games/science',
    badge: '🔬',
  },
  {
    id: 'crossword',
    title: 'الكلمات المتقاطعة الذكية 🧩',
    emoji: '🧩',
    desc: 'ألغاز لغوية شيقة لتنمية المفردات العربية وربط الحروف ببعضها',
    gradient: 'from-purple-500 to-violet-600',
    lightBg: 'bg-purple-50 dark:bg-purple-500/10',
    textColor: 'text-purple-600 dark:text-purple-400',
    borderColor: 'border-purple-200 dark:border-purple-500/30',
    subject: 'اللغة العربية',
    difficulty: 'صعب',
    xp: 120,
    players: 18,
    link: '/student/games/crossword',
    badge: '🧩',
  },
  {
    id: 'million',
    title: 'مسابقة تحدي المليون الكبرى 🏆',
    emoji: '🏆',
    desc: 'المسابقة التفاعلية الكبرى لمنصة نكسس — أجب عن 15 سؤالاً واربح المليون نقطة والشهادة!',
    gradient: 'from-rose-500 via-pink-500 to-fuchsia-600',
    lightBg: 'bg-rose-50 dark:bg-rose-500/10',
    textColor: 'text-rose-600 dark:text-rose-400',
    borderColor: 'border-rose-200 dark:border-rose-500/30',
    subject: 'معلومات عامة وثقافة',
    difficulty: 'تنافسي',
    xp: 500,
    players: 64,
    link: '/student/million',
    badge: '👑',
    featured: true,
  },
]

export default function StudentGamesPage() {
  const [stats, setStats] = useState({ completed: 5, points: 1450, rank: '#2', streak: 4 })

  useEffect(() => {
    const load = async () => {
      try {
        const { nexusBridge } = await import('@/lib/nexusDataBridge')
        let linkedStudentId = 'cls-std-2'
        try {
          const stored = localStorage.getItem('nexus_user')
          if (stored) {
            const acc = JSON.parse(stored)
            if (acc.linkedStudentId) linkedStudentId = acc.linkedStudentId
          }
        } catch {}

        const certs = nexusBridge.getCertificates(linkedStudentId)
        const subs = nexusBridge.getHomeworkSubmissions().filter((s: any) => s.studentId === linkedStudentId)
        const student = nexusBridge.getStudentById(linkedStudentId)

        const points = (certs.length * 400) + (subs.length * 150) + ((student?.averageGrade || 90) * 10)
        setStats({
          completed: Math.max(3, subs.length),
          points,
          rank: student?.status === 'excellent' ? '#1' : '#2',
          streak: 5,
        })
      } catch (e) {
        console.error('Games page load error:', e)
      }
    }
    load()
  }, [])

  return (
    <div className="space-y-8 pb-16" dir="rtl">
      {/* ── HERO BANNER ── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#5b21b6] via-[#7c3aed] to-[#ec4899] p-8 md:p-10 text-white shadow-[0_24px_70px_rgba(124,58,237,0.35)]">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
            className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
          <motion.div animate={{ rotate: -360 }} transition={{ duration: 55, repeat: Infinity, ease: 'linear' }}
            className="absolute -bottom-24 -left-16 w-80 h-80 rounded-full bg-pink-400/20 blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-4 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
            <span className="text-xs font-bold text-purple-100">واحة الألعاب والأنشطة التفاعلية</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black mb-3 tracking-tight">الألعاب التعليمية 🎮</h1>
          <p className="text-purple-100 text-sm md:text-base max-w-2xl font-medium leading-relaxed">
            العب وتعلم واكسب نقاط الخبرة والأوسمة! صُممت الألعاب خصيصاً لمقررات الصف الأول الابتدائي.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {[
              { label: 'ألعاب مكتملة', value: stats.completed },
              { label: 'رصيد النقاط (XP)', value: stats.points.toLocaleString('ar-SA') },
              { label: 'الترتيب في الفصل', value: stats.rank },
              { label: 'أيام الحماس المتتالية', value: `${stats.streak} أيام 🔥` },
            ].map((s, i) => (
              <div key={i} className="bg-white/10 border border-white/15 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-sm">
                <p className="text-[10px] text-purple-200 font-bold uppercase">{s.label}</p>
                <p className="text-lg font-black">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── FEATURED: CHALLENGE OF THE MILLION ── */}
      <motion.a
        href="/student/million"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        whileHover={{ y: -4, scale: 1.01 }}
        className="block bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-600 rounded-[2rem] p-7 md:p-8 text-white shadow-[0_20px_50px_rgba(244,63,94,0.35)] cursor-pointer relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center text-4xl flex-shrink-0 shadow-lg border border-white/30">
              🏆
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-black mb-2 shadow-sm">
                <Crown className="w-3.5 h-3.5 text-yellow-300" />
                المسابقة الرسمية الكبرى
              </div>
              <h2 className="text-2xl md:text-3xl font-black">مسابقة تحدي المليون 🌟</h2>
              <p className="text-pink-100 text-sm mt-1 max-w-xl">
                15 سؤالاً تدريجياً في مقررات القرآن واللغة والرياضيات والعلوم مع وسائل المساعدة. اربح المليون نقطة!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/15 px-4 py-2 rounded-2xl text-center backdrop-blur-md">
              <span className="text-[10px] text-pink-200 block font-bold">الجائزة</span>
              <span className="text-base font-black">+500 XP</span>
            </div>
            <div className="px-5 py-3 rounded-2xl bg-white text-rose-600 font-black text-xs shadow-lg flex items-center gap-2 hover:bg-rose-50 transition-colors">
              <Play className="w-4 h-4 fill-current" />
              ابدأ التحدي الآن
            </div>
          </div>
        </div>
      </motion.a>

      {/* ── GAMES GRID ── */}
      <div>
        <h2 className="text-xl font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-purple-600" />
          ألعاب التعلم الذاتي والتدريب
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {GAMES.filter(g => !g.featured).map((game, i) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.06 }}
              whileHover={{ y: -6, scale: 1.02 }}
              className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${game.gradient} flex items-center justify-center text-3xl shadow-md text-white group-hover:scale-110 transition-transform`}>
                    {game.emoji}
                  </div>
                  <Badge className={`rounded-xl border-0 font-bold text-xs ${game.lightBg} ${game.textColor}`}>
                    {game.subject}
                  </Badge>
                </div>

                <h3 className="font-black text-gray-900 dark:text-white text-base mb-1.5">{game.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed font-medium mb-4">{game.desc}</p>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-500 font-bold">
                    {game.difficulty}
                  </span>
                  <span className="text-[11px] font-black text-amber-600 flex items-center gap-0.5">
                    <Zap className="w-3 h-3 text-amber-500 fill-current" />
                    +{game.xp} XP
                  </span>
                </div>

                <a
                  href={game.link}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${game.lightBg} ${game.textColor} hover:scale-105`}
                >
                  <Play className="w-3 h-3 fill-current" />
                  العب الآن
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── HOW XP WORKS CARD ── */}
      <div className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-[2rem] p-6 md:p-8 shadow-sm">
        <h3 className="font-black text-gray-900 dark:text-white text-base mb-4 flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500 fill-current" />
          كيف تعمل النقاط والأوسمة في منصة نكسس EDU؟
        </h3>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { emoji: '🎮', title: '1. خض التحديات', desc: 'اختر اللعبة المناسبة للمادة التي تذاكرها وابدأ الجولة' },
            { emoji: '⚡', title: '2. اجمع نقاط XP', desc: 'كل إجابة صحيحة تمنحك نقاط خبرة فورية تُسجّل في ملفك' },
            { emoji: '🏅', title: '3. احصل على أوسمة وشهادات', desc: 'عند وصولك لنقاط محددة يمنحك د. إسماعيل وسام تميز معتمد' },
          ].map((item, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 text-center">
              <div className="text-3xl mb-2">{item.emoji}</div>
              <h4 className="font-black text-xs text-gray-900 dark:text-white mb-1">{item.title}</h4>
              <p className="text-[11px] text-gray-500 font-medium leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
