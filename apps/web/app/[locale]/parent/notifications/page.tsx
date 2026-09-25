'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Bell, CheckCircle2, AlertTriangle, BookOpen,
  Trophy, Clock, Sparkles, CheckCheck
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Notification {
  id: string
  title: string
  body: string
  time: string
  isRead: boolean
  type: 'attendance' | 'homework' | 'certificate' | 'grade' | 'general'
}

const DEFAULT_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    title: 'تسجيل حضور ذكي (Face ID) ✅',
    body: 'تم تسجيل حضور الطالب أحمد فيصل الغامدي في طابور الصباح والحصة الأولى بنجاح.',
    time: 'اليوم — 07:05 ص',
    isRead: false,
    type: 'attendance',
  },
  {
    id: 'n2',
    title: 'واجب جديد من د. إسماعيل عيسى 📚',
    body: 'أضاف الدكتور إسماعيل عيسى واجب "قراءة درس المد بالألف وكتابة 3 كلمات" في مادة لغتي.',
    time: 'اليوم — 08:30 ص',
    isRead: false,
    type: 'homework',
  },
  {
    id: 'n3',
    title: 'اعتماد وسام التميز وشهادة تقدير 🏆',
    body: 'منح المعلم د. إسماعيل وسام رواد الفصاحة وشهادة تفوق لأحمد لتميزه في تسميع سورة الناس.',
    time: 'أمس — 12:15 م',
    isRead: true,
    type: 'certificate',
  },
  {
    id: 'n4',
    title: 'رصد درجة اختبار مادة الرياضيات 🔢',
    body: 'حصل أحمد على درجة 95/100 في الاختبار الدوري القصير للفصل الثاني — أداء ممتاز!',
    time: 'منذ يومين',
    isRead: true,
    type: 'grade',
  },
  {
    id: 'n5',
    title: 'تذكير بموعد الأنشطة اللاصفية 🎨',
    body: 'يوم الخميس القادم مخصص لمعرض الفنون البصرية والتشكيلية، يرجى إحضار كراسة الرسم.',
    time: 'منذ 3 أيام',
    isRead: true,
    type: 'general',
  },
]

export default function ParentNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(DEFAULT_NOTIFICATIONS)

  const unreadCount = notifications.filter(n => !n.isRead).length

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
  }

  const toggleRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isRead: !n.isRead } : n))
    )
  }

  return (
    <div className="space-y-8 pb-16" dir="rtl">
      {/* ── HERO BANNER ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#b45309] via-[#d97706] to-[#F59E0B] p-8 md:p-10 text-white shadow-[0_24px_70px_rgba(245,158,11,0.32)]"
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md mb-3 shadow-sm border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-yellow-200 animate-pulse" />
              <span className="text-xs font-bold text-amber-100">مركز التنبيهات المباشرة</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black mb-2 tracking-tight">الإشعارات والتنبيهات 🔔</h1>
            <p className="text-amber-100 text-sm md:text-base max-w-xl font-medium">
              متابعة فورية ومباشرة لكافة مستجدات الحضور والواجبات والتوجيهات من د. إسماعيل عيسى.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/10 border border-white/15 backdrop-blur-md px-4 py-2.5 rounded-2xl text-center">
              <p className="text-[10px] text-amber-200 font-bold uppercase">غير مقروء</p>
              <p className="text-2xl font-black">{unreadCount}</p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="px-4 py-3 rounded-2xl bg-white text-amber-800 font-black text-xs shadow-lg hover:bg-amber-50 transition-colors"
              >
                تحديد الكل كمقروء
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── NOTIFICATIONS LIST ── */}
      <div className="space-y-3.5">
        {notifications.map((notif, i) => {
          const typeIcons = {
            attendance: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
            homework: { icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
            certificate: { icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
            grade: { icon: Sparkles, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10' },
            general: { icon: Bell, color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-500/10' },
          }
          const cfg = typeIcons[notif.type] || typeIcons.general
          const Icon = cfg.icon

          return (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => toggleRead(notif.id)}
              className={`p-5 rounded-[2rem] border backdrop-blur-xl transition-all cursor-pointer flex items-start gap-4 ${
                notif.isRead
                  ? 'bg-white/60 dark:bg-[#1e1e2d]/60 border-gray-100 dark:border-white/5 opacity-80'
                  : 'bg-white/95 dark:bg-[#1e1e2d]/95 border-amber-200 dark:border-amber-500/30 shadow-md ring-1 ring-amber-500/10'
              }`}
            >
              <div className={`w-12 h-12 rounded-2xl ${cfg.bg} flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                <Icon className="w-6 h-6" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className={`font-black text-sm ${notif.isRead ? 'text-gray-800 dark:text-gray-200' : 'text-gray-900 dark:text-white'}`}>
                    {notif.title}
                  </h3>
                  <span className="text-[10px] text-gray-400 font-mono whitespace-nowrap">{notif.time}</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                  {notif.body}
                </p>
              </div>

              {!notif.isRead && (
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0 mt-2 shadow-sm" />
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
