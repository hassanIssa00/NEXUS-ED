'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Video, Users, Clock, X, Radio } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { useLocale } from 'next-intl'

export function LiveClassBanner() {
  const isEnglish = useLocale() === 'en'
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: -20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-5 text-white shadow-xl shadow-emerald-500/20">
        <div className="absolute inset-0 pointer-events-none">
          <motion.div animate={{ x: [0, 40, 0], opacity: [0.1, 0.2, 0.1] }} transition={{ duration: 4, repeat: Infinity }}
            className="absolute top-0 right-0 w-48 h-48 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center border border-white/20 backdrop-blur-sm">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(248,113,113,0.8)]" />
                <p className="font-black text-sm">{isEnglish ? 'Math class · Grade 10 (Live)' : 'فصل الرياضيات - الصف 10 (مباشر)'}</p>
              </div>
              <p className="text-emerald-100 text-xs flex items-center gap-3">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {isEnglish ? '28 students online' : '28 طالب متصل'}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {isEnglish ? 'Started 15 minutes ago' : 'بدأ منذ 15 دقيقة'}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/teacher/lessons">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 bg-white text-emerald-700 px-4 py-2 rounded-xl font-bold text-sm shadow-lg">
                <Video className="w-4 h-4" /> {isEnglish ? 'Join now' : 'انضم الآن'}
              </motion.button>
            </Link>
            <button onClick={() => setDismissed(true)} className="w-8 h-8 bg-black/20 rounded-full flex items-center justify-center hover:bg-black/30 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
