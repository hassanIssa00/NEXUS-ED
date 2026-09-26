'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ExternalLink, Calendar, Sparkles, Image as ImageIcon } from 'lucide-react'
import type { ClassEventItem } from '@/lib/nexusDataBridge'

const CATEGORY_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  party: { label: 'حفلات وتكريم', icon: '🎉', color: 'from-pink-500 to-rose-500' },
  trip: { label: 'رحلات مدرسية', icon: '🚌', color: 'from-blue-500 to-cyan-500' },
  activity: { label: 'أنشطة صفية', icon: '🎨', color: 'from-purple-500 to-violet-500' },
  competition: { label: 'مسابقات وتفوق', icon: '🏆', color: 'from-amber-500 to-yellow-500' },
  open_day: { label: 'يوم مفتوح', icon: '🌤️', color: 'from-emerald-500 to-teal-500' },
  other: { label: 'فعاليات عامة', icon: '📌', color: 'from-slate-500 to-gray-500' },
}

export default function StudentPhotosPage() {
  const [events, setEvents] = useState<ClassEventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<ClassEventItem | null>(null)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    const load = async () => {
      try {
        const { nexusBridge } = await import('@/lib/nexusDataBridge')
        setEvents(nexusBridge.getClassEvents())
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

  const filtered = filter === 'all' ? events : events.filter(e => e.category === filter)

  return (
    <div className="space-y-8 pb-16" dir="rtl">
      {/* HERO */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0d9488] via-[#0891b2] to-[#00D1B2] p-8 text-white shadow-[0_20px_60px_rgba(0,209,178,0.3)]">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
            className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-teal-300/20 blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md mb-4">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
            <span className="text-xs font-bold text-teal-100">ذاكرتنا المصورة</span>
          </div>
          <h1 className="text-4xl font-black mb-2 tracking-tight">معرض الأنشطة والفعاليات 📸</h1>
          <p className="text-teal-100 text-sm font-medium">توثيق لحظات التميز والإبداع بفصل د. إسماعيل عيسى</p>
          <div className="mt-5 flex flex-wrap gap-3">
            {[{ label: 'إجمالي الفعاليات', value: events.length }, { label: 'الصور المرفوعة', value: events.reduce((acc, e) => acc + (e.images?.length || 1), 0) }].map((s, i) => (
              <div key={i} className="bg-white/10 border border-white/15 backdrop-blur-md px-4 py-2.5 rounded-2xl">
                <p className="text-[10px] text-teal-200 font-medium leading-none">{s.label}</p>
                <p className="text-lg font-black leading-tight">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* FILTERS */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[{ key: 'all', label: 'الكل', icon: '🌟' }, ...Object.entries(CATEGORY_CONFIG).map(([k, v]) => ({ key: k, label: v.label, icon: v.icon }))].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl font-bold text-sm whitespace-nowrap transition-all flex-shrink-0 ${
              filter === f.key
                ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30'
                : 'bg-white/80 dark:bg-[#1e1e2d]/80 text-gray-600 dark:text-gray-300 hover:bg-teal-50 dark:hover:bg-teal-500/10'
            }`}>
            <span>{f.icon}</span>{f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-teal-500/20 border-t-teal-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-20 h-20 rounded-full bg-teal-100 dark:bg-teal-500/10 flex items-center justify-center text-4xl">📷</div>
          <p className="text-gray-500 font-bold">لا توجد فعاليات في هذه الفئة بعد</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((event, i) => {
            const cfg = CATEGORY_CONFIG[event.category] || CATEGORY_CONFIG.other
            return (
              <motion.div key={event.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                whileHover={{ y: -4, scale: 1.02 }} onClick={() => setSelectedEvent(event)}
                className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl shadow-sm overflow-hidden cursor-pointer group">
                <div className="relative h-48 overflow-hidden">
                  {event.coverImage ? (
                    <img src={event.coverImage} alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${cfg.color} flex items-center justify-center text-6xl`}>{cfg.icon}</div>
                  )}
                  <div className="absolute top-3 right-3">
                    <span className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm text-white text-xs font-bold">{cfg.icon} {cfg.label}</span>
                  </div>
                  {event.images && event.images.length > 1 && (
                    <div className="absolute bottom-3 left-3">
                      <span className="px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-sm text-white text-xs font-bold flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" />{event.images.length} صورة
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-black text-gray-900 dark:text-white text-sm leading-snug line-clamp-2">{event.title}</h3>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(event.date).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  {event.description && <p className="text-xs text-gray-400 mt-2 line-clamp-2">{event.description}</p>}
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
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-[#1e1e2d] rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
              <div className="p-7">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <h2 className="font-black text-xl text-gray-900 dark:text-white">{selectedEvent.title}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(selectedEvent.date).toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <button onClick={() => setSelectedEvent(null)}
                    className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center hover:bg-rose-100 dark:hover:bg-rose-500/10 text-gray-500 hover:text-rose-500 transition-colors flex-shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {selectedEvent.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-5 leading-relaxed">{selectedEvent.description}</p>
                )}
                {selectedEvent.driveUrl && (
                  <a href={selectedEvent.driveUrl} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-50 dark:bg-teal-500/10 text-teal-600 font-bold text-sm hover:bg-teal-100 transition-colors mb-5">
                    <ExternalLink className="w-4 h-4" />فتح ألبوم Google Drive
                  </a>
                )}
                {selectedEvent.images && selectedEvent.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {selectedEvent.images.map((img, idx) => (
                      <img key={idx} src={img} alt={`صورة ${idx + 1}`}
                        className="w-full aspect-square object-cover rounded-2xl cursor-pointer hover:opacity-80 transition-opacity" />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
