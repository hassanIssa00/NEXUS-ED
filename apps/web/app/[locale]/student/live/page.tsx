'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Radio, Play, Clock, Users, Eye, Sparkles, Video, CheckCircle2 } from 'lucide-react'
import type { LiveSessionItem } from '@/lib/nexusDataBridge'

export default function StudentLivePage() {
  const [sessions, setSessions] = useState<LiveSessionItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const { nexusBridge } = await import('@/lib/nexusDataBridge')
        setSessions(nexusBridge.getLiveSessions())
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
    window.addEventListener('nexus:data-changed', load as any)
    return () => window.removeEventListener('nexus:data-changed', load as any)
  }, [])

  const liveSessions = sessions.filter(s => s.status === 'LIVE')
  const recorded = sessions.filter(s => s.status === 'RECORDED')

  return (
    <div className="space-y-8 pb-16" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4f46e5] p-8 text-white shadow-[0_20px_60px_rgba(79,70,229,0.35)]">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-indigo-300/10 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md mb-4">
            {liveSessions.length > 0
              ? <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-2 h-2 rounded-full bg-red-500" />
              : <Sparkles className="w-3.5 h-3.5 text-yellow-300" />}
            <span className="text-xs font-bold text-indigo-100">البث المباشر</span>
          </div>
          <h1 className="text-4xl font-black mb-2 tracking-tight">الحصص المباشرة والمسجلة 📡</h1>
          <p className="text-indigo-100 text-sm font-medium">شارك في حصص د. إسماعيل عيسى المباشرة وتابع التسجيلات</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <div className="bg-white/10 border border-white/15 backdrop-blur-md px-4 py-2.5 rounded-2xl">
              <p className="text-[10px] text-indigo-200 font-medium">بث مباشر الآن</p>
              <p className="text-lg font-black text-red-400">{liveSessions.length > 0 ? 'مباشر 🔴' : 'لا يوجد'}</p>
            </div>
            <div className="bg-white/10 border border-white/15 backdrop-blur-md px-4 py-2.5 rounded-2xl">
              <p className="text-[10px] text-indigo-200 font-medium">حصص مسجلة</p>
              <p className="text-lg font-black">{recorded.length}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {liveSessions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
            <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1, repeat: Infinity }}
              className="w-3 h-3 rounded-full bg-red-500" />
            يُبث الآن
          </h2>
          {liveSessions.map(session => (
            <motion.div key={session.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-2 border-red-200 dark:border-red-500/30 rounded-3xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center flex-shrink-0">
                  <Radio className="w-8 h-8 text-red-500" />
                </div>
                <div className="flex-1">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-red-500 text-white text-xs font-black mb-1 animate-pulse">LIVE 🔴</span>
                  <h3 className="font-black text-gray-900 dark:text-white text-lg">{session.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{session.description}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <span className="flex items-center gap-1 text-xs text-gray-500"><Users className="w-3.5 h-3.5" />{session.viewerCount} مشاهد</span>
                    <span className="flex items-center gap-1 text-xs text-gray-500"><Clock className="w-3.5 h-3.5" />{session.durationMinutes} دقيقة</span>
                  </div>
                </div>
                <a href="#" className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black text-sm transition-colors flex-shrink-0 shadow-lg shadow-red-500/30">
                  <Play className="w-4 h-4" />انضم الآن
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
          <Video className="w-5 h-5 text-indigo-500" />الحصص المسجلة
        </h2>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
          </div>
        ) : recorded.length === 0 ? (
          <div className="text-center py-12 text-gray-500 font-bold">لا توجد حصص مسجلة بعد</div>
        ) : (
          recorded.map((session, i) => (
            <motion.div key={session.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              whileHover={{ y: -2 }}
              className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-500/10 flex items-center justify-center">
                    <Video className="w-7 h-7 text-indigo-500" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-gray-900 dark:text-white">{session.title}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{session.description}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="flex items-center gap-1 text-xs text-gray-400"><Eye className="w-3 h-3" />{session.viewerCount} مشاهدة</span>
                    <span className="flex items-center gap-1 text-xs text-gray-400"><Clock className="w-3 h-3" />{session.durationMinutes} دقيقة</span>
                  </div>
                </div>
                {session.recordingUrl && (
                  <a href={session.recordingUrl} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-sm hover:bg-indigo-100 transition-colors flex-shrink-0">
                    <Play className="w-4 h-4" />مشاهدة
                  </a>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
