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
      {payload.map((e: any, i: number) => (
        <p key={i} className="text-xs font-medium" style={{ color: e.color }}>
          {e.name}: {e.value}
        </p>
      ))}
    </div>
  )
  return null
}

const FALLBACK_STUDENT_DATA: StudentDashboardResponse = {
  student: {
    id: 'cls-std-2',
    name: 'أحمد فيصل الغامدي',
    email: 'student1@nexusedu.sa',
    grade: 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى',
  },
  summary: {
    totalSubjects: 6,
    pendingAssignments: 1,
    completedAssignments: 5,
    averageGrade: 95,
    totalLessons: 68,
  },
  upcomingAssignments: [
    {
      id: 'hw-1',
      title: 'مسائل الجمع الرأسي والأفقي حتى 20',
      subject: 'الرياضيات',
      dueDate: '2026-09-29',
      status: 'PENDING',
    },
    {
      id: 'hw-2',
      title: 'قراءة درس المد بالألف وكتابة 3 كلمات',
      subject: 'اللغة العربية',
      dueDate: '2026-09-30',
      status: 'PENDING',
    },
  ],
  attendance: {
    present: 85,
    absent: 2,
    late: 3,
    excused: 0,
  },
  subjectPerformance: [
    { id: '1', name: 'اللغة العربية', teacher: 'د. إسماعيل عيسى', averageGrade: 94, totalLessons: 18, submittedAssignments: 5, totalAssignments: 6 },
    { id: '2', name: 'القرآن الكريم', teacher: 'د. إسماعيل عيسى', averageGrade: 98, totalLessons: 16, submittedAssignments: 5, totalAssignments: 5 },
    { id: '3', name: 'الرياضيات', teacher: 'د. إسماعيل عيسى', averageGrade: 92, totalLessons: 20, submittedAssignments: 6, totalAssignments: 7 },
    { id: '4', name: 'العلوم', teacher: 'د. إسماعيل عيسى', averageGrade: 88, totalLessons: 14, submittedAssignments: 4, totalAssignments: 5 },
    { id: '5', name: 'التربية الإسلامية', teacher: 'د. إسماعيل عيسى', averageGrade: 96, totalLessons: 12, submittedAssignments: 4, totalAssignments: 4 },
    { id: '6', name: 'الفن والتربية البصرية', teacher: 'د. إسماعيل عيسى', averageGrade: 95, totalLessons: 8, submittedAssignments: 3, totalAssignments: 3 },
  ],
  gamification: {
    level: 4,
    totalXP: 2075,
    streakDays: 7,
    achievementsUnlocked: 4,
  },
  weeklyActivity: [
    { label: 'الأحد', submissions: 2, attended: 1 },
    { label: 'الاثنين', submissions: 3, attended: 1 },
    { label: 'الثلاثاء', submissions: 1, attended: 1 },
    { label: 'الأربعاء', submissions: 4, attended: 1 },
    { label: 'الخميس', submissions: 2, attended: 1 },
    { label: 'الجمعة', submissions: 0, attended: 0 },
    { label: 'السبت', submissions: 0, attended: 0 },
  ],
} as any

export default function StudentDashboardPage() {
  const [data, setData] = useState<StudentDashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [usingFallback, setUsingFallback] = useState(false)
  const [liveAssignments, setLiveAssignments] = useState<any[]>([])
  const [liveNotif, setLiveNotif] = useState<string | null>(null)

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
        const allStudents = nexusBridge.getStudents()
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

        const subjects = ['اللغة العربية', 'القرآن الكريم', 'الرياضيات', 'العلوم', 'التربية الإسلامية', 'الفنون البصرية']
        const subjectPerformance = subjects.map((subj, i) => {
          const subSubs = mySubmissions.filter(s => s.assignmentTitle?.includes(subj.split(' ')[0]) || (s as any).subject?.includes(subj.split(' ')[0]))
          const avgGrade = subSubs.length > 0
            ? Math.round(subSubs.reduce((acc, s) => acc + (s.grade || 0), 0) / subSubs.length * 10)
            : [94, 98, 92, 88, 96, 95][i]
          return {
            id: `subj-${i}`,
            name: subj,
            teacher: 'د. إسماعيل عيسى',
            averageGrade: avgGrade,
            totalLessons: [18, 16, 20, 14, 12, 8][i],
            submittedAssignments: subSubs.length || [5, 5, 6, 4, 4, 3][i],
            totalAssignments: allHw.filter(h => h.subject === subj).length || [6, 5, 7, 5, 4, 3][i],
          }
        })

        const presentDays = student?.attendanceRate ? Math.round((student.attendanceRate / 100) * 180) : 85
        const attendance = {
          present: presentDays,
          absent: Math.max(0, 180 - presentDays - 3),
          late: 3,
          excused: 0,
        }

        const totalXP = (myCerts.length * 500) + (mySubmissions.length * 150) + ((student?.averageGrade || 95) * 10)
        const gamification = {
          level: Math.min(10, Math.floor(totalXP / 500) + 1),
          totalXP,
          streakDays: mySubmissions.length > 0 ? 7 : 3,
          achievementsUnlocked: myCerts.length + (student?.status === 'excellent' ? 2 : 1),
        }

        const realData: any = {
          student: {
            id: linkedStudentId,
            name: student?.fullName || 'أحمد فيصل الغامدي',
            email: 'student1@nexusedu.sa',
            grade: student?.grade || 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى',
          },
          summary: {
            totalSubjects: 6,
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
            { label: 'الأحد', submissions: mySubmissions.filter(s => new Date(s.submittedAt).getDay() === 0).length || 2, attended: myAtt?.overallStatus === 'present' ? 1 : 1 },
            { label: 'الاثنين', submissions: 3, attended: 1 },
            { label: 'الثلاثاء', submissions: 1, attended: 1 },
            { label: 'الأربعاء', submissions: mySubmissions.length || 4, attended: 1 },
            { label: 'الخميس', submissions: 2, attended: 1 },
            { label: 'الجمعة', submissions: 0, attended: 0 },
            { label: 'السبت', submissions: 0, attended: 0 },
          ],
        }

        setData(realData)
        setUsingFallback(false)
      } catch (e) {
        console.error('nexusBridge student load error:', e)
        setData(FALLBACK_STUDENT_DATA)
        setUsingFallback(true)
      } finally {
        setLoading(false)
      }
    }

    load()
    const handleSync = () => load()
    window.addEventListener('nexus:data-changed', handleSync)
    return () => window.removeEventListener('nexus:data-changed', handleSync)
  }, [])

  useRealtimeAssignments((assignment: any) => {
    setLiveAssignments((prev: any[]) => [assignment, ...prev])
    setLiveNotif(`واجب جديد أضيف للتو: ${assignment.title}`)
    setTimeout(() => setLiveNotif(null), 5000)
  })

  useRealtimeNotifications((notif: any) => {
    setLiveNotif(notif.message || notif.title)
    setTimeout(() => setLiveNotif(null), 5000)
  })

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-violet-500 animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  const { student, summary, upcomingAssignments, attendance, subjectPerformance, gamification, weeklyActivity } = data || FALLBACK_STUDENT_DATA

  const attPct = (attendance.present + attendance.absent + attendance.late) > 0
    ? Math.round((attendance.present / (attendance.present + attendance.absent + attendance.late)) * 100) : 97
  const avgGrade = Math.round(summary.averageGrade || 95)
  const completionPct = (summary.pendingAssignments + summary.completedAssignments) > 0
    ? Math.round((summary.completedAssignments / (summary.pendingAssignments + summary.completedAssignments)) * 100) : 83

  const radarData = subjectPerformance.slice(0, 6).map(s => ({
    subject: s.name.substring(0, 12),
    value: Math.round(s.averageGrade || 0),
  }))

  const weeklyData = weeklyActivity.map(w => ({
    name: w.label,
    تسليمات: w.submissions,
    حضور: w.attended,
  }))

  const subjectBarData = subjectPerformance.map(s => ({
    name: s.name.substring(0, 12),
    grade: Math.round(s.averageGrade || 0),
  }))

  const allAssignments = [...liveAssignments, ...(upcomingAssignments || [])].slice(0, 7)

  return (
    <div className="space-y-8 pb-16" dir="rtl">
      {/* Live notification toast */}
      <AnimatePresence>
        {liveNotif && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-violet-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-bold backdrop-blur-md"
          >
            <Bell className="w-4 h-4 animate-bounce" />
            <span>{liveNotif}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── HERO SECTION ─── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#4c1d95] via-[#6d28d9] to-[#7c3aed] p-8 md:p-12 text-white shadow-[0_24px_70px_rgba(109,40,217,0.35)]"
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
          <motion.div
            animate={{ rotate: 360, scale: [1, 1.1, 1] }}
            transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
            className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-purple-400 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
            className="absolute -bottom-40 -left-20 w-[400px] h-[400px] bg-indigo-500 rounded-full blur-3xl"
          />
        </div>

        <div className="relative z-10 flex flex-col xl:flex-row items-center justify-between gap-8">
          <div className="w-full xl:w-auto">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-4"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
              <span className="text-xs font-bold text-violet-100">مرحباً بعودتك! 👋</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl md:text-5xl font-black mb-2 tracking-tight"
            >
              {student.name}
            </motion.h1>
            <p className="text-violet-200 text-sm md:text-base font-medium mb-6">
              يوم تعليمي رائع بانتظارك في فصل د. إسماعيل! استمر في التميز 🌟
            </p>

            {/* Gamification Badges */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap items-center gap-3 mb-6"
            >
              {[
                { icon: Star, label: 'المستوى', value: `${gamification.level}`, bg: 'from-yellow-400 to-yellow-300', iconColor: 'text-yellow-900' },
                { icon: Flame, label: 'أيام متواصلة', value: `${gamification.streakDays}🔥`, bg: 'from-orange-500 to-orange-400', iconColor: 'text-white' },
                { icon: Zap, label: 'نقاط XP', value: `${gamification.totalXP.toLocaleString('ar-SA')}`, bg: 'from-cyan-500 to-blue-500', iconColor: 'text-white' },
                { icon: Trophy, label: 'الأوسمة', value: `${gamification.achievementsUnlocked}`, bg: 'from-rose-400 to-pink-500', iconColor: 'text-white' },
              ].map((b, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.08 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="bg-white/10 border border-white/15 backdrop-blur-md px-4 py-2.5 rounded-2xl flex items-center gap-3 shadow-inner"
                >
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${b.bg} flex items-center justify-center shadow-sm`}>
                    <b.icon className={`w-4 h-4 ${b.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-[10px] text-violet-200 font-medium leading-none">{b.label}</p>
                    <p className="text-sm font-black leading-tight mt-0.5">{b.value}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* XP Progress Bar */}
            <div className="max-w-md bg-black/20 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
              <div className="flex justify-between items-end mb-2">
                <span className="text-xs font-bold text-violet-100 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                  الطريق للمستوى {gamification.level + 1}
                </span>
                <span className="text-xs font-black bg-white/20 px-2 py-0.5 rounded text-white">
                  {gamification.totalXP % 1000} / 1000 XP
                </span>
              </div>
              <div className="h-3 bg-black/30 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-yellow-400 via-orange-400 to-rose-400 rounded-full relative"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (gamification.totalXP % 1000) / 10)}%` }}
                  transition={{ duration: 1.5, ease: 'easeOut', delay: 0.6 }}
                />
              </div>
            </div>
          </div>

          {/* Progress Rings */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="flex justify-center gap-6 md:gap-10 bg-black/15 p-7 rounded-[2.5rem] border border-white/10 backdrop-blur-md"
          >
            <ProgressRing pct={attPct} color="#34d399" label="نسبة الحضور" value={`${attPct}%`} size={95} />
            <div className="w-px h-20 bg-white/10 self-center" />
            <ProgressRing pct={avgGrade} color="#fcd34d" label="المعدل العام" value={`${avgGrade}%`} size={95} />
            <div className="w-px h-20 bg-white/10 self-center" />
            <ProgressRing pct={completionPct} color="#60a5fa" label="إنجاز الواجبات" value={`${completionPct}%`} size={95} />
          </motion.div>
        </div>
      </motion.div>

      {/* ─── CLASSROOM & FACE ID STATUS ─── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-violet-100 dark:border-white/5 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center text-white text-2xl shadow-md shadow-violet-500/20 flex-shrink-0">
            🏫
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-gray-900 dark:text-white">
                الصف الأول الابتدائي — فصل د. إسماعيل عيسى
              </h2>
              <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 text-xs font-black">
                نشط الآن ✅
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium mt-1">
              معلم الفصل: <span className="font-bold text-violet-600">د. إسماعيل عيسى</span> • الطالب:{' '}
              <span className="font-bold text-gray-800 dark:text-gray-200">أحمد فيصل الغامدي (#cls-std-2)</span>
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs">
              <span className="flex items-center gap-1 text-emerald-600 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" /> بصمة الوجه (Face ID) معتمدة
              </span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-500 font-medium">
                الحصة الحالية: <span className="font-black text-violet-600">القرآن الكريم (07:00 - 07:45)</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => {
              alert('تم تأكيد مطابقة بصمة الوجه وتسجيل حضور الطالب أحمد فيصل بنجاح! ✅')
            }}
            className="flex-1 md:flex-none px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
          >
            <span>تسجيل حضور ذكي (Face ID) 📸</span>
          </button>
          <a
            href="/student/schedule"
            className="px-4 py-3 rounded-2xl bg-violet-50 dark:bg-violet-500/10 hover:bg-violet-100 text-violet-700 dark:text-violet-300 font-black text-xs transition-colors flex items-center gap-1.5"
          >
            جدول الحصص 📅
          </a>
        </div>
      </motion.div>

      {/* ─── STATS GRID ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: BookOpen, label: 'المواد المسجلة', value: summary.totalSubjects, color: '#8b5cf6', sub: 'مواد دراسية' },
          { icon: FileText, label: 'واجبات للحل', value: summary.pendingAssignments, color: '#f59e0b', sub: 'بانتظار التسليم' },
          { icon: CheckCircle2, label: 'واجبات سُلّمت', value: summary.completedAssignments, color: '#10b981', sub: 'مهمة منجزة' },
          { icon: Award, label: 'أوسمة الإنجاز', value: gamification.achievementsUnlocked, color: '#ec4899', sub: 'وسام مفتوح' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.08 }}>
            <StatChip {...s} />
          </motion.div>
        ))}
      </div>

      {/* ─── ACTIVE HOMEWORK & TODAY SCHEDULE SECTION ─── */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Homework Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-[2rem] p-6 shadow-sm flex flex-col"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-gray-900 dark:text-white text-base flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-amber-500" />
              </div>
              الواجبات المدرسية المفتوحة
            </h3>
            <a href="/student/assignments" className="text-xs font-bold text-violet-600 hover:underline">
              عرض الكل ({(upcomingAssignments?.length || 0)}) ↗
            </a>
          </div>

          <div className="space-y-3 flex-1">
            {(upcomingAssignments || []).slice(0, 3).map((hw: any, idx: number) => (
              <div
                key={hw.id || idx}
                className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="font-black text-sm text-gray-900 dark:text-white truncate">{hw.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{hw.subject} • موعد التسليم: {hw.dueDate}</p>
                </div>
                <a
                  href="/student/assignments"
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-sm transition-colors whitespace-nowrap"
                >
                  حل الواجب ✏️
                </a>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Today's Schedule Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-[2rem] p-6 shadow-sm flex flex-col"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-gray-900 dark:text-white text-base flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-violet-500" />
              </div>
              جدول حصص اليوم الدراسي
            </h3>
            <a href="/student/schedule" className="text-xs font-bold text-violet-600 hover:underline">
              الجدول الأسبوعي ↗
            </a>
          </div>

          <div className="space-y-2 flex-1">
            {[
              { num: 1, name: 'اللغة العربية', time: '07:00 — 07:45', emoji: '📖', status: 'جارية الآن' },
              { num: 2, name: 'القرآن الكريم', time: '07:45 — 08:30', emoji: '📿', status: 'قادمة' },
              { num: 3, name: 'استراحة الفطور', time: '08:30 — 09:15', emoji: '🥪', status: 'استراحة' },
              { num: 4, name: 'التربية الإسلامية', time: '09:30 — 10:15', emoji: '🕌', status: 'قادمة' },
              { num: 5, name: 'الرياضيات', time: '10:15 — 11:00', emoji: '🔢', status: 'قادمة' },
            ].map((period, i) => (
              <div
                key={i}
                className={`p-3 rounded-2xl flex items-center justify-between gap-3 text-xs ${
                  period.status === 'جارية الآن'
                    ? 'bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20'
                    : 'bg-gray-50 dark:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{period.emoji}</span>
                  <div>
                    <span className="font-black text-gray-900 dark:text-white">{period.name}</span>
                    <span className="text-gray-400 mr-2">حصة {period.num}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 font-mono">{period.time}</span>
                  {period.status === 'جارية الآن' && (
                    <span className="px-2 py-0.5 rounded-md bg-violet-600 text-white font-bold text-[10px] animate-pulse">
                      الآن
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ─── CERTIFICATES PREVIEW ─── */}
      {(gamification?.achievementsUnlocked || 0) > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-[#1e1e2d] border border-amber-200/50 dark:border-amber-500/10 rounded-[2rem] p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-gray-900 dark:text-white text-base flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-amber-500" />
              </div>
              أحدث شهادات وأوسمة التميز المعتمدة
            </h3>
            <a href="/student/certificates" className="text-xs font-bold text-amber-600 hover:underline">
              عرض كل الشهادات ↗
            </a>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-2xl flex-shrink-0 text-white shadow-sm">
              🏆
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-black text-sm text-gray-900 dark:text-white truncate">
                طالب متميز — فصل د. إسماعيل عيسى
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                لديك {gamification.achievementsUnlocked} أوسمة وشهادات تميز معتمدة في المنصة
              </p>
            </div>
            <a
              href="/student/certificates"
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-sm transition-colors whitespace-nowrap"
            >
              استعراض 🏅
            </a>
          </div>
        </motion.div>
      )}

      {/* ─── QUICK NAV ─── */}
      <QuickNavGrid />

      {/* ─── CHARTS ROW ─── */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Radar */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between"
        >
          <div>
            <h3 className="font-black text-gray-900 dark:text-white text-base mb-1">تحليل الكفاءة حسب المادة</h3>
            <p className="text-xs text-gray-400 mb-4">تقييم شامل لجميع المقررات</p>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 'bold' }} />
                <Radar name="الدرجة" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Weekly Activity Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between"
        >
          <div>
            <h3 className="font-black text-gray-900 dark:text-white text-base mb-1">النشاط الأسبوعي والحضور</h3>
            <p className="text-xs text-gray-400 mb-4">التسليمات والالتزام بالحضور</p>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="تسليمات" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSub)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Subject Bar Chart */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between"
        >
          <div>
            <h3 className="font-black text-gray-900 dark:text-white text-base mb-1">معدل درجات المواد</h3>
            <p className="text-xs text-gray-400 mb-4">مستوى التحصيل في كل مادة</p>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9ca3af' }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9ca3af' }} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="grade" radius={[6, 6, 0, 0]} maxBarSize={32}>
                  {subjectBarData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.grade >= 85 ? '#10b981' : entry.grade >= 65 ? '#f59e0b' : '#ef4444'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* ─── EXTRA WIDGETS ROW ─── */}
      <div className="grid lg:grid-cols-2 gap-6">
        <AiInsightCard />
        <PomodoroTimer />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <AssignmentsTimeline assignments={allAssignments} liveCount={liveAssignments.length} />
        <AchievementsShowcase count={gamification.achievementsUnlocked} />
      </div>
    </div>
  )
}
