'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Award, Sparkles, Star, Download, Printer, CheckCircle2, ShieldCheck } from 'lucide-react'

export default function StudentCertificatesPage() {
  const [certificates, setCertificates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const { nexusBridge } = await import('@/lib/nexusDataBridge')
        const certs = nexusBridge.getCertificates('cls-std-2')
        setCertificates(certs || [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-16" dir="rtl">
      {/* HERO */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-600 p-8 text-white shadow-2xl">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-3">
            <Sparkles className="w-3.5 h-3.5 text-yellow-200" />
            <span className="text-xs font-bold text-amber-100">فصل د. إسماعيل عيسى</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black mb-2 tracking-tight">سجل الإنجازات والشهادات 🏆</h1>
          <p className="text-amber-100 text-sm max-w-xl font-medium">
            جميع شهادات التميز وأوسمة الشرف المعتمدة رقمياً للطالب <span className="font-bold underline">أحمد فيصل الغامدي</span>
          </p>
        </div>
      </motion.div>

      {/* GAMIFICATION STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'المستوى الحالي', val: 'المستوى 4 ⭐', icon: '⭐', color: 'from-violet-500 to-purple-600' },
          { label: 'نقاط التميز (XP)', val: '2,075 نقطة', icon: '💎', color: 'from-blue-500 to-indigo-600' },
          { label: 'أيام الحضور المتتالية', val: '9 أيام 🔥', icon: '🔥', color: 'from-orange-500 to-red-500' },
          { label: 'الأوسمة المفتوحة', val: `${certificates.length} أوسمة`, icon: '🎖️', color: 'from-emerald-500 to-teal-600' },
        ].map((s, i) => (
          <div key={i} className={`bg-gradient-to-br ${s.color} rounded-3xl p-5 text-white shadow-sm`}>
            <div className="text-2xl mb-1">{s.icon}</div>
            <p className="text-xl font-black">{s.val}</p>
            <p className="text-xs opacity-80 font-bold">{s.label}</p>
          </div>
        ))}
      </div>

      {/* CERTIFICATES LIST */}
      <div className="space-y-4">
        <h3 className="font-black text-gray-900 dark:text-white text-base flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-500" />
          الشهادات الصادرة والمعتمدة
        </h3>

        {certificates.length === 0 ? (
          <div className="bg-white/80 dark:bg-[#1e1e2d]/80 rounded-3xl p-16 text-center border border-gray-100 dark:border-white/5">
            <Trophy className="w-16 h-16 text-amber-400 mx-auto mb-3" />
            <p className="font-bold text-gray-500">لا توجد شهادات مسجلة بعد — استمر في تفوقك!</p>
          </div>
        ) : (
          certificates.map((cert, i) => (
            <motion.div key={cert.id || i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              whileHover={{ y: -2 }}
              className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-amber-200/60 dark:border-amber-500/20 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-3xl shadow-md shadow-amber-500/20 text-white flex-shrink-0">
                  🏆
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-black text-base text-gray-900 dark:text-white">{cert.programTitle || cert.title}</h4>
                    <span className="px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 text-xs font-black">
                      معتمدة برقم تسلسلي
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 max-w-xl leading-relaxed">{cert.achievementText || cert.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400 font-mono">
                    <span className="font-bold text-amber-700 dark:text-amber-400">كود الاعتماد: #{cert.serialNumber || cert.id}</span>
                    <span>•</span>
                    <span>تاريخ الإصدار: {new Date(cert.createdAt).toLocaleDateString('ar-SA')}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-center px-4 py-2 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20">
                  <p className="text-2xl font-black text-amber-600">{cert.score}%</p>
                  <p className="text-[10px] text-gray-500 font-bold">الدرجة</p>
                </div>
                <button onClick={() => window.print()}
                  className="px-4 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-800 dark:text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm">
                  <Printer className="w-4 h-4" /> طباعة
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
