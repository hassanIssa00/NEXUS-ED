'use client'
import { useEffect, useState, useCallback } from 'react'
import { Link } from '@/i18n/routing'
import { dashboardApi, TeacherDashboardResponse } from '@/lib/api/dashboard'
import { motion, AnimatePresence } from 'framer-motion'
import { useRealtimeNotifications } from '@/lib/providers/socket-provider'
import {
  Users, FileText, ClipboardList, Calendar, BookOpen, Zap,
  BrainCircuit, TrendingUp, AlertCircle, CheckCircle2, Clock,
  Plus, BarChart3, Sparkles, Bell
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, Cell } from 'recharts'
import { LiveClassBanner } from './_components/LiveClassBanner'
import { GradingQueue } from './_components/GradingQueue'

const Tooltip2 = ({ active, payload, label }: any) => {
  if (active && payload?.length) return (
    <div className="bg-white/90 dark:bg-[#1e1e2d]/90 backdrop-blur-md border border-gray-100 dark:border-white/10 p-3 rounded-xl shadow-xl">
      <p className="font-bold text-gray-900 dark:text-white mb-1 text-xs">{label}</p>
      {payload.map((e: any, i: number) => <p key={i} className="text-xs font-medium" style={{ color: e.color }}>{e.name}: {e.value}</p>)}
    </div>
  )
  return null
}

function KpiCard({ label, value, icon: Icon, color, sub }: { label: string; value: string | number; icon: any; color: string; sub?: string }) {
  return (
    <motion.div whileHover={{ y: -4, scale: 1.02 }} transition={{ type: 'spring', stiffness: 300 }}
      className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl p-6 flex items-center gap-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group cursor-default">
      <div className="absolute -top-6 -right-6 w-24 h-24 opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-2xl rounded-full" style={{ backgroundColor: color }} />
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner" style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>
        <Icon className="w-7 h-7" style={{ color }} />
      </div>
      <div>
        <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-none mb-1">{value}</p>
        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{label}</p>
        {sub && <p className="text-[11px] text-gray-400 font-medium mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  )
}

// Fallback data when API is unavailable
const FALLBACK_DATA: TeacherDashboardResponse = {
  teacher: { name: 'فاطمة الزهراني', email: 'teacher@nexusedu.sa', subject: 'الرياضيات' },
  summary: { totalStudents: 120, totalClasses: 5, totalAssignments: 18, totalLessons: 42, pendingSubmissions: 7 },
  classPerformance: [
    { name: 'الصف 10-أ', averageGrade: 82, studentCount: 28 },
    { name: 'الصف 10-ب', averageGrade: 74, studentCount: 25 },
    { name: 'الصف 11-أ', averageGrade: 88, studentCount: 30 },
    { name: 'الصف 11-ب', averageGrade: 69, studentCount: 22 },
    { name: 'الصف 12-أ', averageGrade: 91, studentCount: 27 },
  ],
  recentAssignments: [
    { id: '1', title: 'حل معادلات من الدرجة الثانية', subject: 'الرياضيات', submissions: 18 },
    { id: '2', title: 'تدريبات المتتاليات والمتسلسلات', subject: 'الرياضيات', submissions: 12 },
    { id: '3', title: 'مسائل الاحتمالات التطبيقية', subject: 'الرياضيات', submissions: 9 },
  ],
  attendanceSummary: { totalRecords: 120, present: 108, absent: 12 },
  interventionAlerts: [
    { id: '1', title: 'تنبيه: 3 طلاب بحاجة متابعة', body: 'انخفاض في الدرجات خلال الأسبوعين الماضيين في الصف 11-ب' },
  ],
  gradingQueue: [],
} as any;

export default function TeacherDashboardPage() {
  const [data, setData] = useState<TeacherDashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [usingFallback, setUsingFallback] = useState(false)
  const [liveNotif, setLiveNotif] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { nexusBridge } = await import('@/lib/nexusDataBridge')
      const students = nexusBridge.getStudents()
      const attendance = nexusBridge.getTodayAttendance()
      const homework = nexusBridge.getHomework()
      const submissions = nexusBridge.getHomeworkSubmissions()
      const presentCount = attendance.filter(a => a.overallStatus === 'present').length
      const totalAtt = attendance.length || students.length

      const realData: any = {
        teacher: {
          name: 'د. إسماعيل عيسى',
          email: 'arabic.teacher@nexusedu.sa',
          subject: 'لغتي العربية والقرآن الكريم — فصل د. إسماعيل',
        },
        summary: {
          totalStudents: students.length,
          totalClasses: 1,
          totalAssignments: homework.length,
          totalLessons: 18,
          pendingSubmissions: submissions.filter(s => s.status === 'submitted').length,
          attendanceRate: totalAtt > 0 ? Math.round((presentCount / totalAtt) * 100) : 98,
        },
        classPerformance: [
          { name: 'فصل د. إسماعيل عيسى', averageGrade: 95, studentCount: students.length, subjectCount: 4 },
        ],
        recentAssignments: homework.map(h => ({
          id: h.id,
          title: h.title,
          subject: h.subject,
          submissions: h.submissionsCount,
          dueDate: h.dueDate,
        })),
        attendanceSummary: {
          totalRecords: totalAtt,
          present: presentCount,
          absent: attendance.filter(a => a.overallStatus === 'absent').length,
        },
        interventionAlerts: [
          { id: '1', title: 'متابعة فردية: طالب بحاجة لدعم إضافي', body: 'الطالب خالد العمري يحتاج مساندة في تدريبات المدود' },
        ],
        gradingQueue: submissions.filter(s => s.status === 'submitted'),
      }
      setData(realData)
      setUsingFallback(false)
    } catch {
      setData(FALLBACK_DATA)
      setUsingFallback(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { 
    load() 
    const handleSync = () => load()
    window.addEventListener('nexus:data-changed', handleSync)
    return () => window.removeEventListener('nexus:data-changed', handleSync)
  }, [load])
  useRealtimeNotifications(useCallback((n: any) => {
    setLiveNotif(n.title); setTimeout(() => setLiveNotif(null), 4000)
  }, []))

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
      <div className="relative w-20 h-20">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 rounded-full border-4 border-teal-500/20 border-t-teal-600" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-teal-400 animate-pulse" />
        </div>
      </div>
      <p className="text-sm text-gray-500 font-medium animate-pulse">جاري تحميل لوحة المعلم...</p>
    </div>
  )

  const { teacher, summary, classPerformance, recentAssignments, attendanceSummary, interventionAlerts } = data
  const attPct = attendanceSummary?.totalRecords > 0
    ? Math.round((attendanceSummary.present / attendanceSummary.totalRecords) * 100) : 0

  const classChartData = (classPerformance || []).map(c => ({ name: c.name.substring(0, 10), avg: Math.round(c.averageGrade || 0), students: c.studentCount }))
  const radarData = (classPerformance || []).slice(0, 6).map(c => ({ subject: c.name.substring(0, 8), value: Math.round(c.averageGrade || 0) }))

  return (
    <div className="space-y-8 pb-12" dir="rtl">
      {/* Live Toast */}
      <AnimatePresence>
        {liveNotif && (
          <motion.div initial={{ opacity: 0, y: -50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/10 text-gray-900 dark:text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-bold whitespace-nowrap">
            <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-500/20 flex items-center justify-center text-teal-600">
              <Bell className="w-4 h-4" />
            </div>
            {liveNotif}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offline/Fallback Banner */}
      {usingFallback && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-5 py-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl text-amber-700 dark:text-amber-400 text-sm font-bold">
          <AlertCircle className="w-4 h-4 flex-shrink-0 animate-pulse" />
          <span>لا يمكن الاتصال بالخادم — يتم عرض بيانات تجريبية. </span>
          <button onClick={load} className="underline font-black hover:no-underline">إعادة الاتصال</button>
        </motion.div>
      )}

      {/* Live Banner */}
      <LiveClassBanner />

      {/* HERO */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0f766e] via-[#0369a1] to-[#1e3a8a] p-8 md:p-10 text-white shadow-2xl">
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-40">
          <motion.div animate={{ rotate: 360, scale: [1, 1.1, 1] }} transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
            className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-teal-400/30 rounded-full blur-3xl" />
          <motion.div animate={{ rotate: -360 }} transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
            className="absolute -bottom-40 -left-20 w-[400px] h-[400px] bg-blue-400/25 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-start justify-between gap-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 backdrop-blur-md mb-4">
              <Sparkles className="w-3 h-3 text-yellow-300 animate-pulse" />
              <span className="text-xs font-bold text-teal-100">بوابة المعلم الذكية</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-teal-200 leading-[1.4]">
              أهلاً بك،<br/>أ. {teacher.name}
            </h1>

            <div className="flex flex-wrap gap-4 mt-4">
              {[
                { icon: Users, val: summary.totalStudents, label: 'إجمالي الطلاب', color: 'from-teal-400/30 to-teal-500/20' },
                { icon: ClipboardList, val: summary.pendingSubmissions, label: 'بانتظار التصحيح', color: 'from-amber-400/30 to-amber-500/20' },
                { icon: Calendar, val: `${attPct}%`, label: 'متوسط الحضور', color: 'from-blue-400/30 to-blue-500/20' },
                { icon: BookOpen, val: summary.totalClasses, label: 'الفصول الدراسية', color: 'from-purple-400/30 to-purple-500/20' },
              ].map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.08 }}
                  className={`bg-gradient-to-br ${s.color} border border-white/10 backdrop-blur-md rounded-2xl p-4 flex items-center gap-3 min-w-[130px] shadow-sm`}>
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <s.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-black text-2xl text-white tracking-tight leading-none mb-0.5">{s.val}</p>
                    <p className="text-[11px] font-medium text-teal-100">{s.label}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full md:w-auto">
            {[
              { href: '/teacher/assignments', icon: Plus, label: 'إسناد واجب جديد', primary: true },
              { href: '/teacher/content-generator', icon: BrainCircuit, label: 'توليد محتوى بالذكاء الاصطناعي', primary: false },
              { href: '/teacher/automation', icon: Zap, label: 'أدوات الأتمتة المتقدمة', primary: false },
              { href: '/teacher/student-risk-report', icon: AlertCircle, label: 'تقرير الطلاب في خطر', primary: false },
            ].map((a, i) => (
              <Link key={i} href={a.href} className="w-full md:w-auto">
                <motion.button whileHover={{ scale: 1.02 }}
                  className={`w-full flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-bold text-sm transition-all shadow-sm ${a.primary ? 'bg-white text-teal-900 hover:bg-teal-50' : 'bg-white/10 hover:bg-white/20 border border-white/10 text-white'}`}>
                  <a.icon className="w-4 h-4" /> {a.label}
                </motion.button>
              </Link>
            ))}
          </div>
        </div>
      </motion.div>

      {/* AI Quick Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
         <div className="bg-gradient-to-br from-teal-500/10 to-teal-600/5 border border-teal-500/20 p-5 rounded-3xl flex gap-4 items-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0"><TrendingUp className="text-teal-600 w-6 h-6"/></div>
            <div><p className="text-sm font-extrabold text-gray-900 dark:text-white">أداء متميز للفصل 10-أ</p><p className="text-xs text-gray-500 font-medium">ارتفاع في متوسط الدرجات بنسبة 12% هذا الأسبوع</p></div>
         </div>
         <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 p-5 rounded-3xl flex gap-4 items-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0"><AlertCircle className="text-amber-600 w-6 h-6"/></div>
            <div><p className="text-sm font-extrabold text-gray-900 dark:text-white">3 طلاب يحتاجون للمتابعة</p><p className="text-xs text-gray-500 font-medium">انخفاض في مستوى التفاعل في مادة الرياضيات</p></div>
         </div>
         <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 p-5 rounded-3xl flex gap-4 items-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0"><BrainCircuit className="text-blue-600 w-6 h-6"/></div>
            <div><p className="text-sm font-extrabold text-gray-900 dark:text-white">تحليل الذكاء الاصطناعي</p><p className="text-xs text-gray-500 font-medium">تم تجهيز 5 خطط علاجية مقترحة للطلاب المتعثرين</p></div>
         </div>
      </div>

      {/* KPI ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard label="الفصول المسندة" value={summary.totalClasses} icon={Users} color="#0d9488" sub="فصل دراسي" />
        <KpiCard label="الواجبات النشطة" value={summary.totalAssignments} icon={FileText} color="#2563eb" sub="واجب مسند" />
        <KpiCard label="إجمالي الدروس" value={summary.totalLessons} icon={BookOpen} color="#7c3aed" sub="درس مكتمل" />
        <KpiCard label="مهام التصحيح" value={summary.pendingSubmissions} icon={ClipboardList} color="#d97706" sub="يتطلب انتباهك" />
      </div>

      {/* CHARTS */}
      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
          className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-[2rem] p-7 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900 dark:text-white text-base">متوسط درجات الفصول</h3>
              <p className="text-xs text-gray-500">تحليل أداء كل فصل دراسي</p>
            </div>
          </div>
          {classChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={classChartData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-gray-100 dark:text-gray-800/50" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} domain={[0, 100]} />
                <Tooltip content={<Tooltip2 />} />
                <Bar dataKey="avg" radius={[6, 6, 0, 0]} maxBarSize={40}>
                  {classChartData.map((e, i) => <Cell key={i} fill={e.avg >= 80 ? '#0d9488' : e.avg >= 65 ? '#f59e0b' : '#ef4444'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-[240px] flex items-center justify-center"><p className="text-gray-400">لا توجد بيانات</p></div>}
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}
          className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-[2rem] p-7 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900 dark:text-white text-base">الأداء الشامل للمواد</h3>
              <p className="text-xs text-gray-500">توزيع الدرجات بين الفصول</p>
            </div>
          </div>
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                <PolarGrid stroke="currentColor" className="text-gray-200 dark:text-gray-800" strokeDasharray="3 3" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 600 }} />
                <Radar dataKey="value" stroke="#0d9488" fill="#0d9488" fillOpacity={0.35} strokeWidth={2.5} />
                <Tooltip content={<Tooltip2 />} />
              </RadarChart>
            </ResponsiveContainer>
          ) : <div className="h-[240px] flex items-center justify-center"><p className="text-gray-400">لا توجد بيانات</p></div>}
        </motion.div>
      </div>

      {/* BOTTOM GRID */}
      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <GradingQueue queue={data.gradingQueue || []} onRefresh={load} />

        <div className="flex flex-col gap-6">
          {/* Recent Assignments */}
          <div className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-[2rem] overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" /> آخر الواجبات المسندة
              </h3>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-white/5 p-2">
              {(recentAssignments || []).slice(0, 4).map((a: any) => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-colors cursor-pointer">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{a.title}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{a.subject} • {a.submissions} تسليم</p>
                  </div>
                </div>
              ))}
              {(!recentAssignments || recentAssignments.length === 0) && (
                <p className="text-center text-gray-400 text-xs py-8 font-medium">لا توجد واجبات مسندة</p>
              )}
            </div>
          </div>

          {/* AI Toolkit */}
          <div className="bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 rounded-[2rem] p-6 text-white shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform duration-700" />
            <h3 className="font-extrabold mb-4 flex items-center gap-2 text-base relative z-10">
              <Sparkles className="w-5 h-5 text-yellow-300" /> قدرات الذكاء الاصطناعي
            </h3>
            <div className="space-y-2.5 relative z-10">
              {[
                { href: '/teacher/content-generator', label: 'مساعد تحضير الدروس', icon: BrainCircuit },
                { href: '/teacher/student-risk-report', label: 'التنبؤ بتعثر الطلاب', icon: AlertCircle },
                { href: '/teacher/automation', label: 'التصحيح الآلي الذكي', icon: Zap },
              ].map((t, i) => (
                <Link key={i} href={t.href}>
                  <div className="flex items-center gap-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl px-4 py-3 cursor-pointer transition-all backdrop-blur-sm">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                      <t.icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-xs font-bold">{t.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Intervention Alerts */}
          {interventionAlerts && interventionAlerts.length > 0 && (
            <div className="bg-rose-50 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-500/20 rounded-[2rem] p-6 shadow-sm">
              <h3 className="font-extrabold mb-4 flex items-center gap-2 text-sm text-rose-700 dark:text-rose-400">
                <AlertCircle className="w-5 h-5 animate-pulse" /> تنبيهات التدخل المبكر
              </h3>
              <div className="space-y-3">
                {interventionAlerts.slice(0, 3).map((alert: any) => (
                  <div key={alert.id} className="bg-white dark:bg-[#1e1e2d] rounded-2xl p-4 shadow-sm border border-rose-100 dark:border-rose-500/10">
                    <p className="font-bold text-gray-900 dark:text-white text-sm mb-1">{alert.title}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{alert.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
