'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRealtimeNotifications, useRealtimeAttendance } from '@/lib/providers/socket-provider'
import Link from 'next/link'
import { AiAdvicePanel } from './_components/AiAdvicePanel'
import { MiniGradeBar, ChildStatCard } from './_components/GradeBar'
import {
  User, BookOpen, Clock, CreditCard, AlertCircle, Loader2,
  TrendingUp, Bell, Calendar, Shield, BrainCircuit, MessageSquare,
  CheckCircle2, Star, Trophy, Home, FileText, Archive, HeartHandshake, Send, LayoutDashboard, Users, Medal, X, Send as SendIcon
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const CHILD_COLORS = ['#8b5cf6', '#10b981', '#f43f5e', '#f59e0b']
const GRADIENTS = ['from-violet-500 to-indigo-600', 'from-teal-500 to-emerald-600', 'from-rose-500 to-pink-600', 'from-amber-500 to-orange-500']

function ChildSelector({ children, selectedIdx, onSelect }: { children: any[]; selectedIdx: number; onSelect: (i: number) => void }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {children.map((child, i) => {
        const color = CHILD_COLORS[i % CHILD_COLORS.length]
        const isSelected = selectedIdx === i
        return (
          <motion.div key={child.id || i} whileHover={{ y: -4, scale: 1.02 }} onClick={() => onSelect(i)}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className={`cursor-pointer rounded-[2rem] p-6 border-2 transition-all relative overflow-hidden ${isSelected ? 'shadow-xl' : 'border-gray-100 dark:border-white/5 bg-white dark:bg-[#1e1e2d]'}`}
            style={isSelected ? { background: `linear-gradient(135deg, ${color}15, ${color}05)`, borderColor: `${color}50`, boxShadow: `0 20px 40px ${color}20` } : {}}>
            {isSelected && <div className="absolute -top-10 -left-10 w-32 h-32 blur-3xl opacity-30 rounded-full" style={{ backgroundColor: color }} />}
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} flex items-center justify-center text-white font-black text-xl shadow-lg`}>
                {(child.name || 'S')[0]}
              </div>
              <div>
                <p className="font-extrabold text-gray-900 dark:text-white text-base leading-tight">{child.name}</p>
                <p className="text-xs text-gray-500 font-medium">{child.class || 'طالب'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 relative z-10">
              <div className="bg-white/50 dark:bg-black/20 rounded-xl p-2.5 text-center border border-transparent" style={{ borderColor: `${color}20` }}>
                <p className="text-xl font-black" style={{ color }}>{child.gpa || '0.0'}</p>
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">المعدل</p>
              </div>
              <div className="bg-white/50 dark:bg-black/20 rounded-xl p-2.5 text-center border border-transparent" style={{ borderColor: `${color}20` }}>
                <p className="text-xl font-black" style={{ color }}>{child.attendanceRate || 0}%</p>
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">الحضور</p>
              </div>
            </div>
            {isSelected && (
              <div className="absolute top-3 left-3 w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: color }}>
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              </div>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}

export default function ParentDashboard() {
  const [childrenData, setChildrenData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [parentDisplayName, setParentDisplayName] = useState('فيصل الغامدي')
  const [liveNotif, setLiveNotif] = useState<string | null>(null)
  const [liveAttendance, setLiveAttendance] = useState<string | null>(null)
  const [parentTab, setParentTab] = useState<'dashboard'|'schedule'|'homework'|'achievements'|'messages'|'reports'>('dashboard')
  const [parentMessages, setParentMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)
  const [parentReports, setParentReports] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const { nexusBridge } = await import('@/lib/nexusDataBridge')
        let linkedStudentId = 'cls-std-2'
        let currentParentName = 'فيصل الغامدي'
        try {
          const stored = localStorage.getItem('nexus_user')
          if (stored) {
            const acc = JSON.parse(stored)
            if (acc.linkedStudentId) linkedStudentId = acc.linkedStudentId
            if (acc.name) currentParentName = acc.name
          }
        } catch {}

        setParentDisplayName(currentParentName)

        const student = nexusBridge.getStudentById(linkedStudentId)
        const todayAtt = nexusBridge.getTodayAttendance()
        const myAtt = todayAtt.find(a => a.studentId === linkedStudentId)
        const hwSubs = nexusBridge.getHomeworkSubmissions().filter(s => s.studentId === linkedStudentId)
        const allHw = nexusBridge.getHomework()
        const certs = nexusBridge.getCertificates(linkedStudentId)
        const obs = nexusBridge.getObservations(linkedStudentId)

        const submittedIds = new Set(hwSubs.map(s => s.assignmentId))
        const upcomingAssignments = allHw
          .filter(hw => !submittedIds.has(hw.id))
          .map(hw => ({
            id: hw.id,
            title: hw.title,
            subject: { name: hw.subject },
            dueDate: hw.dueDate,
            status: 'pending',
          }))

        const subjects = ['اللغة العربية', 'القرآن الكريم', 'الرياضيات', 'العلوم']
        const recentGrades = subjects.map((s, i) => ({
          subject: s,
          score: [95, 98, 92, 90][i],
          total: 100,
        }))

        const gradeHistory = [
          { name: 'سبتمبر', درجة: student?.averageGrade || 95 },
          { name: 'أكتوبر', درجة: 96 },
          { name: 'نوفمبر', درجة: 94 },
          { name: 'ديسمبر', درجة: 97 },
          { name: 'يناير', درجة: 95 },
          { name: 'فبراير', درجة: 98 },
          { name: 'مارس', درجة: 99 },
        ]

        const presentDays = student?.attendanceRate ? Math.round((student.attendanceRate / 100) * 30) : 29
        const attendance = {
          present: presentDays,
          absent: Math.max(0, 30 - presentDays - 1),
          late: 1,
          excused: 0,
        }

        const childData = {
          id: linkedStudentId,
          name: student?.fullName || 'أحمد فيصل الغامدي',
          class: student?.grade || 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى',
          gpa: `${((student?.averageGrade || 95) / 10).toFixed(1)}`,
          attendanceRate: student?.attendanceRate || 97,
          recentGrades,
          gradeHistory,
          upcomingAssignments,
          attendance,
          certificates: certs,
          observations: obs,
          gamification: {
            level: 5,
            achievementsUnlocked: certs.length + (student?.status === 'excellent' ? 2 : 0),
          },
        }

        setChildrenData([childData])

        // Load messages & reports for parent
        const obsForParent = nexusBridge.getObservations(linkedStudentId)
        setParentMessages(obsForParent.map(o => ({
          id: o.id,
          from: 'د. إسماعيل عيسى',
          text: o.text,
          time: o.createdAt,
          type: o.severity === 'positive' ? 'praise' : o.severity === 'urgent' ? 'urgent' : 'info'
        })))
        const hwForParent = nexusBridge.getHomework()
        const hwSubsForParent = nexusBridge.getHomeworkSubmissions().filter(s => s.studentId === linkedStudentId)
        setParentReports([
          { id: 'r1', title: 'تقرير الحضور الشهري', date: new Date().toISOString(), type: 'attendance', content: `نسبة الحضور: ${nexusBridge.getStudentById(linkedStudentId)?.attendanceRate || 97}%` },
          { id: 'r2', title: 'تقرير الواجبات', date: new Date().toISOString(), type: 'homework', content: `مُسلَّم: ${hwSubsForParent.length} من ${hwForParent.length}` },
          ...nexusBridge.getCertificates(linkedStudentId).map(c => ({ id: c.id, title: `شهادة: ${c.programTitle}`, date: c.createdAt, type: 'certificate', content: c.achievement }))
        ])
      } catch (e) {
        console.error('nexusBridge parent load error:', e)
      } finally {
        setLoading(false)
      }
    }

    load()
    window.addEventListener('nexus:data-changed', load as any)
    return () => window.removeEventListener('nexus:data-changed', load as any)
  }, [])

  useRealtimeNotifications(useCallback((n: any) => {
    setLiveNotif(n.title); setTimeout(() => setLiveNotif(null), 5000)
  }, []))

  useRealtimeAttendance(useCallback((a: any) => {
    const msg = a.status === 'PRESENT' ? `✅ ${a.studentName || 'ابنك'} حضر اليوم` : `⚠️ ${a.studentName || 'ابنك'} غائب اليوم`
    setLiveAttendance(msg); setTimeout(() => setLiveAttendance(null), 6000)
  }, []))

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
      <div className="relative w-20 h-20">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 rounded-full border-4 border-amber-500/20 border-t-amber-500" />
        <div className="absolute inset-0 flex items-center justify-center text-2xl">👨‍👩‍👧‍👦</div>
      </div>
      <p className="text-sm text-gray-500 font-medium animate-pulse">جاري تحميل بيانات أبنائك...</p>
    </div>
  )

  if (childrenData.length === 0) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-24 h-24 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-2 text-4xl">👨‍👩‍👧</div>
      <h2 className="text-2xl font-black text-gray-900 dark:text-white">لم يتم ربط أي أبناء بحسابك</h2>
      <p className="text-gray-500 text-center max-w-sm font-medium">تواصل مع إدارة المدرسة لإضافة أبنائك إلى حسابك.</p>
    </div>
  )

  const selected = childrenData[selectedIdx]
  const color = CHILD_COLORS[selectedIdx % CHILD_COLORS.length]
  const grades = selected?.recentGrades || []
  
  // Fallback grade history data if none from API
  const FALLBACK_GRADE_HISTORY = [
    { name: 'سبتمبر', درجة: 72 }, { name: 'أكتوبر', درجة: 78 }, { name: 'نوفمبر', درجة: 75 },
    { name: 'ديسمبر', درجة: 82 }, { name: 'يناير', درجة: 80 }, { name: 'فبراير', درجة: 85 },
    { name: 'مارس', درجة: 88 },
  ];
  const gradeHistory = ((selected?.gradeHistory || []).map((g: any) => ({ name: g.label || g.date, درجة: g.value || g.grade })))
    .filter((g: any) => g.درجة > 0);
  const gradeData = gradeHistory.length > 0 ? gradeHistory : FALLBACK_GRADE_HISTORY;

  // Fallback grades for subjects if none from API
  const FALLBACK_GRADES = [
    { subject: 'الرياضيات', score: 85, total: 100 },
    { subject: 'اللغة العربية', score: 91, total: 100 },
    { subject: 'الفيزياء', score: 78, total: 100 },
    { subject: 'الكيمياء', score: 82, total: 100 },
    { subject: 'الإنجليزية', score: 88, total: 100 },
  ];
  const displayGrades = grades.length > 0 ? grades : FALLBACK_GRADES;

  return (
    <div className="space-y-8 pb-12" dir="rtl">
      {/* Live Toasts */}
      <AnimatePresence>
        {(liveNotif || liveAttendance) && (
          <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/10 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-bold whitespace-nowrap">
            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
              <Bell className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-gray-900 dark:text-white">{liveAttendance || liveNotif}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Parent Tab Bar */}
      <div className="flex gap-2 bg-gray-100/80 dark:bg-white/5 p-1.5 rounded-2xl overflow-x-auto mb-6">
        {[
          { key: 'dashboard', label: 'الرئيسية', icon: Home },
          { key: 'schedule', label: 'جدول الحصص', icon: Calendar },
          { key: 'homework', label: 'الواجبات', icon: BookOpen },
          { key: 'achievements', label: 'الإنجازات', icon: Trophy },
          { key: 'messages', label: 'التواصل', icon: MessageSquare },
          { key: 'reports', label: 'التقارير', icon: FileText },
        ].map(t => (
          <button key={t.key} onClick={() => setParentTab(t.key as any)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex-shrink-0 ${
              parentTab === t.key ? 'bg-white dark:bg-[#1e1e2d] text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {parentTab === 'dashboard' && (
        <>
          {/* HERO */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#d97706] via-[#ea580c] to-[#e11d48] p-8 md:p-10 text-white shadow-[0_20px_50px_rgba(234,88,12,0.25)]">
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-40">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
            className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-yellow-300/30 rounded-full blur-3xl" />
          <motion.div animate={{ rotate: -360 }} transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
            className="absolute -bottom-40 -left-20 w-[400px] h-[400px] bg-rose-400/30 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-start justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-4">
              <Shield className="w-3 h-3 text-yellow-300" />
              <span className="text-xs font-bold text-amber-100">بوابة المتابعة الأبوية الموحدة</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight leading-[1.2]">
              أهلاً بك،<br />{parentDisplayName} 👨‍👩‍👧‍👦
            </h1>
            <p className="text-white/90 text-sm font-medium mb-6 max-w-xl leading-relaxed">
              تتابع من خلال هذا المركز الأداء الأكاديمي لـ <strong className="text-yellow-200 text-lg px-1">{childrenData.length}</strong>
              {childrenData.length === 1 ? ' ابن مسجل' : ' أبناء مسجلين'}.
            </p>
            <div className="flex flex-wrap gap-3">
              {[
                { href: '/parent/payments', icon: CreditCard, label: 'الرسوم والمدفوعات' },
                { href: '/parent/notifications', icon: Bell, label: 'سجل الإشعارات' },
                { href: '/parent/messages', icon: MessageSquare, label: 'تواصل مع الهيئة', primary: true },
              ].map((a, i) => (
                <Link key={i} href={a.href}>
                  <motion.div whileHover={{ scale: 1.05 }} className={`flex items-center gap-2 backdrop-blur-sm rounded-xl px-5 py-3 cursor-pointer transition-colors shadow-sm text-sm font-bold ${a.primary ? 'bg-white text-orange-600 hover:bg-orange-50' : 'bg-white/15 hover:bg-white/25 text-white border border-white/20'}`}>
                    <a.icon className="w-4 h-4" />{a.label}
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
          {/* Stats summary */}
          <div className="flex flex-col gap-3 bg-black/15 p-5 rounded-2xl border border-white/10 backdrop-blur-sm min-w-[200px]">
            <p className="text-xs font-bold text-amber-200 mb-1">ملخص سريع لـ {selected?.name}</p>
            {[
              { label: 'المعدل العام', value: selected?.gpa || '0.0', icon: Star },
              { label: 'نسبة الحضور', value: `${selected?.attendanceRate || 0}%`, icon: Calendar },
              { label: 'الواجبات القادمة', value: selected?.upcomingAssignments?.length || 0, icon: BookOpen },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center"><s.icon className="w-3.5 h-3.5" /></div>
                <div>
                  <p className="text-[10px] text-white/70 leading-none">{s.label}</p>
                  <p className="font-black text-white text-sm leading-tight">{s.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ─── DR. ISMAIL CLASSROOM HUB BANNER ─── */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-emerald-100 dark:border-white/5 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white text-2xl shadow-md shadow-emerald-500/20 flex-shrink-0">
            👨‍🏫
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-gray-900 dark:text-white">فصل د. إسماعيل عيسى — الصف الأول الابتدائي</h2>
              <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 text-xs font-black">
                حاضر بالبصمة ✅
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium mt-1">
              معلم الفصل: <span className="font-bold text-emerald-600">د. إسماعيل عيسى</span> • الطالب: <span className="font-bold text-gray-800 dark:text-gray-200">أحمد فيصل الغامدي</span>
            </p>
            <p className="text-xs text-emerald-600 font-bold mt-1.5 flex items-center gap-1.5">
              <span>💬 آخر ملاحظة من المعلم:</span>
              <span className="font-normal text-gray-600 dark:text-gray-300">"أحمد متميز اليوم في حفظ وترتيل القرآن الكريم، تم منحه وسام التميز و50 نقطة!"</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button onClick={() => setParentTab('schedule')} className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 font-black text-xs transition-colors">
            جدول الحصص 📅
          </button>
          <button onClick={() => setParentTab('homework')} className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 text-amber-700 dark:text-amber-300 font-black text-xs transition-colors">
            الواجبات 📝
          </button>
          <button onClick={() => setParentTab('messages')} className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition-all">
            مراسلة د. إسماعيل 💬
          </button>
        </div>
      </motion.div>

      {/* CHILDREN SELECTOR */}
      <div>
        <h2 className="text-lg font-extrabold text-gray-900 dark:text-white mb-4 flex items-center gap-2 px-1">
          <User className="w-5 h-5 text-amber-500" /> اختر الملف للمتابعة التفصيلية
        </h2>
        <ChildSelector children={childrenData} selectedIdx={selectedIdx} onSelect={setSelectedIdx} />
      </div>

      {/* SELECTED CHILD DETAIL */}
      <AnimatePresence mode="wait">
        <motion.div key={selectedIdx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
          className="grid lg:grid-cols-[1fr_360px] gap-6">

          <div className="space-y-6">
            {/* Grade History Chart */}
            <div className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-[2rem] p-7 shadow-sm">
              <h3 className="font-extrabold text-gray-900 dark:text-white text-base mb-5 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                  <TrendingUp className="w-4 h-4" style={{ color }} />
                </div>
                مسار التقدم الأكاديمي الشامل
              </h3>
              {/* Grade History Chart - always shows data */}
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={gradeData} margin={{ top: 10, right: 0, left: -30, bottom: 0 }}>
                  <defs>
                    <linearGradient id="pG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-gray-100 dark:text-gray-800/50" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} domain={[0, 100]} />
                  <Tooltip />
                  <Area type="monotone" dataKey="درجة" stroke={color} fill="url(#pG)" strokeWidth={3} activeDot={{ r: 6, fill: color, stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Grades + Assignments */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Subject Grades - always visible */}
              <div className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-[2rem] p-6 shadow-sm">
                <h3 className="font-extrabold text-gray-900 dark:text-white mb-5 flex items-center gap-2 text-sm">
                  <BookOpen className="w-4 h-4" style={{ color }} /> تفصيل درجات المواد
                </h3>
                <div className="space-y-4">
                  {displayGrades.map((g: any, i: number) => (
                    <MiniGradeBar key={i} label={g.subject} value={g.score || g.grade || 0} max={g.total || 100} color={color} />
                  ))}
                </div>
              </div>

              {selected?.upcomingAssignments?.length > 0 && (
                <div className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-[2rem] p-6 shadow-sm">
                  <h3 className="font-extrabold text-gray-900 dark:text-white mb-5 flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-amber-500" /> الواجبات القادمة
                  </h3>
                  <div className="space-y-3">
                    {selected.upcomingAssignments.slice(0, 4).map((a: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 bg-gray-50 dark:bg-white/5 p-3.5 rounded-2xl border border-gray-100 dark:border-white/5">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#12121a] flex flex-col items-center justify-center shadow-sm flex-shrink-0">
                          <span className="text-[9px] text-gray-400 font-bold leading-none">
                            {a.dueDate ? new Date(a.dueDate).toLocaleDateString('ar-SA', { month: 'short' }) : '-'}
                          </span>
                          <span className="text-sm font-black text-gray-900 dark:text-white leading-none">
                            {a.dueDate ? new Date(a.dueDate).getDate() : '-'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{a.title}</p>
                          <p className="text-[10px] text-gray-500 truncate">{a.subject?.name}</p>
                        </div>
                        <span className={`text-[9px] px-2 py-1 rounded-lg font-black ${a.status === 'graded' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : a.status === 'submitted' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'}`}>
                          {a.status === 'graded' ? 'تم' : a.status === 'submitted' ? 'في الانتظار' : 'معلق'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="space-y-6">
            {/* Attendance Grid */}
            <div className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-[2rem] p-6 shadow-sm">
              <h3 className="font-extrabold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                <Calendar className="w-5 h-5" style={{ color }} /> سجل الحضور
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'أيام الحضور', value: selected.attendance?.present || 0, color: '#10b981', icon: CheckCircle2 },
                  { label: 'أيام الغياب', value: selected.attendance?.absent || 0, color: '#ef4444', icon: AlertCircle },
                  { label: 'مرات التأخير', value: selected.attendance?.late || 0, color: '#f59e0b', icon: Clock },
                  { label: 'غياب بعذر', value: selected.attendance?.excused || 0, color: '#6b7280', icon: Calendar },
                ].map((s, i) => <ChildStatCard key={i} {...s} />)}
              </div>
            </div>

            {/* AI Panel */}
            <div className="bg-gradient-to-br from-[#4c1d95] via-[#6d28d9] to-[#4338ca] rounded-[2rem] p-6 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform duration-700" />
              <div className="relative z-10">
                <h3 className="font-black text-white mb-4 flex items-center gap-2 text-sm">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <BrainCircuit className="w-4 h-4 text-yellow-300" />
                  </div>
                  تحليل AI لـ {selected.name}
                </h3>
                <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-md border border-white/15">
                  <AiAdvicePanel childId={selected.id} />
                </div>
              </div>
            </div>

            {/* Gamification */}
            {selected.gamification?.achievementsUnlocked > 0 && (
              <div className="bg-gradient-to-l from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10 border border-yellow-200 dark:border-yellow-700/30 rounded-[2rem] p-6 flex items-center gap-4 shadow-sm">
                <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <Trophy className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900 dark:text-white mb-0.5">البطل {selected.name} 🌟</p>
                  <p className="text-[11px] text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
                    فتح {selected.gamification.achievementsUnlocked} وسام إنجاز ووصل للمستوى {selected.gamification.level}
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
      </>
      )}

      {parentTab === 'schedule' && (
        <motion.div key="par-sched" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="space-y-4">
          <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-[2rem] p-6 text-white">
            <h2 className="text-2xl font-black mb-1">📅 جدول حصص ابنك/ابنتك</h2>
            <p className="text-green-100 text-sm">جدول فصل د. إسماعيل — الصف الأول الابتدائي</p>
          </div>
          {['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس'].map((day, dayIdx) => {
            const CLASS_SCHEDULE_PARENT = [
              {dayOfWeek:0,periodNumber:1,subjectName:'اللغة العربية',startTime:'07:00',endTime:'07:45'},
              {dayOfWeek:0,periodNumber:2,subjectName:'القرآن الكريم',startTime:'07:45',endTime:'08:30'},
              {dayOfWeek:0,periodNumber:4,subjectName:'التربية الإسلامية',startTime:'09:30',endTime:'10:15'},
              {dayOfWeek:0,periodNumber:5,subjectName:'الرياضيات',startTime:'10:15',endTime:'11:00'},
              {dayOfWeek:0,periodNumber:7,subjectName:'العلوم',startTime:'11:45',endTime:'12:30'},
              {dayOfWeek:1,periodNumber:1,subjectName:'اللغة العربية',startTime:'07:00',endTime:'07:45'},
              {dayOfWeek:1,periodNumber:2,subjectName:'اللغة العربية',startTime:'07:45',endTime:'08:30'},
              {dayOfWeek:1,periodNumber:4,subjectName:'القرآن الكريم',startTime:'09:30',endTime:'10:15'},
              {dayOfWeek:1,periodNumber:5,subjectName:'التربية الإسلامية',startTime:'10:15',endTime:'11:00'},
              {dayOfWeek:1,periodNumber:6,subjectName:'الرياضيات',startTime:'11:00',endTime:'11:45'},
              {dayOfWeek:2,periodNumber:1,subjectName:'اللغة العربية',startTime:'07:00',endTime:'07:45'},
              {dayOfWeek:2,periodNumber:2,subjectName:'التربية الإسلامية',startTime:'07:45',endTime:'08:30'},
              {dayOfWeek:2,periodNumber:4,subjectName:'فن',startTime:'09:30',endTime:'10:15'},
              {dayOfWeek:2,periodNumber:5,subjectName:'اللغة العربية',startTime:'10:15',endTime:'11:00'},
              {dayOfWeek:2,periodNumber:7,subjectName:'فن',startTime:'11:45',endTime:'12:30'},
              {dayOfWeek:3,periodNumber:1,subjectName:'اللغة العربية',startTime:'07:00',endTime:'07:45'},
              {dayOfWeek:3,periodNumber:2,subjectName:'اللغة العربية',startTime:'07:45',endTime:'08:30'},
              {dayOfWeek:3,periodNumber:4,subjectName:'القرآن الكريم',startTime:'09:30',endTime:'10:15'},
              {dayOfWeek:3,periodNumber:5,subjectName:'التربية الإسلامية',startTime:'10:15',endTime:'11:00'},
              {dayOfWeek:4,periodNumber:1,subjectName:'القرآن الكريم',startTime:'07:00',endTime:'07:45'},
              {dayOfWeek:4,periodNumber:2,subjectName:'اللغة العربية',startTime:'07:45',endTime:'08:30'},
              {dayOfWeek:4,periodNumber:4,subjectName:'القرآن الكريم',startTime:'09:30',endTime:'10:15'},
              {dayOfWeek:4,periodNumber:5,subjectName:'الرياضيات',startTime:'10:15',endTime:'11:00'},
              {dayOfWeek:4,periodNumber:6,subjectName:'التربية الإسلامية',startTime:'11:00',endTime:'11:45'},
            ]
            const dayPeriods = CLASS_SCHEDULE_PARENT.filter(p => p.dayOfWeek === dayIdx)
            const subjectEmojis: Record<string,string> = {'اللغة العربية':'📖','القرآن الكريم':'📿','التربية الإسلامية':'🕌','الرياضيات':'🔢','العلوم':'🔬','فن':'🎨'}
            return (
              <div key={day} className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl p-5 shadow-sm">
                <h4 className="font-black text-gray-900 dark:text-white mb-3">{day}</h4>
                <div className="space-y-2">
                  {dayPeriods.sort((a,b)=>a.periodNumber-b.periodNumber).map((p,pi) => (
                    <div key={pi} className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-white/5 text-sm">
                      <span className="text-lg">{subjectEmojis[p.subjectName]||'📚'}</span>
                      <span className="font-bold text-gray-900 dark:text-white flex-1">{p.subjectName}</span>
                      <span className="text-xs text-gray-500 font-mono">{p.startTime}—{p.endTime}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </motion.div>
      )}

      {parentTab === 'homework' && (
        <motion.div key="par-hw" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="space-y-4">
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-[2rem] p-6 text-white">
            <h2 className="text-2xl font-black mb-1">📝 متابعة الواجبات</h2>
            <p className="text-amber-100 text-sm">واجبات ابنك/ابنتك ومستوى إنجازها</p>
          </div>
          {childrenData[0] && childrenData[0].upcomingAssignments?.map((hw: any, i: number) => (
            <motion.div key={hw.id||i} initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} transition={{delay:i*0.06}} whileHover={{y:-2}}
              className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-2xl flex-shrink-0">📚</div>
                <div className="flex-1">
                  <h3 className="font-black text-gray-900 dark:text-white">{hw.title}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{hw.subject?.name || hw.subject} • تسليم: {hw.dueDate}</p>
                </div>
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-black">
                  ⏳ معلق
                </span>
              </div>
            </motion.div>
          ))}
          {(!childrenData[0]?.upcomingAssignments?.length) && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="text-5xl">✅</div>
              <p className="font-bold text-gray-500">ليس هناك واجبات معلقة — رائع!</p>
            </div>
          )}
        </motion.div>
      )}

      {parentTab === 'achievements' && (
        <motion.div key="par-achiev" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="space-y-4">
          <div className="bg-gradient-to-br from-amber-400 to-yellow-500 rounded-[2rem] p-6 text-white">
            <h2 className="text-2xl font-black mb-1">🏆 إنجازات ابنك/ابنتك</h2>
            <p className="text-amber-100 text-sm">الشهادات والأوسمة المحققة</p>
          </div>
          {childrenData[0]?.certificates?.length > 0 ? (
            <div className="space-y-3">
              {childrenData[0].certificates.map((cert: any, i: number) => (
                <motion.div key={cert.id||i} initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} transition={{delay:i*0.08}} whileHover={{y:-2}}
                  className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-amber-200/50 dark:border-amber-500/20 rounded-3xl p-5 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-2xl flex-shrink-0">🏆</div>
                    <div className="flex-1">
                      <h3 className="font-black text-gray-900 dark:text-white">{cert.programTitle || cert.title}</h3>
                      <p className="text-sm text-gray-500">{cert.achievementText || cert.description}</p>
                    </div>
                    <div className="text-xl font-black text-amber-600">{cert.score}%</div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="text-6xl">🌟</div>
              <p className="font-bold text-gray-500">لا توجد شهادات بعد — شجّع ابنك على التميز!</p>
            </div>
          )}
        </motion.div>
      )}

      {parentTab === 'messages' && (
        <motion.div key="par-msg" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="space-y-4">
          <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-[2rem] p-6 text-white">
            <h2 className="text-2xl font-black mb-1">💬 التواصل مع المعلم</h2>
            <p className="text-violet-200 text-sm">ملاحظات وتواصل مع د. إسماعيل عيسى</p>
          </div>
          {/* Messages list */}
          <div className="space-y-3">
            {parentMessages.map((msg, i) => (
              <motion.div key={msg.id||i} initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} transition={{delay:i*0.06}}
                className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black flex-shrink-0 ${
                    msg.type==='praise'?'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600':
                    msg.type==='urgent'?'bg-rose-100 dark:bg-rose-500/10 text-rose-600':
                    'bg-blue-100 dark:bg-blue-500/10 text-blue-600'
                  }`}>{msg.type==='praise'?'⭐':msg.type==='urgent'?'⚠️':'📩'}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-black text-sm text-gray-900 dark:text-white">{msg.from}</p>
                      <p className="text-[10px] text-gray-400">{new Date(msg.time).toLocaleDateString('ar-SA')}</p>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{msg.text}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          {/* Send message */}
          <div className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl p-5 shadow-sm">
            <h3 className="font-black text-gray-900 dark:text-white mb-3">📤 إرسال رسالة للمعلم</h3>
            <textarea value={newMessage} onChange={e=>setNewMessage(e.target.value)} rows={3}
              placeholder="اكتب رسالتك لد. إسماعيل..."
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-medium text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-green-500/50 mb-3" />
            <button onClick={async () => {
              if (!newMessage.trim()) return
              setSendingMsg(true)
              try {
                const { nexusBridge } = await import('@/lib/nexusDataBridge')
                nexusBridge.addObservation({ studentId: childrenData[0]?.id || 'cls-std-2', studentName: childrenData[0]?.name || 'الطالب', authorName: 'ولي الأمر', authorRole: 'parent', category: 'guidance', severity: 'neutral', text: `رسالة من ولي الأمر: ${newMessage}` })
                setNewMessage('')
                window.dispatchEvent(new CustomEvent('nexus:data-changed'))
              } catch(e) { console.error(e) } finally { setSendingMsg(false) }
            }} disabled={!newMessage.trim() || sendingMsg}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-sm hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
              {sendingMsg ? <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" /> : <><SendIcon className="w-4 h-4" />إرسال الرسالة</>}
            </button>
          </div>
        </motion.div>
      )}

      {parentTab === 'reports' && (
        <motion.div key="par-rep" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="space-y-4">
          <div className="bg-gradient-to-br from-slate-600 to-gray-700 rounded-[2rem] p-6 text-white">
            <h2 className="text-2xl font-black mb-1">📊 تقارير الطالب</h2>
            <p className="text-gray-300 text-sm">تقارير وملخصات أداء ابنك/ابنتك</p>
          </div>
          {parentReports.map((rep, i) => (
            <motion.div key={rep.id||i} initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} transition={{delay:i*0.06}} whileHover={{y:-2}}
              className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl p-5 shadow-sm">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${
                  rep.type==='attendance'?'bg-blue-100 dark:bg-blue-500/10':
                  rep.type==='certificate'?'bg-amber-100 dark:bg-amber-500/10':
                  'bg-green-100 dark:bg-green-500/10'
                }`}>{rep.type==='attendance'?'📅':rep.type==='certificate'?'🏆':'📝'}</div>
                <div className="flex-1">
                  <h3 className="font-black text-gray-900 dark:text-white">{rep.title}</h3>
                  <p className="text-sm text-gray-500">{rep.content}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(rep.date).toLocaleDateString('ar-SA')}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
