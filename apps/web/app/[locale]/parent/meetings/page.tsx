'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Video, Calendar, Clock, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react'
import type { ClassMeetingItem } from '@/lib/nexusDataBridge'

export default function ParentMeetingsPage() {
  const [meetings, setMeetings] = useState<ClassMeetingItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const { nexusBridge } = await import('@/lib/nexusDataBridge')
        setMeetings(nexusBridge.getMeetings())
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
    window.addEventListener('nexus:data-changed', load as any)
    return () => window.removeEventListener('nexus:data-changed', load as any)
  }, [])

  const now = new Date()
  const upcoming = meetings.filter(m => new Date(m.scheduledAt) > now)
  const past = meetings.filter(m => new Date(m.scheduledAt) <= now)

  const getCountdown = (scheduledAt: string) => {
    const diff = new Date(scheduledAt).getTime() - now.getTime()
    if (diff <= 0) return null
    const days = Math.floor(diff / 86400000)
    const hours = Math.floor((diff % 86400000) / 3600000)
    const mins = Math.floor((diff % 3600000) / 60000)
    if (days > 0) return `بعد ${days} يوم و${hours} ساعة`
    if (hours > 0) return `بعد ${hours} ساعة و${mins} دقيقة`
    return `بعد ${mins} دقيقة`
  }

  return (
    <div className="space-y-8 pb-16" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#b45309] via-[#d97706] to-[#F59E0B] p-8 text-white shadow-[0_20px_60px_rgba(245,158,11,0.3)]">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-amber-300/20 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md mb-4">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
            <span className="text-xs font-bold text-amber-100">لقاءات أولياء الأمور</span>
          </div>
          <h1 className="text-4xl font-black mb-2 tracking-tight">لقاءات الفيديو مع المعلم 📹</h1>
          <p className="text-amber-100 text-sm font-medium">اجتماعاتك مع د. إسماعيل عيسى لمتابعة تقدم أبنائك</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <div className="bg-white/10 border border-white/15 backdrop-blur-md px-4 py-2.5 rounded-2xl">
              <p className="text-[10px] text-amber-200 font-medium">لقاءات قادمة</p>
              <p className="text-lg font-black text-yellow-300">{upcoming.length}</p>
            </div>
            <div className="bg-white/10 border border-white/15 backdrop-blur-md px-4 py-2.5 rounded-2xl">
              <p className="text-[10px] text-amber-200 font-medium">لقاءات منتهية</p>
              <p className="text-lg font-black">{past.length}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {upcoming.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />اللقاءات القادمة
          </h2>
          {upcoming.map((m, i) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              whileHover={{ y: -2 }}
              className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-2 border-amber-200 dark:border-amber-500/30 rounded-3xl p-6">
              <div className="flex flex-wrap items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Video className="w-7 h-7 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-gray-900 dark:text-white text-base">{m.title}</h3>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
                      <Calendar className="w-3.5 h-3.5 text-amber-500" />
                      {new Date(m.scheduledAt).toLocaleString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />{m.duration} دقيقة
                    </span>
                  </div>
                  {getCountdown(m.scheduledAt) && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold">
                      ⏱️ {getCountdown(m.scheduledAt)}
                    </div>
                  )}
                  {m.notes && <p className="text-xs text-gray-500 mt-2">📝 {m.notes}</p>}
                </div>
                <a href={m.meetingUrl} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm transition-colors shadow-lg shadow-amber-500/30 flex-shrink-0">
                  <Video className="w-4 h-4" />انضم للغرفة
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />اللقاءات المنتهية
          </h2>
          {past.map((m, i) => (
            <div key={m.id} className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl p-5 shadow-sm opacity-70">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                  <Video className="w-6 h-6 text-gray-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-gray-700 dark:text-gray-300">{m.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(m.scheduledAt).toLocaleString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' })} • {m.duration} دقيقة
                  </p>
                  <span className="text-xs text-emerald-600 font-bold">✅ منتهي</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
        </div>
      )}
      {!loading && meetings.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center text-4xl">📹</div>
          <p className="text-gray-500 font-bold">لا توجد لقاءات مجدولة بعد</p>
        </div>
      )}
    </div>
  )
}
