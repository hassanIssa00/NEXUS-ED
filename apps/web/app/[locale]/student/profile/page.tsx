'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Brain, TrendingUp, Target, BookOpen, Star,
  CheckCircle2, Clock, Sparkles, Award, Trophy, User, ShieldCheck, Flame
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

export default function SmartProfilePage() {
  const [student, setStudent] = useState<any>(null)
  const [certs, setCerts] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
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

        const s = nexusBridge.getStudentById(linkedStudentId)
        const c = nexusBridge.getCertificates(linkedStudentId)
        const subs = nexusBridge.getHomeworkSubmissions().filter((x: any) => x.studentId === linkedStudentId)

        setStudent(s)
        setCerts(c)
        setSubmissions(subs)
      } catch (e) {
        console.error('Smart profile load error:', e)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const level = Math.min(10, Math.floor(((certs.length * 500) + (submissions.length * 150)) / 500) + 1)
  const totalXP = (certs.length * 500) + (submissions.length * 150) + ((student?.averageGrade || 95) * 10)
  const nextLevelXP = level * 500
  const progressPct = Math.min(100, Math.round((totalXP % 500) / 500 * 100))

  const radarData = [
    { subject: 'اللغة العربية', mastery: 95 },
    { subject: 'القرآن الكريم', mastery: 98 },
    { subject: 'الرياضيات', mastery: 92 },
    { subject: 'العلوم', mastery: 88 },
    { subject: 'التربية الإسلامية', mastery: 96 },
    { subject: 'الفنون البصرية', mastery: 94 },
  ]

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-teal-500/20 border-t-teal-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-16" dir="rtl">
      {/* ── HERO BANNER ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#00605a] via-[#009688] to-[#00D1B2] p-8 md:p-10 text-white shadow-[0_24px_70px_rgba(0,209,178,0.32)]"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center text-5xl flex-shrink-0 border-2 border-white/30 shadow-xl">
              👦
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-2">
                <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
                <span className="text-xs font-bold text-teal-100">الملف الأكاديمي الذكي (AI Profile)</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black">{student?.fullName || 'أحمد فيصل الغامدي'}</h1>
              <p className="text-teal-100 text-sm mt-1">
                {student?.grade || 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى'}
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs text-teal-200">
                <span className="font-mono">المعرف: #{student?.id || 'cls-std-2'}</span>
                <span>•</span>
                <span>المعلم المشرف: د. إسماعيل عيسى</span>
              </div>
            </div>
          </div>

          <div className="bg-white/15 backdrop-blur-md p-4 rounded-3xl border border-white/20 text-center min-w-[150px]">
            <span className="text-[10px] text-teal-200 uppercase font-black">المستوى التعليمي</span>
            <div className="text-3xl font-black text-yellow-300 mt-0.5">المستوى {level}</div>
            <p className="text-[11px] text-teal-100 mt-1 font-bold">{totalXP} XP مجموع الخبرة</p>
          </div>
        </div>

        {/* Level Progress */}
        <div className="mt-6 pt-5 border-t border-white/15 relative z-10">
          <div className="flex items-center justify-between text-xs text-teal-100 font-bold mb-2">
            <span>التقدم نحو المستوى {level + 1}</span>
            <span>{progressPct}% ({totalXP % 500} / 500 XP)</span>
          </div>
          <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="h-full bg-gradient-to-r from-yellow-300 to-amber-400 rounded-full shadow-sm"
            />
          </div>
        </div>
      </motion.div>

      {/* ── METRICS GRID ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'متوسط الدرجات', value: `${student?.averageGrade || 95}%`, icon: Star, color: '#f59e0b', sub: 'أداء امتياز' },
          { label: 'نسبة الحضور', value: `${student?.attendanceRate || 97}%`, icon: CheckCircle2, color: '#10b981', sub: 'حضور منتظم' },
          { label: 'الأوسمة والشهادات', value: certs.length || 3, icon: Trophy, color: '#ec4899', sub: 'شهادات معتمدة' },
          { label: 'الواجبات المنجزة', value: submissions.length || 6, icon: Flame, color: '#f97316', sub: 'تسليم في الموعد' },
        ].map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-[2rem] p-6 shadow-sm"
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 bg-gray-50 dark:bg-white/5">
              <m.icon className="w-6 h-6" style={{ color: m.color }} />
            </div>
            <p className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">{m.value}</p>
            <p className="text-xs text-gray-500 font-bold mt-1">{m.label}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{m.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* ── RADAR CHART & AI INSIGHTS ── */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Radar Mastery */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-[2rem] p-7 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Brain className="w-5 h-5 text-teal-600" />
              مخطط الإتقان الشامل للمواد
            </h2>
            <Badge className="bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border-0 text-xs font-bold">
              تحديث مباشر
            </Badge>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 'bold' }} />
                <PolarRadiusAxis domain={[0, 100]} stroke="#9ca3af" tick={{ fontSize: 9 }} />
                <Radar name="نسبة الإتقان" dataKey="mastery" stroke="#00D1B2" fill="#00D1B2" fillOpacity={0.35} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* AI Learning Profile Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-[2rem] p-7 shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                تحليل الذكاء الاصطناعي لنمط التعلم
              </h2>
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 font-black">
                نمط بصري وتفاعلي
              </span>
            </div>

            <div className="space-y-3.5">
              <div className="p-4 rounded-2xl bg-teal-50/60 dark:bg-teal-500/5 border border-teal-100 dark:border-teal-500/20">
                <h4 className="text-xs font-black text-teal-800 dark:text-teal-300 mb-1 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-teal-600" />
                  نقاط القوة الاستثنائية
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                  سرعة متميزة في حفظ وتلاوة القرآن الكريم، وإتقان نطق مخارج الحروف والمدود في اللغة العربية بنسبة 98%.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/20">
                <h4 className="text-xs font-black text-blue-800 dark:text-blue-300 mb-1 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-blue-600" />
                  فرص التطور الموصى بها
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                  مواصلة التدرب على الألعاب الحسابية التفاعلية لزيادة سرعة حل مسائل الطرح والجمع المكونة من منزلتين.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-500/5 border border-purple-100 dark:border-purple-500/20">
                <h4 className="text-xs font-black text-purple-800 dark:text-purple-300 mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                  توصية المعلم د. إسماعيل عيسى
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                  طالب نجيب وشغوف بالمعرفة، أنصح بإشراكه في مسابقة تحدي المليون وبرنامج رواد الفصاحة.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs text-gray-400 font-bold">
            <span>تم التقييم بناءً على بيانات الواجبات والاختبارات</span>
            <span className="text-teal-600 dark:text-teal-400">منظومة نكسس الذكية</span>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
