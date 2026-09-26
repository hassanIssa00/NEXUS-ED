'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Video, Plus, Save, Calendar, Clock, Sparkles, CheckCircle2, ExternalLink, Trash2 } from 'lucide-react'
import type { ClassMeetingItem } from '@/lib/nexusDataBridge'

export default function TeacherMeetingsPage() {
  const [meetings, setMeetings] = useState<ClassMeetingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [meetingUrl, setMeetingUrl] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [duration, setDuration] = useState(45)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const loadMeetings = async () => {
    try {
      const { nexusBridge } = await import('@/lib/nexusDataBridge')
      setMeetings(nexusBridge.getMeetings())
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    loadMeetings()
    window.addEventListener('nexus:data-changed', loadMeetings)
    return () => window.removeEventListener('nexus:data-changed', loadMeetings)
  }, [])

  const handleSave = async () => {
    if (!title.trim() || !meetingUrl.trim() || !scheduledAt) return
    setSaving(true)
    try {
      const { nexusBridge } = await import('@/lib/nexusDataBridge')
      nexusBridge.createMeeting({ title, meetingUrl, scheduledAt, duration, notes: notes || undefined, hostName: 'د. إسماعيل عيسى' })
      setTitle(''); setMeetingUrl(''); setScheduledAt(''); setNotes('')
      setSaved(true)
      setTimeout(() => { setSaved(false); setShowForm(false) }, 1500)
      await loadMeetings()
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    try {
      const { nexusBridge } = await import('@/lib/nexusDataBridge')
      nexusBridge.deleteMeeting(id)
      await loadMeetings()
    } catch (e) { console.error(e) }
  }

  const now = new Date()
  const upcoming = meetings.filter(m => new Date(m.scheduledAt) > now)
  const past = meetings.filter(m => new Date(m.scheduledAt) <= now)

  return (
    <div className="space-y-8 pb-16" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#1d4ed8] via-[#2563eb] to-[#3B82F6] p-8 text-white shadow-[0_20px_60px_rgba(59,130,246,0.3)]">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-blue-300/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md mb-4">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
              <span className="text-xs font-bold text-blue-100">إدارة اللقاءات</span>
            </div>
            <h1 className="text-4xl font-black mb-2 tracking-tight">لقاءات أولياء الأمور 📹</h1>
            <p className="text-blue-100 text-sm font-medium">جدولة وإرسال روابط الاجتماعات لأولياء الأمور</p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 border border-white/20 font-bold text-sm transition-colors backdrop-blur-md">
            <Plus className="w-4 h-4" />اجتماع جديد
          </button>
        </div>
      </motion.div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl p-7 shadow-sm space-y-4">
          <h3 className="font-black text-gray-900 dark:text-white text-lg">إعداد اجتماع فيديو جديد</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-black text-gray-500 mb-2 block">عنوان أو موضوع الاجتماع *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="لقاء أولياء الأمور الدوري — متابعة الشهر الثاني"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-black text-gray-500 mb-2 block">رابط الدخول (Google Meet / Zoom)</label>
              <input value={meetingUrl} onChange={e => setMeetingUrl(e.target.value)} placeholder="https://meet.google.com/..." dir="ltr"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
            </div>
            <div>
              <label className="text-xs font-black text-gray-500 mb-2 block">تاريخ ووقت الاجتماع *</label>
              <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
            </div>
            <div>
              <label className="text-xs font-black text-gray-500 mb-2 block">المدة المتوقعة</label>
              <select value={duration} onChange={e => setDuration(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white focus:outline-none">
                {[20, 30, 45, 60, 90].map(d => <option key={d} value={d}>{d} دقيقة</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-black text-gray-500 mb-2 block">ملاحظات وأجندة (اختياري)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                placeholder="محاور الاجتماع..."
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none resize-none" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving || !title.trim() || !meetingUrl.trim() || !scheduledAt}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-black disabled:opacity-50">
              {saving ? <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" /> : saved ? <><CheckCircle2 className="w-4 h-4" />تم!</> : <><Save className="w-4 h-4" />حفظ</>}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-3 rounded-2xl bg-gray-100 dark:bg-white/5 text-gray-600 font-bold text-sm">إلغاء</button>
          </div>
        </motion.div>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-black text-gray-900 dark:text-white">الاجتماعات القادمة</h2>
          {upcoming.map((m, i) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              whileHover={{ y: -2 }}
              className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-500/30 rounded-3xl p-6">
              <div className="flex flex-wrap items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                  <Video className="w-7 h-7 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-gray-900 dark:text-white">{m.title}</h3>
                  <div className="flex flex-wrap gap-3 mt-1">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="w-3 h-3 text-blue-500" />
                      {new Date(m.scheduledAt).toLocaleString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-500"><Clock className="w-3 h-3 text-blue-500" />{m.duration} دقيقة</span>
                  </div>
                  {m.notes && <p className="text-xs text-gray-500 mt-1">📝 {m.notes}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a href={m.meetingUrl} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm">
                    <ExternalLink className="w-3.5 h-3.5" />فتح
                  </a>
                  <button onClick={() => handleDelete(m.id)}
                    className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 flex items-center justify-center">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-black text-gray-900 dark:text-white opacity-60">الاجتماعات المنتهية</h2>
          {past.map(m => (
            <div key={m.id} className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl p-5 opacity-60 flex items-center gap-4">
              <Video className="w-5 h-5 text-gray-400" />
              <div className="flex-1">
                <p className="font-bold text-sm text-gray-700 dark:text-gray-300">{m.title}</p>
                <p className="text-xs text-gray-400">{new Date(m.scheduledAt).toLocaleString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' })} ✅</p>
              </div>
              <button onClick={() => handleDelete(m.id)} className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-400 flex items-center justify-center">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && meetings.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="text-6xl">📹</div>
          <p className="text-gray-500 font-bold">لا توجد اجتماعات بعد — أضف أول اجتماع!</p>
        </div>
      )}
    </div>
  )
}
