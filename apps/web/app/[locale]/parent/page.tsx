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
  CheckCircle2, Star, Trophy
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
    </div>
  )
}
