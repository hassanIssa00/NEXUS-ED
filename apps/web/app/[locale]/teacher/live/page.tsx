'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Radio, Play, StopCircle, Users, Eye, Clock, Sparkles, Video } from 'lucide-react'
import type { LiveSessionItem } from '@/lib/nexusDataBridge'

export default function TeacherLivePage() {
  const [sessions, setSessions] = useState<LiveSessionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(45)
  const [saving, setSaving] = useState(false)

  const loadSessions = async () => {
    try {
      const { nexusBridge } = await import('@/lib/nexusDataBridge')
      setSessions(nexusBridge.getLiveSessions())
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    loadSessions()
    window.addEventListener('nexus:data-changed', loadSessions)
    return () => window.removeEventListener('nexus:data-changed', loadSessions)
  }, [])

  const handleStartLive = async () => {
    if (!title.trim()) return
    setSaving(true)
    try {
      const { nexusBridge } = await import('@/lib/nexusDataBridge')
      nexusBridge.createLiveSession({ title, description, durationMinutes, status: 'LIVE', hostName: 'د. إسماعيل عيسى', viewerCount: 0 })
      setTitle(''); setDescription('')
      setShowForm(false)
      await loadSessions()
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const liveSessions = sessions.filter(s => s.status === 'LIVE')
  const recorded = sessions.filter(s => s.status === 'RECORDED')

  return (
    <div className="space-y-8 pb-16" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#1d4ed8] via-[#2563eb] to-[#3B82F6] p-8 text-white shadow-[0_20px_60px_rgba(59,130,246,0.3)]">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-blue-300/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md mb-4">
              {liveSessions.length > 0
                ? <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1, repeat: Infinity }} className="w-2.5 h-2.5 rounded-full bg-red-500" />
                : <Sparkles className="w-3.5 h-3.5 text-yellow-300" />}
              <span className="text-xs font-bold text-blue-100">{liveSessions.length > 0 ? 'بث مباشر الآن 🔴' : 'مركز البث المباشر'}</span>
            </div>
            <h1 className="text-4xl font-black mb-2 tracking-tight">البث المباشر للحصص 📡</h1>
            <p className="text-blue-100 text-sm font-medium">ابدأ حصة مباشرة أو شارك تسجيلات الحصص السابقة</p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-red-500 hover:bg-red-600 font-black text-sm transition-colors shadow-lg shadow-red-500/40">
            <Radio className="w-4 h-4" />ابدأ بثاً مباشراً
          </button>
        </div>
      </motion.div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-2 border-red-200 dark:border-red-500/30 rounded-3xl p-7 space-y-4">
          <h3 className="font-black text-gray-900 dark:text-white text-lg flex items-center gap-2">
            <Radio className="w-5 h-5 text-red-500" />إعداد الحصة المباشرة
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-black text-gray-500 mb-2 block">عنوان الحصة *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="مثال: حصة مهارات المد والإملاء"
                className="w-full px-4 py-3 rounded-2xl border border-red-200 dark:border-red-500/30 bg-white dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/50" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-black text-gray-500 mb-2 block">وصف الحصة</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                placeholder="ملخص ما سيتم تناوله في هذه الحصة..."
                className="w-full px-4 py-3 rounded-2xl border border-red-200 dark:border-red-500/30 bg-white dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none resize-none" />
            </div>
            <div>
              <label className="text-xs font-black text-gray-500 mb-2 block">مدة الحصة</label>
              <select value={durationMinutes} onChange={e => setDurationMinutes(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-2xl border border-red-200 dark:border-red-500/30 bg-white dark:bg-white/5 text-sm text-gray-900 dark:text-white focus:outline-none">
                {[20, 30, 45, 60, 90].map(d => <option key={d} value={d}>{d} دقيقة</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleStartLive} disabled={saving || !title.trim()}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black shadow-lg shadow-red-500/30 disabled:opacity-50">
              {saving ? <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" /> : <><Radio className="w-4 h-4" />ابدأ البث الآن</>}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-3 rounded-2xl bg-gray-100 dark:bg-white/5 text-gray-600 font-bold text-sm">إلغاء</button>
          </div>
        </motion.div>
      )}

      {liveSessions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
            <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1, repeat: Infinity }}
              className="w-3 h-3 rounded-full bg-red-500" />
            يُبث الآن
          </h2>
          {liveSessions.map(s => (
            <div key={s.id} className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-2 border-red-300 dark:border-red-500/40 rounded-3xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                  <Radio className="w-8 h-8 text-red-500" />
                </div>
                <div className="flex-1">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-red-500 text-white text-xs font-black mb-1 animate-pulse">LIVE 🔴</span>
                  <h3 className="font-black text-gray-900 dark:text-white text-lg">{s.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{s.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="flex items-center gap-1 text-xs text-gray-500"><Users className="w-3 h-3" />{s.viewerCount} مشاهد</span>
                    <span className="flex items-center gap-1 text-xs text-gray-500"><Clock className="w-3 h-3" />{s.durationMinutes} دقيقة</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
          <Video className="w-5 h-5 text-blue-500" />التسجيلات السابقة
        </h2>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
          </div>
        ) : recorded.length === 0 ? (
          <div className="text-center py-8 text-gray-500 font-bold">لا توجد تسجيلات بعد</div>
        ) : (
          recorded.map((s, i) => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              whileHover={{ y: -2 }}
              className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                  <Video className="w-7 h-7 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-gray-900 dark:text-white">{s.title}</h3>
                  <p className="text-sm text-gray-500">{s.description}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-xs text-gray-400"><Eye className="w-3 h-3" />{s.viewerCount} مشاهدة</span>
                    <span className="flex items-center gap-1 text-xs text-gray-400"><Clock className="w-3 h-3" />{s.durationMinutes} دقيقة</span>
                  </div>
                </div>
                {s.recordingUrl && (
                  <a href={s.recordingUrl} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 font-bold text-sm">
                    <Play className="w-3.5 h-3.5" />عرض
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
