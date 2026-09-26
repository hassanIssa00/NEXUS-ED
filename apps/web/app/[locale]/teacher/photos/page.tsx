'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ExternalLink, Calendar, Sparkles, Save, CheckCircle2, Plus } from 'lucide-react'
import type { ClassEventItem } from '@/lib/nexusDataBridge'

const CATEGORIES = [
  { key: 'party', label: 'حفلات وتكريم', icon: '🎉' },
  { key: 'trip', label: 'رحلات مدرسية', icon: '🚌' },
  { key: 'activity', label: 'أنشطة صفية', icon: '🎨' },
  { key: 'competition', label: 'مسابقات وتفوق', icon: '🏆' },
  { key: 'open_day', label: 'يوم مفتوح', icon: '🌤️' },
  { key: 'other', label: 'فعاليات عامة', icon: '📌' },
]

export default function TeacherPhotosPage() {
  const [events, setEvents] = useState<ClassEventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<ClassEventItem | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<ClassEventItem['category']>('party')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [driveUrl, setDriveUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const loadEvents = async () => {
    try {
      const { nexusBridge } = await import('@/lib/nexusDataBridge')
      setEvents(nexusBridge.getClassEvents())
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    loadEvents()
    window.addEventListener('nexus:data-changed', loadEvents)
    return () => window.removeEventListener('nexus:data-changed', loadEvents)
  }, [])

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    try {
      const { nexusBridge } = await import('@/lib/nexusDataBridge')
      const cfg = CATEGORIES.find(c => c.key === category)
      nexusBridge.saveClassEvent({ title, category, date, description, driveUrl: driveUrl || undefined, categoryLabel: cfg?.label || category })
      setTitle(''); setCategory('party'); setDescription(''); setDriveUrl('')
      setDate(new Date().toISOString().split('T')[0])
      setSaved(true)
      setTimeout(() => { setSaved(false); setShowForm(false) }, 1500)
      await loadEvents()
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const filtered = filter === 'all' ? events : events.filter(e => e.category === filter)
  const catMap = Object.fromEntries(CATEGORIES.map(c => [c.key, c]))

  return (
    <div className="space-y-8 pb-16" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#1d4ed8] via-[#2563eb] to-[#3B82F6] p-8 text-white shadow-[0_20px_60px_rgba(59,130,246,0.3)]">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-blue-300/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md mb-4">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
              <span className="text-xs font-bold text-blue-100">توثيق الفصل</span>
            </div>
            <h1 className="text-4xl font-black mb-2 tracking-tight">معرض الأنشطة والفعاليات 📸</h1>
            <p className="text-blue-100 text-sm font-medium">أرشفة لحظات التميز والإبداع بفصل د. إسماعيل عيسى</p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 border border-white/20 font-bold text-sm transition-colors backdrop-blur-md">
            <Plus className="w-4 h-4" />إضافة فعالية
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl p-7 shadow-sm">
            <h3 className="font-black text-gray-900 dark:text-white mb-5">إضافة فعالية أو حدث جديد</h3>
            <div className="grid sm:grid-cols-2 gap-4 mb-5">
              <div className="sm:col-span-2">
                <label className="text-xs font-black text-gray-500 mb-2 block">عنوان الفعالية *</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="حفل تكريم الطلاب المتميزين في القراءة"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
              <div>
                <label className="text-xs font-black text-gray-500 mb-2 block">نوع الفعالية</label>
                <select value={category} onChange={e => setCategory(e.target.value as ClassEventItem['category'])}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                  {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-black text-gray-500 mb-2 block">تاريخ الفعالية</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-black text-gray-500 mb-2 block">وصف الفعالية</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                  placeholder="وصف موجز للفعالية وما تم فيها..."
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none resize-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-black text-gray-500 mb-2 block">رابط ألبوم Drive (اختياري)</label>
                <input value={driveUrl} onChange={e => setDriveUrl(e.target.value)} placeholder="https://drive.google.com/..." dir="ltr"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleSave} disabled={saving || !title.trim()}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-black disabled:opacity-50">
                {saving ? <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" /> : saved ? <><CheckCircle2 className="w-4 h-4" />تم!</> : <><Save className="w-4 h-4" />حفظ</>}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-3 rounded-2xl bg-gray-100 dark:bg-white/5 text-gray-600 font-bold text-sm">إلغاء</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {[{ key: 'all', label: 'الكل', icon: '🌟' }, ...CATEGORIES].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl font-bold text-sm whitespace-nowrap transition-all flex-shrink-0 ${
              filter === f.key ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-white/80 dark:bg-[#1e1e2d]/80 text-gray-600 dark:text-gray-300 hover:bg-blue-50'
            }`}>
            <span>{f.icon}</span>{f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((event, i) => {
            const cfg = catMap[event.category] || CATEGORIES[5]
            return (
              <motion.div key={event.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                whileHover={{ y: -4, scale: 1.02 }} onClick={() => setSelectedEvent(event)}
                className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl shadow-sm overflow-hidden cursor-pointer group">
                <div className="relative h-44 overflow-hidden">
                  {event.coverImage
                    ? <img src={event.coverImage} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    : <div className="w-full h-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-5xl">{cfg.icon}</div>
                  }
                  <div className="absolute top-3 right-3">
                    <span className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm text-white text-xs font-bold">{cfg.icon} {cfg.label}</span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-black text-gray-900 dark:text-white text-sm line-clamp-2">{event.title}</h3>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(event.date).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      <AnimatePresence>
        {selectedEvent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedEvent(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-[#1e1e2d] rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-7">
              <div className="flex items-start justify-between gap-4 mb-4">
                <h2 className="font-black text-xl text-gray-900 dark:text-white">{selectedEvent.title}</h2>
                <button onClick={() => setSelectedEvent(null)}
                  className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center hover:bg-rose-100 text-gray-500 hover:text-rose-500 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {selectedEvent.description && <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{selectedEvent.description}</p>}
              {selectedEvent.driveUrl && (
                <a href={selectedEvent.driveUrl} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 font-bold text-sm mb-4">
                  <ExternalLink className="w-4 h-4" />فتح ألبوم Drive
                </a>
              )}
              {selectedEvent.images && selectedEvent.images.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {selectedEvent.images.map((img, idx) => (
                    <img key={idx} src={img} alt={`صورة ${idx + 1}`} className="w-full aspect-square object-cover rounded-2xl" />
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
