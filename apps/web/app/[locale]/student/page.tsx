'use client'

import { useEffect, useState, useCallback } from 'react'
import { Link } from '@/i18n/routing'
import type { StudentDashboardResponse } from '@/lib/api/dashboard'

import { motion, AnimatePresence } from 'framer-motion'
import { useRealtimeAssignments, useRealtimeNotifications } from '@/lib/providers/socket-provider'
import {
  BookOpen, Trophy, Sparkles, Target, Award,
  TrendingUp, CheckCircle2, AlertCircle, Flame, Star, Zap, Bell, FileText,
  Calendar, Gamepad2, GraduationCap, LayoutDashboard, X, Clock
} from 'lucide-react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Cell
} from 'recharts'

import { StatChip } from './_components/StatChip'
import { ProgressRing } from './_components/ProgressRing'
import { AiInsightCard } from '@/components/ai/ai-insight-card'
import { PomodoroTimer } from './_components/PomodoroTimer'
import { AchievementsShowcase } from './_components/AchievementsShowcase'
import { AssignmentsTimeline } from './_components/AssignmentsTimeline'
import { QuickNavGrid } from './_components/QuickNavGrid'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) return (
    <div className="bg-white/90 dark:bg-[#1e1e2d]/90 backdrop-blur-md border border-gray-100 dark:border-white/10 p-3 rounded-xl shadow-xl">
      <p className="font-bold text-gray-900 dark:text-white mb-1 text-xs">{label}</p>
      {payload.map((e: any, i: number) => <p key={i} className="text-xs font-medium" style={{ color: e.color }}>{e.name}: {e.value}</p>)}
    </div>
  )
  return null
}

const FALLBACK_STUDENT_DATA: StudentDashboardResponse = {
  student: { id: 'demo', name: 'أحمد فيصل الغامدي', email: 'student@nexusedu.sa', grade: 'الصف 11' },
  summary: { totalSubjects: 6, pendingAssignments: 4, completedAssignments: 23, averageGrade: 84, totalLessons: 48 },
  upcomingAssignments: [
    { id: '1', title: 'حل تمارين الفصل السادس', subject: 'الرياضيات', dueDate: new Date(Date.now() + 86400000).toISOString(), status: 'PENDING' },
    { id: '2', title: 'تلخيص قصيدة المتنبي', subject: 'اللغة العربية', dueDate: new Date(Date.now() + 172800000).toISOString(), status: 'PENDING' },
    { id: '3', title: 'تقرير تجربة المختبر', subject: 'الكيمياء', dueDate: new Date(Date.now() + 259200000).toISOString(), status: 'PENDING' },
  ],
  attendance: { present: 92, absent: 5, late: 3, excused: 0 },
  subjectPerformance: [
    { id: '1', name: 'الرياضيات', teacher: 'أ. فاطمة الزهراني', averageGrade: 88, totalLessons: 20, submittedAssignments: 8, totalAssignments: 9 },
    { id: '2', name: 'اللغة العربية', teacher: 'أ. أحمد سعيد', averageGrade: 92, totalLessons: 18, submittedAssignments: 7, totalAssignments: 8 },
    { id: '3', name: 'الفيزياء', teacher: 'أ. خالد الغامدي', averageGrade: 76, totalLessons: 16, submittedAssignments: 5, totalAssignments: 6 },
    { id: '4', name: 'الكيمياء', teacher: 'أ. ياسر الشهراني', averageGrade: 81, totalLessons: 14, submittedAssignments: 6, totalAssignments: 7 },
    { id: '5', name: 'الإنجليزية', teacher: 'أ. طارق الزهراني', averageGrade: 85, totalLessons: 12, submittedAssignments: 4, totalAssignments: 5 },
    { id: '6', name: 'التاريخ', teacher: 'أ. نورة سعد', averageGrade: 79, totalLessons: 10, submittedAssignments: 3, totalAssignments: 4 },
  ],
  gamification: { level: 7, totalXP: 3450, streakDays: 12, achievementsUnlocked: 8 },
  weeklyActivity: [
    { label: 'الأحد', submissions: 2, attended: 1 }, { label: 'الاثنين', submissions: 3, attended: 1 },
    { label: 'الثلاثاء', submissions: 1, attended: 1 }, { label: 'الأربعاء', submissions: 4, attended: 1 },
    { label: 'الخميس', submissions: 2, attended: 1 }, { label: 'الجمعة', submissions: 1, attended: 0 },
    { label: 'السبت', submissions: 0, attended: 0 },
  ],
} as any;

export default function StudentDashboardPage() {
  const [data, setData] = useState<StudentDashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [usingFallback, setUsingFallback] = useState(false)
  const [liveAssignments, setLiveAssignments] = useState<any[]>([])
  const [liveNotif, setLiveNotif] = useState<string | null>(null)

  const [activeStudentTab, setActiveStudentTab] = useState<'dashboard'|'schedule'|'homework'|'certificates'|'games'|'curriculum'>('dashboard')
  const [scheduleData, setScheduleData] = useState<any[]>([])
  const [SCHOOL_TIMETABLE_DATA, setSchoolTimetableData] = useState<any[]>([])
  const [homeworkData, setHomeworkData] = useState<any[]>([])
  const [hwSubmissionsData, setHwSubmissionsData] = useState<any[]>([])
  const [certsData, setCertsData] = useState<any[]>([])
  const [gamificationData, setGamificationData] = useState({ level: 1, totalXP: 0, streakDays: 0, achievementsUnlocked: 0 })
  const [selectedHwId, setSelectedHwId] = useState<string|null>(null)
  const [hwAnswer, setHwAnswer] = useState('')
  const [hwSubmitting, setHwSubmitting] = useState(false)
  const [studentLinkedId, setStudentLinkedId] = useState('cls-std-2')

  useEffect(() => {
    const load = async () => {
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

        const student = nexusBridge.getStudentById(linkedStudentId)
        const todayAtt = nexusBridge.getTodayAttendance()
        const myAtt = todayAtt.find(a => a.studentId === linkedStudentId)
        const hwSubs = nexusBridge.getHomeworkSubmissions()
        const mySubmissions = hwSubs.filter(s => s.studentId === linkedStudentId)
        const allHw = nexusBridge.getHomework()
        const myCerts = nexusBridge.getCertificates(linkedStudentId)

        const pendingHw = allHw.filter(hw => !mySubmissions.find(s => s.assignmentId === hw.id))
        const completedHw = mySubmissions.filter(s => s.status === 'reviewed')

        const upcomingAssignments = pendingHw.map(hw => ({
          id: hw.id,
          title: hw.title,
          subject: hw.subject,
          dueDate: hw.dueDate,
          status: 'PENDING',
        }))

        const subjects = ['اللغة العربية', 'القرآن الكريم', 'الرياضيات', 'العلوم']
        const subjectPerformance = subjects.map((subj, i) => {
          const subSubs = mySubmissions.filter(s => s.assignmentTitle?.includes(subj.split(' ')[1] || subj))
          const avgGrade = subSubs.length > 0
            ? Math.round((subSubs.reduce((acc, s) => acc + (s.grade || 0), 0) / subSubs.length) * 10)
            : [95, 98, 92, 90][i]
          return {
            id: `subj-${i}`,
            name: subj,
            teacher: 'د. إسماعيل عيسى',
            averageGrade: avgGrade,
            totalLessons: [18, 16, 20, 14][i],
            submittedAssignments: subSubs.length || [7, 6, 8, 5][i],
            totalAssignments: allHw.filter(h => h.subject === subj).length || [8, 7, 9, 6][i],
          }
        })

        const presentDays = student?.attendanceRate ? Math.round((student.attendanceRate / 100) * 180) : 172
        const attendance = {
          present: presentDays,
          absent: Math.max(0, 180 - presentDays - 2),
          late: 2,
          excused: 1,
        }

        const totalXP = (myCerts.length * 500) + (mySubmissions.length * 150) + (student?.averageGrade || 95) * 15
        const gamification = {
          level: Math.min(10, Math.floor(totalXP / 600) + 1),
          totalXP,
          streakDays: mySubmissions.length > 0 ? 9 : 4,
          achievementsUnlocked: myCerts.length + (student?.status === 'excellent' ? 3 : 1),
        }

        const realData: any = {
          student: {
            id: linkedStudentId,
            name: student?.fullName || 'أحمد فيصل الغامدي',
            email: 'student1@nexusedu.sa',
            grade: student?.grade || 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى',
          },
          summary: {
            totalSubjects: 4,
            pendingAssignments: pendingHw.length,
            completedAssignments: completedHw.length + mySubmissions.filter(s => s.status === 'submitted').length,
            averageGrade: student?.averageGrade || 95,
            totalLessons: 68,
          },
          upcomingAssignments,
          attendance,
          subjectPerformance,
          gamification,
          weeklyActivity: [
            { label: 'الأحد', submissions: 2, attended: 1 },
            { label: 'الاثنين', submissions: 3, attended: 1 },
            { label: 'الثلاثاء', submissions: 1, attended: 1 },
            { label: 'الأربعاء', submissions: mySubmissions.length || 2, attended: myAtt?.overallStatus === 'present' ? 1 : 1 },
            { label: 'الخميس', submissions: 2, attended: 1 },
            { label: 'الجمعة', submissions: 0, attended: 0 },
            { label: 'السبت', submissions: 0, attended: 0 },
          ],
        }

        setData(realData)
        setUsingFallback(false)

        // Load schedule
        const { CLASS_SCHEDULE, SCHOOL_TIMETABLE } = await import('@/lib/nexusDataBridge')
        setScheduleData(CLASS_SCHEDULE || [])
        setSchoolTimetableData(SCHOOL_TIMETABLE || [])

        // Get student ID
        setStudentLinkedId(linkedStudentId)

        // Load homework
        const hw = nexusBridge.getHomework()
        const allHwSubs = nexusBridge.getHomeworkSubmissions()
        setHomeworkData(hw)
        setHwSubmissionsData(allHwSubs)

        // Load certs & gamification
        const certs = nexusBridge.getCertificates(linkedStudentId)
        setCertsData(certs)
        const hwSubsMine = allHwSubs.filter(s => s.studentId === linkedStudentId)
        const xp = (certs.length*500) + (hwSubsMine.length*150)
        setGamificationData({ level: Math.min(10, Math.floor(xp/500)+1), totalXP: xp, streakDays: hwSubsMine.length>0?7:3, achievementsUnlocked: certs.length })
        
      } catch (e) {
        console.error('nexusBridge student load error:', e)
        setData(FALLBACK_STUDENT_DATA)
        setUsingFallback(true)
      } finally {
        setLoading(false)
      }
    }

    load()
    window.addEventListener('nexus:data-changed', load as any)
    return () => window.removeEventListener('nexus:data-changed', load as any)
  }, [])

  useRealtimeAssignments(useCallback((a: any) => {
    setLiveAssignments(p => [a, ...p].slice(0, 3))
    setLiveNotif(`📌 واجب جديد: ${a.title}`)
    setTimeout(() => setLiveNotif(null), 5000)
  }, []))

  useRealtimeNotifications(useCallback((n: any) => {
    setLiveNotif(n.title)
    setTimeout(() => setLiveNotif(null), 4000)
  }, []))

  const handleHwSubmit = async () => {
    if (!selectedHwId || !hwAnswer.trim()) return
    setHwSubmitting(true)
    try {
      const { nexusBridge } = await import('@/lib/nexusDataBridge')
      nexusBridge.submitHomework({
        assignmentId: selectedHwId,
        studentId: studentLinkedId,
        studentName: data?.student?.name || 'الطالب',
        assignmentTitle: homeworkData.find(h=>h.id===selectedHwId)?.title || '',
        submissionText: hwAnswer,
      })
      const hw = nexusBridge.getHomework()
      const hwSubs = nexusBridge.getHomeworkSubmissions()
      setHomeworkData(hw)
      setHwSubmissionsData(hwSubs)
      setSelectedHwId(null)
      setHwAnswer('')
      window.dispatchEvent(new CustomEvent('nexus:data-changed'))
    } catch (e) { console.error(e) }
    finally { setHwSubmitting(false) }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
      <div className="relative w-20 h-20">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 rounded-full border-4 border-violet-500/20 border-t-violet-600" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-violet-400 animate-pulse" />
        </div>
      </div>
      <p className="text-sm text-gray-500 font-medium animate-pulse">جاري تحميل لوحة تحكمك...</p>
    </div>
  )

  const { student, summary, upcomingAssignments, attendance, subjectPerformance, gamification, weeklyActivity } = data
  const attTotal = attendance.present + attendance.absent + attendance.late + attendance.excused
  const attPct = attTotal > 0 ? Math.round((attendance.present / attTotal) * 100) : 0
  const avgGrade = Math.round(summary.averageGrade || 0)
  const completionPct = (summary.pendingAssignments + summary.completedAssignments) > 0
    ? Math.round((summary.completedAssignments / (summary.pendingAssignments + summary.completedAssignments)) * 100) : 0

  const radarData = subjectPerformance.slice(0, 6).map(s => ({ subject: s.name.substring(0, 8), value: Math.round(s.averageGrade || 0) }))
  const weeklyData = weeklyActivity.map(w => ({ name: w.label, تسليمات: w.submissions, حضور: w.attended }))
  const subjectBarData = subjectPerformance.map(s => ({ name: s.name.substring(0, 8), درجة: Math.round(s.averageGrade || 0) }))
  const allAssignments = [...liveAssignments, ...(upcomingAssignments || [])].slice(0, 7)

  return (
    <div className="space-y-8 pb-16" dir="rtl">
      {/* Live Toast */}
      <AnimatePresence>
        {liveNotif && (
          <motion.div initial={{ opacity: 0, y: -50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -30, scale: 0.9 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/10 text-gray-900 dark:text-white px-5 py-3 rounded-2xl shadow-2xl shadow-violet-500/10 flex items-center gap-3 text-sm font-bold whitespace-nowrap">
            <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
              <Bell className="w-4 h-4 text-violet-600" />
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
          <span>عرض بيانات تجريبية — تعذر الاتصال بالخادم</span>
          <button onClick={() => window.location.reload()} className="underline font-black hover:no-underline mr-auto">إعادة الاتصال</button>
        </motion.div>
      )}

      {/* ─── HERO BANNER ─── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 180 }}
        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#4c1d95] via-[#6d28d9] to-[#4338ca] p-8 md:p-10 text-white shadow-[0_20px_60px_rgba(109,40,217,0.3)]">
        {/* Animated orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div animate={{ rotate: 360, scale: [1, 1.15, 1] }} transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
            className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-violet-400/20 blur-3xl" />
          <motion.div animate={{ rotate: -360, scale: [1, 1.2, 1] }} transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
            className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-indigo-400/20 blur-3xl" />
          <motion.div animate={{ x: [0, 30, 0], y: [0, -20, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full bg-purple-300/10 blur-2xl" />
        </div>

        <div className="relative z-10 flex flex-col xl:flex-row items-center justify-between gap-8">
          <div className="w-full xl:w-auto">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md mb-4">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
              <span className="text-xs font-bold text-violet-100">مرحباً بعودتك! 👋</span>
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="text-4xl md:text-5xl font-black mb-2 tracking-tight">
              {student.name}
            </motion.h1>
            <p className="text-violet-200 text-sm font-medium mb-6">يوم تعليمي رائع بانتظارك! استمر في التميز 🌟</p>

            {/* Gamification Badges */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="flex flex-wrap items-center gap-3 mb-6">
              {[
                { icon: Star, label: 'المستوى', value: `${gamification.level}`, bg: 'from-yellow-400 to-yellow-300', iconColor: 'text-yellow-900' },
                { icon: Flame, label: 'أيام متواصلة', value: `${gamification.streakDays}🔥`, bg: 'from-orange-500 to-orange-400', iconColor: 'text-white' },
                { icon: Zap, label: 'نقاط XP', value: `${gamification.totalXP.toLocaleString()}`, bg: 'from-cyan-500 to-blue-500', iconColor: 'text-white' },
                { icon: Trophy, label: 'أوسمة', value: `${gamification.achievementsUnlocked}`, bg: 'from-rose-400 to-pink-500', iconColor: 'text-white' },
              ].map((b, i) => (
                <motion.div key={i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 + i * 0.08 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="bg-white/10 border border-white/15 backdrop-blur-md px-4 py-2.5 rounded-2xl flex items-center gap-3 shadow-inner">
                  <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${b.bg} flex items-center justify-center shadow-sm`}>
                    <b.icon className={`w-3.5 h-3.5 ${b.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-[10px] text-violet-200 font-medium leading-none">{b.label}</p>
                    <p className="text-sm font-black leading-tight">{b.value}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* XP Progress Bar */}
            <div className="max-w-md bg-black/20 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
              <div className="flex justify-between items-end mb-2">
                <span className="text-xs font-bold text-violet-100 flex items-center gap-1.5">
                  <Trophy className="w-3 h-3 text-yellow-400" /> الطريق للمستوى {gamification.level + 1}
                </span>
                <span className="text-xs font-black bg-white/20 px-2 py-0.5 rounded text-white">{gamification.totalXP % 1000} / 1000 XP</span>
              </div>
              <div className="h-3 bg-black/30 rounded-full overflow-hidden">
                <motion.div className="h-full bg-gradient-to-r from-yellow-400 via-orange-400 to-rose-400 rounded-full relative"
                  initial={{ width: 0 }} animate={{ width: `${(gamification.totalXP % 1000) / 10}%` }}
                  transition={{ duration: 2, ease: 'easeOut', delay: 0.6 }}>
                  <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:1.5rem_1.5rem] opacity-60" />
                </motion.div>
              </div>
            </div>
          </div>

          {/* Progress Rings */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}
            className="flex justify-center gap-6 md:gap-10 bg-black/10 p-7 rounded-[2rem] border border-white/10 backdrop-blur-md">
            <ProgressRing pct={attPct} color="#34d399" label="نسبة الحضور" value={`${attPct}%`} size={95} />
            <div className="w-px h-20 bg-white/10 self-center" />
            <ProgressRing pct={avgGrade} color="#fcd34d" label="المعدل العام" value={`${avgGrade}%`} size={95} />
            <div className="w-px h-20 bg-white/10 self-center" />
            <ProgressRing pct={completionPct} color="#60a5fa" label="إنجاز الواجبات" value={`${completionPct}%`} size={95} />
          </motion.div>
        </div>
      </motion.div>

      {/* ── TAB BAR ── */}
      <div className="flex gap-2 bg-gray-100/80 dark:bg-white/5 p-1.5 rounded-2xl overflow-x-auto">
        {[
          { key: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
          { key: 'schedule', label: 'جدول الحصص', icon: Calendar },
          { key: 'homework', label: 'الواجبات', icon: BookOpen },
          { key: 'certificates', label: 'الإنجازات', icon: Trophy },
          { key: 'games', label: 'الألعاب', icon: Gamepad2 },
          { key: 'curriculum', label: 'المناهج', icon: GraduationCap },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveStudentTab(t.key as any)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex-shrink-0 ${
              activeStudentTab === t.key
                ? 'bg-white dark:bg-[#1e1e2d] text-violet-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {activeStudentTab === 'dashboard' && (<>
      {/* ─── STATS GRID ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: BookOpen, label: 'المواد المسجلة', value: summary.totalSubjects, color: '#8b5cf6', sub: 'مادة دراسية' },
          { icon: FileText, label: 'واجبات للحل', value: summary.pendingAssignments, color: '#f59e0b', sub: 'بانتظار التسليم' },
          { icon: CheckCircle2, label: 'واجبات سلّمت', value: summary.completedAssignments, color: '#10b981', sub: 'مهمة منجزة' },
          { icon: Award, label: 'أوسمة الإنجاز', value: gamification.achievementsUnlocked, color: '#ec4899', sub: 'وسام مفتوح' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.08 }}>
            <StatChip {...s} />
          </motion.div>
        ))}
      </div>

      {/* ─── QUICK NAV ─── */}
      <QuickNavGrid />

      {/* ─── CHARTS ROW ─── */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Radar */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
          className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-[2rem] p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
              <Target className="w-4 h-4 text-violet-500" />
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900 dark:text-white text-sm">الأداء الشامل</h3>
              <p className="text-[10px] text-gray-500">مقارنة بين المواد</p>
            </div>
          </div>
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <PolarGrid stroke="currentColor" className="text-gray-200 dark:text-gray-800" strokeDasharray="3 3" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 600 }} />
                <Radar name="الأداء" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.35} strokeWidth={2.5} />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          ) : <div className="h-[220px] flex items-center justify-center"><p className="text-gray-400 text-sm">لا توجد بيانات كافية</p></div>}
        </motion.div>

        {/* Weekly Area Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-[2rem] p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900 dark:text-white text-sm">النشاط الأسبوعي</h3>
              <p className="text-[10px] text-gray-500">آخر 7 أيام</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={weeklyData} margin={{ top: 10, right: 0, left: -30, bottom: 0 }}>
              <defs>
                <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-gray-100 dark:text-gray-800/50" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="تسليمات" stroke="#8b5cf6" fill="url(#gS)" strokeWidth={2.5} activeDot={{ r: 5, strokeWidth: 0 }} />
              <Area type="monotone" dataKey="حضور" stroke="#38bdf8" fill="url(#gA)" strokeWidth={2.5} activeDot={{ r: 5, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Subject Bar Chart */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
          className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-[2rem] p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900 dark:text-white text-sm">درجات المواد</h3>
              <p className="text-[10px] text-gray-500">مقارنة تفصيلية</p>
            </div>
          </div>
          {subjectBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={subjectBarData} margin={{ top: 10, right: 0, left: -30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-gray-100 dark:text-gray-800/50" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9ca3af' }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9ca3af' }} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="درجة" radius={[6, 6, 0, 0]} maxBarSize={32}>
                  {subjectBarData.map((entry, index) => (
                    <Cell key={index} fill={entry.درجة >= 85 ? '#10b981' : entry.درجة >= 65 ? '#f59e0b' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-[220px] flex items-center justify-center"><p className="text-gray-400 text-sm">لا توجد بيانات</p></div>}
        </motion.div>
      </div>

      {/* ─── MAIN CONTENT + SIDEBAR ─── */}
      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        <AssignmentsTimeline assignments={allAssignments} liveCount={liveAssignments.length} />

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          <AiInsightCard />
          <PomodoroTimer />
          <AchievementsShowcase count={gamification.achievementsUnlocked} />
        </div>
      </div>

      {/* ─── SUBJECTS DETAILED CARDS ─── */}
      {subjectPerformance.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <h3 className="font-extrabold text-gray-900 dark:text-white text-xl mb-5 flex items-center gap-2 px-1">
            <Target className="w-6 h-6 text-violet-500" /> تحليل أداء المواد التفصيلي
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {subjectPerformance.map((s, i) => {
              const pct = Math.min(Math.round(s.averageGrade || 0), 100)
              const color = pct >= 85 ? '#10b981' : pct >= 65 ? '#f59e0b' : '#ef4444'
              const label = pct >= 85 ? 'مستوى ممتاز ✨' : pct >= 65 ? 'أداء جيد 👍' : 'يحتاج للتحسين ⚠️'
              return (
                <motion.div key={s.id}
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.08 * i, type: 'spring', stiffness: 200 }}
                  whileHover={{ y: -4, scale: 1.01 }}
                  className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-3xl p-5 shadow-sm overflow-hidden relative cursor-default">
                  <div className="absolute -top-10 -right-10 w-24 h-24 blur-2xl opacity-20 rounded-full" style={{ backgroundColor: color }} />
                  <div className="flex items-start justify-between mb-4 relative z-10">
                    <div>
                      <p className="font-extrabold text-sm text-gray-900 dark:text-white truncate max-w-[160px]">{s.name}</p>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">{s.teacher}</p>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl font-black text-lg" style={{ backgroundColor: `${color}15`, color, border: `1px solid ${color}25` }}>
                      {pct}%
                    </div>
                  </div>
                  <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-3 relative z-10">
                    <motion.div className="h-full rounded-full relative" style={{ backgroundColor: color }}
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.5, delay: 0.15 * i }}>
                      <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.25)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.25)_50%,rgba(255,255,255,0.25)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] opacity-60" />
                    </motion.div>
                  </div>
                  <div className="flex justify-between items-center text-[11px] font-medium relative z-10">
                    <span className="text-gray-400">{s.totalLessons} درس • {s.submittedAssignments}/{s.totalAssignments} واجب</span>
                    <span style={{ color }} className="font-bold">{label}</span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      )}
      </>)}

      {activeStudentTab === 'schedule' && (
        <motion.div key="schedule" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="space-y-6">
          {/* Hero */}
          <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-[2rem] p-6 text-white">
            <h2 className="text-2xl font-black mb-1">📅 جدول الحصص الأسبوعي</h2>
            <p className="text-violet-200 text-sm">جدول فصل د. إسماعيل عيسى — الصف الأول الابتدائي</p>
          </div>
          {/* School timetable */}
          <div className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl p-5 shadow-sm">
            <h3 className="font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-violet-500" />توقيت اليوم الدراسي</h3>
            <div className="space-y-2">
              {SCHOOL_TIMETABLE_DATA.map((slot, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-2xl text-sm ${
                  slot.type==='break'?'bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20':
                  slot.type==='prayer'?'bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20':
                  slot.type==='dismissal'?'bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20':
                  'bg-gray-50 dark:bg-white/5'
                }`}>
                  <span className="font-black text-gray-400 w-8 text-center text-xs">{slot.order}</span>
                  <span className="font-bold text-gray-900 dark:text-white flex-1">{slot.name}</span>
                  <span className="text-xs text-gray-500 font-mono">{slot.startTime} — {slot.endTime}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Weekly grid */}
          {['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس'].map((day, dayIdx) => {
            const dayPeriods = scheduleData.filter(p => p.dayOfWeek === dayIdx)
            return (
              <div key={day} className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl p-5 shadow-sm">
                <h4 className="font-black text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-500/10 flex items-center justify-center text-xs font-black text-violet-600">{dayIdx+1}</div>
                  {day}
                </h4>
                <div className="space-y-2">
                  {dayPeriods.length===0 ? <p className="text-gray-400 text-sm text-center py-4">لا توجد حصص</p> :
                    dayPeriods.sort((a,b)=>a.periodNumber-b.periodNumber).map((period, pi) => {
                      const subjectColors: Record<string,string> = {
                        'اللغة العربية': 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-300',
                        'القرآن الكريم': 'bg-green-50 border-green-200 text-green-800 dark:bg-green-500/10 dark:border-green-500/30 dark:text-green-300',
                        'التربية الإسلامية': 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300',
                        'الرياضيات': 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300',
                        'العلوم': 'bg-teal-50 border-teal-200 text-teal-800 dark:bg-teal-500/10 dark:border-teal-500/30 dark:text-teal-300',
                        'فن': 'bg-pink-50 border-pink-200 text-pink-800 dark:bg-pink-500/10 dark:border-pink-500/30 dark:text-pink-300',
                      };
                      const color = subjectColors[period.subjectName] || 'bg-gray-50 border-gray-200 text-gray-800 dark:bg-gray-500/10 dark:border-gray-500/30 dark:text-gray-300';
                      const subjectEmojis: Record<string,string> = {'اللغة العربية':'📖','القرآن الكريم':'📿','التربية الإسلامية':'🕌','الرياضيات':'🔢','العلوم':'🔬','فن':'🎨'};
                      return (
                        <div key={pi} className={`flex items-center gap-3 p-3 rounded-2xl border text-sm ${color}`}>
                          <span className="text-lg">{subjectEmojis[period.subjectName]||'📚'}</span>
                          <div className="flex-1">
                            <p className="font-bold">{period.subjectName}</p>
                            <p className="text-xs opacity-70">{period.startTime} — {period.endTime}</p>
                          </div>
                          <div className="text-xs font-bold opacity-60">حصة {period.periodNumber}</div>
                        </div>
                      )
                    })
                  }
                </div>
              </div>
            )
          })}
        </motion.div>
      )}

      {activeStudentTab === 'homework' && (
        <motion.div key="hw" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="space-y-4">
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-[2rem] p-6 text-white">
            <h2 className="text-2xl font-black mb-1">📝 الواجبات المدرسية</h2>
            <p className="text-amber-100 text-sm">واجباتك من د. إسماعيل عيسى</p>
          </div>
          {homeworkData.map((hw, i) => {
            const submitted = hwSubmissionsData.find(s => s.assignmentId === hw.id && s.studentId === studentLinkedId)
            return (
              <motion.div key={hw.id} initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} transition={{delay:i*0.06}} whileHover={{y:-2}}
                className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-2xl flex-shrink-0">📚</div>
                  <div className="flex-1">
                    <h3 className="font-black text-gray-900 dark:text-white">{hw.title}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{hw.subject} • تسليم: {hw.dueDate}</p>
                    {hw.description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{hw.description}</p>}
                  </div>
                  <div>
                    {submitted ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-black">
                        <CheckCircle2 className="w-3.5 h-3.5" />مُسلَّم
                      </span>
                    ) : (
                      <button onClick={() => setSelectedHwId(hw.id)}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black transition-colors">
                        تسليم الواجب
                      </button>
                    )}
                  </div>
                </div>
                {submitted && submitted.grade && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-gray-500">الدرجة</span>
                        <span className="text-sm font-black text-emerald-600">{submitted.grade}/100</span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" style={{width:`${submitted.grade}%`}} />
                      </div>
                    </div>
                    {submitted.teacherComment && <p className="text-xs text-gray-500 italic">💬 {submitted.teacherComment}</p>}
                  </div>
                )}
              </motion.div>
            )
          })}
          {/* Submission Modal */}
          {selectedHwId && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
                className="bg-white dark:bg-[#1e1e2d] rounded-3xl p-6 w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-black text-gray-900 dark:text-white">تسليم الواجب</h3>
                  <button onClick={() => {setSelectedHwId(null); setHwAnswer('')}} className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-gray-500 mb-4">{homeworkData.find(h=>h.id===selectedHwId)?.title}</p>
                <textarea value={hwAnswer} onChange={e=>setHwAnswer(e.target.value)} rows={4} placeholder="اكتب إجابتك هنا..."
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-medium text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/50" />
                <button onClick={handleHwSubmit} disabled={!hwAnswer.trim() || hwSubmitting}
                  className="w-full mt-4 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-black text-sm hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 transition-all">
                  {hwSubmitting ? '⏳ جارٍ التسليم...' : '✅ تسليم الواجب'}
                </button>
              </motion.div>
            </div>
          )}
        </motion.div>
      )}

      {activeStudentTab === 'certificates' && (
        <motion.div key="certs" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="space-y-4">
          <div className="bg-gradient-to-br from-amber-400 to-yellow-500 rounded-[2rem] p-6 text-white">
            <h2 className="text-2xl font-black mb-1">🏆 الإنجازات والشهادات</h2>
            <p className="text-amber-100 text-sm">شهاداتك وأوسمة التميز</p>
          </div>
          {/* Gamification stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'المستوى', value: gamificationData.level, icon: '⭐', color: 'from-violet-500 to-purple-600' },
              { label: 'النقاط الكلية', value: gamificationData.totalXP, icon: '💎', color: 'from-blue-500 to-indigo-600' },
              { label: 'أيام متتالية', value: `${gamificationData.streakDays} يوم`, icon: '🔥', color: 'from-orange-500 to-red-500' },
            ].map((s,i) => (
              <div key={i} className={`bg-gradient-to-br ${s.color} rounded-2xl p-4 text-white`}>
                <div className="text-xl mb-1">{s.icon}</div>
                <p className="text-lg font-black">{s.value}</p>
                <p className="text-[10px] opacity-80 font-bold">{s.label}</p>
              </div>
            ))}
          </div>
          {/* Certificates */}
          {certsData.length > 0 ? (
            <div className="space-y-3">
              {certsData.map((cert, i) => (
                <motion.div key={cert.id} initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} transition={{delay:i*0.08}} whileHover={{y:-2}}
                  className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-amber-200/50 dark:border-amber-500/20 rounded-3xl p-5 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-2xl flex-shrink-0">🏆</div>
                    <div className="flex-1">
                      <h3 className="font-black text-gray-900 dark:text-white">{cert.programTitle || cert.title}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">{cert.achievementText || cert.description}</p>
                      <p className="text-xs text-amber-600 font-bold mt-1">#{cert.serialNumber || cert.id}</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-black text-amber-600">{cert.score}%</div>
                      <p className="text-[10px] text-gray-500 font-bold">الدرجة</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="text-6xl">🏅</div>
              <p className="font-bold text-gray-500">لا توجد شهادات بعد — استمر في التميز!</p>
            </div>
          )}
        </motion.div>
      )}

      {activeStudentTab === 'games' && (
        <motion.div key="games" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="space-y-4">
          <div className="bg-gradient-to-br from-fuchsia-600 to-pink-600 rounded-[2rem] p-6 text-white">
            <h2 className="text-2xl font-black mb-1">🎮 الألعاب التعليمية</h2>
            <p className="text-fuchsia-100 text-sm">تعلم وإستمتع بالألعاب التفاعلية</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { title: 'تحدي الإملاء', icon: '✏️', color: 'from-blue-500 to-indigo-600', desc: 'تدرب على الإملاء الصحيح', link: '/student/games' },
              { title: 'حساب سريع', icon: '🔢', color: 'from-amber-500 to-orange-600', desc: 'تحدي العمليات الحسابية', link: '/student/games' },
              { title: 'القرآن الكريم', icon: '📿', color: 'from-green-500 to-emerald-600', desc: 'حفظ وترتيل القرآن', link: '/student/games' },
              { title: 'العلوم الممتعة', icon: '🔬', color: 'from-teal-500 to-cyan-600', desc: 'اكتشف عالم العلوم', link: '/student/games' },
              { title: 'الكلمات المتقاطعة', icon: '🧩', color: 'from-violet-500 to-purple-600', desc: 'لغة عربية بطريقة ممتعة', link: '/student/games' },
              { title: 'تحدي المليون', icon: '🏆', color: 'from-rose-500 to-pink-600', desc: 'مسابقة المعلومات الكبرى', link: '/student/million' },
            ].map((g, i) => (
              <motion.a key={i} href={g.link} whileHover={{y:-4,scale:1.02}} className={`bg-gradient-to-br ${g.color} rounded-3xl p-5 text-white text-center cursor-pointer block`}>
                <div className="text-3xl mb-2">{g.icon}</div>
                <h3 className="font-black text-sm mb-0.5">{g.title}</h3>
                <p className="text-[10px] opacity-80">{g.desc}</p>
              </motion.a>
            ))}
          </div>
        </motion.div>
      )}

      {activeStudentTab === 'curriculum' && (
        <motion.div key="curriculum" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="space-y-4">
          <div className="bg-gradient-to-br from-teal-500 to-cyan-600 rounded-[2rem] p-6 text-white">
            <h2 className="text-2xl font-black mb-1">📚 المناهج الدراسية</h2>
            <p className="text-teal-100 text-sm">مواد وكتب الصف الأول الابتدائي</p>
          </div>
          <div className="grid gap-4">
            {[
              { name: 'اللغة العربية', emoji: '📖', desc: 'قراءة وكتابة وقواعد اللغة العربية', lessons: 18, color: 'from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10', border: 'border-blue-200 dark:border-blue-500/30', text: 'text-blue-800 dark:text-blue-300' },
              { name: 'القرآن الكريم', emoji: '📿', desc: 'حفظ وتجويد القرآن الكريم', lessons: 16, color: 'from-green-50 to-emerald-50 dark:from-green-500/10 dark:to-emerald-500/10', border: 'border-green-200 dark:border-green-500/30', text: 'text-green-800 dark:text-green-300' },
              { name: 'الرياضيات', emoji: '🔢', desc: 'الأعداد والعمليات الحسابية', lessons: 20, color: 'from-amber-50 to-yellow-50 dark:from-amber-500/10 dark:to-yellow-500/10', border: 'border-amber-200 dark:border-amber-500/30', text: 'text-amber-800 dark:text-amber-300' },
              { name: 'العلوم', emoji: '🔬', desc: 'علوم الطبيعة والبيئة', lessons: 14, color: 'from-teal-50 to-cyan-50 dark:from-teal-500/10 dark:to-cyan-500/10', border: 'border-teal-200 dark:border-teal-500/30', text: 'text-teal-800 dark:text-teal-300' },
              { name: 'التربية الإسلامية', emoji: '🕌', desc: 'الفقه والعقيدة والسيرة', lessons: 12, color: 'from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10', border: 'border-emerald-200 dark:border-emerald-500/30', text: 'text-emerald-800 dark:text-emerald-300' },
              { name: 'الفن والتربية البصرية', emoji: '🎨', desc: 'الرسم والألوان والإبداع', lessons: 8, color: 'from-pink-50 to-rose-50 dark:from-pink-500/10 dark:to-rose-500/10', border: 'border-pink-200 dark:border-pink-500/30', text: 'text-pink-800 dark:text-pink-300' },
            ].map((subj, i) => (
              <motion.div key={i} initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} transition={{delay:i*0.06}} whileHover={{y:-2}}
                className={`bg-gradient-to-br ${subj.color} border ${subj.border} rounded-3xl p-5 shadow-sm`}>
                <div className="flex items-center gap-4">
                  <div className="text-3xl">{subj.emoji}</div>
                  <div className="flex-1">
                    <h3 className={`font-black ${subj.text}`}>{subj.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{subj.desc}</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-xl font-black ${subj.text}`}>{subj.lessons}</p>
                    <p className="text-[10px] text-gray-500 font-bold">حصة</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

    </div>
  )
}
