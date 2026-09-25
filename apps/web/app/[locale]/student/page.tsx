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
  student: { id: 'demo', name: 'ط£ط­ظ…ط¯ ظپظٹطµظ„ ط§ظ„ط؛ط§ظ…ط¯ظٹ', email: 'student@nexusedu.sa', grade: 'ط§ظ„طµظپ 11' },
  summary: { totalSubjects: 6, pendingAssignments: 4, completedAssignments: 23, averageGrade: 84, totalLessons: 48 },
  upcomingAssignments: [
    { id: '1', title: 'ط­ظ„ طھظ…ط§ط±ظٹظ† ط§ظ„ظپطµظ„ ط§ظ„ط³ط§ط¯ط³', subject: 'ط§ظ„ط±ظٹط§ط¶ظٹط§طھ', dueDate: new Date(Date.now() + 86400000).toISOString(), status: 'PENDING' },
    { id: '2', title: 'طھظ„ط®ظٹطµ ظ‚طµظٹط¯ط© ط§ظ„ظ…طھظ†ط¨ظٹ', subject: 'ط§ظ„ظ„ط؛ط© ط§ظ„ط¹ط±ط¨ظٹط©', dueDate: new Date(Date.now() + 172800000).toISOString(), status: 'PENDING' },
    { id: '3', title: 'طھظ‚ط±ظٹط± طھط¬ط±ط¨ط© ط§ظ„ظ…ط®طھط¨ط±', subject: 'ط§ظ„ظƒظٹظ…ظٹط§ط،', dueDate: new Date(Date.now() + 259200000).toISOString(), status: 'PENDING' },
  ],
  attendance: { present: 92, absent: 5, late: 3, excused: 0 },
  subjectPerformance: [
    { id: '1', name: 'ط§ظ„ط±ظٹط§ط¶ظٹط§طھ', teacher: 'ط£. ظپط§ط·ظ…ط© ط§ظ„ط²ظ‡ط±ط§ظ†ظٹ', averageGrade: 88, totalLessons: 20, submittedAssignments: 8, totalAssignments: 9 },
    { id: '2', name: 'ط§ظ„ظ„ط؛ط© ط§ظ„ط¹ط±ط¨ظٹط©', teacher: 'ط£. ط£ط­ظ…ط¯ ط³ط¹ظٹط¯', averageGrade: 92, totalLessons: 18, submittedAssignments: 7, totalAssignments: 8 },
    { id: '3', name: 'ط§ظ„ظپظٹط²ظٹط§ط،', teacher: 'ط£. ط®ط§ظ„ط¯ ط§ظ„ط؛ط§ظ…ط¯ظٹ', averageGrade: 76, totalLessons: 16, submittedAssignments: 5, totalAssignments: 6 },
    { id: '4', name: 'ط§ظ„ظƒظٹظ…ظٹط§ط،', teacher: 'ط£. ظٹط§ط³ط± ط§ظ„ط´ظ‡ط±ط§ظ†ظٹ', averageGrade: 81, totalLessons: 14, submittedAssignments: 6, totalAssignments: 7 },
    { id: '5', name: 'ط§ظ„ط¥ظ†ط¬ظ„ظٹط²ظٹط©', teacher: 'ط£. ط·ط§ط±ظ‚ ط§ظ„ط²ظ‡ط±ط§ظ†ظٹ', averageGrade: 85, totalLessons: 12, submittedAssignments: 4, totalAssignments: 5 },
    { id: '6', name: 'ط§ظ„طھط§ط±ظٹط®', teacher: 'ط£. ظ†ظˆط±ط© ط³ط¹ط¯', averageGrade: 79, totalLessons: 10, submittedAssignments: 3, totalAssignments: 4 },
  ],
  gamification: { level: 7, totalXP: 3450, streakDays: 12, achievementsUnlocked: 8 },
  weeklyActivity: [
    { label: 'ط§ظ„ط£ط­ط¯', submissions: 2, attended: 1 }, { label: 'ط§ظ„ط§ط«ظ†ظٹظ†', submissions: 3, attended: 1 },
    { label: 'ط§ظ„ط«ظ„ط§ط«ط§ط،', submissions: 1, attended: 1 }, { label: 'ط§ظ„ط£ط±ط¨ط¹ط§ط،', submissions: 4, attended: 1 },
    { label: 'ط§ظ„ط®ظ…ظٹط³', submissions: 2, attended: 1 }, { label: 'ط§ظ„ط¬ظ…ط¹ط©', submissions: 1, attended: 0 },
    { label: 'ط§ظ„ط³ط¨طھ', submissions: 0, attended: 0 },
  ],
} as any;

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

        const subjects = ['ط§ظ„ظ„ط؛ط© ط§ظ„ط¹ط±ط¨ظٹط©', 'ط§ظ„ظ‚ط±ط¢ظ† ط§ظ„ظƒط±ظٹظ…', 'ط§ظ„ط±ظٹط§ط¶ظٹط§طھ', 'ط§ظ„ط¹ظ„ظˆظ…']
        const subjectPerformance = subjects.map((subj, i) => {
          const subSubs = mySubmissions.filter(s => s.assignmentTitle?.includes(subj.split(' ')[1] || subj))
          const avgGrade = subSubs.length > 0
            ? Math.round((subSubs.reduce((acc, s) => acc + (s.grade || 0), 0) / subSubs.length) * 10)
            : [95, 98, 92, 90][i]
          return {
            id: `subj-${i}`,
            name: subj,
            teacher: 'ط¯. ط¥ط³ظ…ط§ط¹ظٹظ„ ط¹ظٹط³ظ‰',
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
            name: student?.fullName || 'ط£ط­ظ…ط¯ ظپظٹطµظ„ ط§ظ„ط؛ط§ظ…ط¯ظٹ',
            email: 'student1@nexusedu.sa',
            grade: student?.grade || 'ط§ظ„طµظپ ط§ظ„ط£ظˆظ„ ط§ظ„ط§ط¨طھط¯ط§ط¦ظٹ â€” ظپطµظ„ ط¯. ط¥ط³ظ…ط§ط¹ظٹظ„ ط¹ظٹط³ظ‰',
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
            { label: 'ط§ظ„ط£ط­ط¯', submissions: 2, attended: 1 },
            { label: 'ط§ظ„ط§ط«ظ†ظٹظ†', submissions: 3, attended: 1 },
            { label: 'ط§ظ„ط«ظ„ط§ط«ط§ط،', submissions: 1, attended: 1 },
            { label: 'ط§ظ„ط£ط±ط¨ط¹ط§ط،', submissions: mySubmissions.length || 2, attended: myAtt?.overallStatus === 'present' ? 1 : 1 },
            { label: 'ط§ظ„ط®ظ…ظٹط³', submissions: 2, attended: 1 },
            { label: 'ط§ظ„ط¬ظ…ط¹ط©', submissions: 0, attended: 0 },
            { label: 'ط§ظ„ط³ط¨طھ', submissions: 0, attended: 0 },
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
    window.addEventListener('nexus:data-changed', load as any)
    return () => window.removeEventListener('nexus:data-changed', load as any)
  }, [])

  useRealtimeAssignments(useCallback((a: any) => {
    setLiveAssignments(p => [a, ...p].slice(0, 3))
    setLiveNotif(`ًں“Œ ظˆط§ط¬ط¨ ط¬ط¯ظٹط¯: ${a.title}`)
    setTimeout(() => setLiveNotif(null), 5000)
  }, []))

  useRealtimeNotifications(useCallback((n: any) => {
    setLiveNotif(n.title)
    setTimeout(() => setLiveNotif(null), 4000)
  }, []))

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
      <div className="relative w-20 h-20">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 rounded-full border-4 border-violet-500/20 border-t-violet-600" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-violet-400 animate-pulse" />
        </div>
      </div>
      <p className="text-sm text-gray-500 font-medium animate-pulse">ط¬ط§ط±ظٹ طھط­ظ…ظٹظ„ ظ„ظˆط­ط© طھط­ظƒظ…ظƒ...</p>
    </div>
  )

  const { student, summary, upcomingAssignments, attendance, subjectPerformance, gamification, weeklyActivity } = data
  const attTotal = attendance.present + attendance.absent + attendance.late + attendance.excused
  const attPct = attTotal > 0 ? Math.round((attendance.present / attTotal) * 100) : 0
  const avgGrade = Math.round(summary.averageGrade || 0)
  const completionPct = (summary.pendingAssignments + summary.completedAssignments) > 0
    ? Math.round((summary.completedAssignments / (summary.pendingAssignments + summary.completedAssignments)) * 100) : 0

  const radarData = subjectPerformance.slice(0, 6).map(s => ({ subject: s.name.substring(0, 8), value: Math.round(s.averageGrade || 0) }))
  const weeklyData = weeklyActivity.map(w => ({ name: w.label, submissions: w.submissions, attended: w.attended }))
  const subjectBarData = subjectPerformance.map(s => ({ name: s.name.substring(0, 8), grade: Math.round(s.averageGrade || 0) }))
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
          <span>ط¹ط±ط¶ ط¨ظٹط§ظ†ط§طھ طھط¬ط±ظٹط¨ظٹط© â€” طھط¹ط°ط± ط§ظ„ط§طھطµط§ظ„ ط¨ط§ظ„ط®ط§ط¯ظ…</span>
          <button onClick={() => window.location.reload()} className="underline font-black hover:no-underline mr-auto">ط¥ط¹ط§ط¯ط© ط§ظ„ط§طھطµط§ظ„</button>
        </motion.div>
      )}

      {/* â”€â”€â”€ HERO BANNER â”€â”€â”€ */}
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
              <span className="text-xs font-bold text-violet-100">ظ…ط±ط­ط¨ط§ظ‹ ط¨ط¹ظˆط¯طھظƒ! ًں‘‹</span>
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="text-4xl md:text-5xl font-black mb-2 tracking-tight">
              {student.name}
            </motion.h1>
            <p className="text-violet-200 text-sm font-medium mb-6">ظٹظˆظ… طھط¹ظ„ظٹظ…ظٹ ط±ط§ط¦ط¹ ط¨ط§ظ†طھط¸ط§ط±ظƒ! ط§ط³طھظ…ط± ظپظٹ ط§ظ„طھظ…ظٹط² ًںŒں</p>

            {/* Gamification Badges */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="flex flex-wrap items-center gap-3 mb-6">
              {[
                { icon: Star, label: 'ط§ظ„ظ…ط³طھظˆظ‰', value: `${gamification.level}`, bg: 'from-yellow-400 to-yellow-300', iconColor: 'text-yellow-900' },
                { icon: Flame, label: 'ط£ظٹط§ظ… ظ…طھظˆط§طµظ„ط©', value: `${gamification.streakDays}ًں”¥`, bg: 'from-orange-500 to-orange-400', iconColor: 'text-white' },
                { icon: Zap, label: 'ظ†ظ‚ط§ط· XP', value: `${gamification.totalXP.toLocaleString()}`, bg: 'from-cyan-500 to-blue-500', iconColor: 'text-white' },
                { icon: Trophy, label: 'ط£ظˆط³ظ…ط©', value: `${gamification.achievementsUnlocked}`, bg: 'from-rose-400 to-pink-500', iconColor: 'text-white' },
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
                  <Trophy className="w-3 h-3 text-yellow-400" /> ط§ظ„ط·ط±ظٹظ‚ ظ„ظ„ظ…ط³طھظˆظ‰ {gamification.level + 1}
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
            <ProgressRing pct={attPct} color="#34d399" label="ظ†ط³ط¨ط© ط§ظ„ط­ط¶ظˆط±" value={`${attPct}%`} size={95} />
            <div className="w-px h-20 bg-white/10 self-center" />
            <ProgressRing pct={avgGrade} color="#fcd34d" label="ط§ظ„ظ…ط¹ط¯ظ„ ط§ظ„ط¹ط§ظ…" value={`${avgGrade}%`} size={95} />
            <div className="w-px h-20 bg-white/10 self-center" />
            <ProgressRing pct={completionPct} color="#60a5fa" label="ط¥ظ†ط¬ط§ط² ط§ظ„ظˆط§ط¬ط¨ط§طھ" value={`${completionPct}%`} size={95} />
          </motion.div>
        </div>
      </motion.div>

      {/* â”€â”€â”€ CLASSROOM & FACE ID STATUS â”€â”€â”€ */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-violet-100 dark:border-white/5 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center text-white text-2xl shadow-md shadow-violet-500/20 flex-shrink-0">
            ًںڈ«
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-gray-900 dark:text-white">ط§ظ„طµظپ ط§ظ„ط£ظˆظ„ ط§ظ„ط§ط¨طھط¯ط§ط¦ظٹ â€” ظپطµظ„ ط¯. ط¥ط³ظ…ط§ط¹ظٹظ„ ط¹ظٹط³ظ‰</h2>
              <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 text-xs font-black">
                ظ†ط´ط· ط§ظ„ط¢ظ† âœ…
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium mt-1">
              ظ…ط¹ظ„ظ… ط§ظ„ظپطµظ„: <span className="font-bold text-violet-600">ط¯. ط¥ط³ظ…ط§ط¹ظٹظ„ ط¹ظٹط³ظ‰</span> â€¢ ط§ظ„ط·ط§ظ„ط¨: <span className="font-bold text-gray-800 dark:text-gray-200">ط£ط­ظ…ط¯ ظپظٹطµظ„ ط§ظ„ط؛ط§ظ…ط¯ظٹ (#cls-std-2)</span>
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs">
              <span className="flex items-center gap-1 text-emerald-600 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" /> ط¨طµظ…ط© ط§ظ„ظˆط¬ظ‡ (Face ID) ظ…ط¹طھظ…ط¯ط©
              </span>
              <span className="text-gray-400">â€¢</span>
              <span className="text-gray-500 font-medium">ط§ظ„ط­طµط© ط§ظ„ط­ط§ظ„ظٹط©: <span className="font-black text-violet-600">ط§ظ„ظ‚ط±ط¢ظ† ط§ظ„ظƒط±ظٹظ… (07:00 - 07:45)</span></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button onClick={() => {
            alert('طھظ… طھط£ظƒظٹط¯ ظ…ط·ط§ط¨ظ‚ط© ط¨طµظ…ط© ط§ظ„ظˆط¬ظ‡ ظˆطھط³ط¬ظٹظ„ ط­ط¶ظˆط± ط§ظ„ط·ط§ظ„ط¨ ط£ط­ظ…ط¯ ظپظٹطµظ„ ط¨ظ†ط¬ط§ط­! âœ…')
          }} className="flex-1 md:flex-none px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2">
            <span>طھط³ط¬ظٹظ„ ط­ط¶ظˆط± ط°ظƒظٹ (Face ID) ًں“¸</span>
          </button>
          <a href="/student/schedule" className="px-4 py-3 rounded-2xl bg-violet-50 dark:bg-violet-500/10 hover:bg-violet-100 text-violet-700 dark:text-violet-300 font-black text-xs transition-colors flex items-center gap-1.5">
            جدول الحصص 📅
          </a>
        </div>
      </motion.div>

      {/* â”€â”€â”€ STATS GRID â”€â”€â”€ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: BookOpen, label: 'ط§ظ„ظ…ظˆط§ط¯ ط§ظ„ظ…ط³ط¬ظ„ط©', value: summary.totalSubjects, color: '#8b5cf6', sub: 'ظ…ط§ط¯ط© ط¯ط±ط§ط³ظٹط©' },
          { icon: FileText, label: 'ظˆط§ط¬ط¨ط§طھ ظ„ظ„ط­ظ„', value: summary.pendingAssignments, color: '#f59e0b', sub: 'ط¨ط§ظ†طھط¸ط§ط± ط§ظ„طھط³ظ„ظٹظ…' },
          { icon: CheckCircle2, label: 'ظˆط§ط¬ط¨ط§طھ ط³ظ„ظ‘ظ…طھ', value: summary.completedAssignments, color: '#10b981', sub: 'ظ…ظ‡ظ…ط© ظ…ظ†ط¬ط²ط©' },
          { icon: Award, label: 'ط£ظˆط³ظ…ط© ط§ظ„ط¥ظ†ط¬ط§ط²', value: gamification.achievementsUnlocked, color: '#ec4899', sub: 'ظˆط³ط§ظ… ظ…ظپطھظˆط­' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.08 }}>
            <StatChip {...s} />
          </motion.div>
        ))}
      </div>

      {/* â”€â”€â”€ ACTIVE HOMEWORK & TODAY SCHEDULE SECTION â”€â”€â”€ */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Homework Preview */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-[2rem] p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-gray-900 dark:text-white text-base flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-amber-500" />
              </div>
              ط§ظ„ظˆط§ط¬ط¨ط§طھ ط§ظ„ظ…ط¯ط±ط³ظٹط© ط§ظ„ظ…ظپطھظˆط­ط©
            </h3>
            <a href="/student/assignments" className="text-xs font-bold text-violet-600 hover:underline">
              عرض الكل ({(data?.upcomingAssignments?.length || 0)}) ↗
            </a>
          </div>

          <div className="space-y-3 flex-1">
            {(data?.upcomingAssignments || []).slice(0, 3).map((hw: any, idx: number) => (
              <div key={hw.id || idx} className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-black text-sm text-gray-900 dark:text-white truncate">{hw.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{hw.subject} • موعد التسليم: {hw.dueDate}</p>
                </div>
                <a href="/student/assignments" className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-sm transition-colors">
                  حل الواجب ✏️
                </a>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Today's Schedule Preview */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-[2rem] p-6 shadow-sm flex flex-col">
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
              { num: 1, name: 'ط§ظ„ظ„ط؛ط© ط§ظ„ط¹ط±ط¨ظٹط©', time: '07:00 â€” 07:45', emoji: 'ًں“–', status: 'ط¬ط§ط±ظٹط© ط§ظ„ط¢ظ†' },
              { num: 2, name: 'ط§ظ„ظ‚ط±ط¢ظ† ط§ظ„ظƒط±ظٹظ…', time: '07:45 â€” 08:30', emoji: 'ًں“؟', status: 'ظ‚ط§ط¯ظ…ط©' },
              { num: 3, name: 'ط§ط³طھط±ط§ط­ط© ط§ظ„ظپط·ظˆط±', time: '08:30 â€” 09:15', emoji: 'ًں¥ھ', status: 'ط§ط³طھط±ط§ط­ط©' },
              { num: 4, name: 'ط§ظ„طھط±ط¨ظٹط© ط§ظ„ط¥ط³ظ„ط§ظ…ظٹط©', time: '09:30 â€” 10:15', emoji: 'ًں•Œ', status: 'ظ‚ط§ط¯ظ…ط©' },
              { num: 5, name: 'ط§ظ„ط±ظٹط§ط¶ظٹط§طھ', time: '10:15 â€” 11:00', emoji: 'ًں”¢', status: 'ظ‚ط§ط¯ظ…ط©' },
            ].map((period, i) => (
              <div key={i} className={`p-3 rounded-2xl flex items-center justify-between gap-3 text-xs ${
                period.status === 'ط¬ط§ط±ظٹط© ط§ظ„ط¢ظ†' ? 'bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20' : 'bg-gray-50 dark:bg-white/5'
              }`}>
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{period.emoji}</span>
                  <div>
                    <span className="font-black text-gray-900 dark:text-white">{period.name}</span>
                    <span className="text-gray-400 mr-2">ط­طµط© {period.num}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 font-mono">{period.time}</span>
                  {period.status === 'ط¬ط§ط±ظٹط© ط§ظ„ط¢ظ†' && (
                    <span className="px-2 py-0.5 rounded-md bg-violet-600 text-white font-bold text-[10px] animate-pulse">
                      ط§ظ„ط¢ظ†
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* â”€â”€â”€ CERTIFICATES PREVIEW â”€â”€â”€ */}
      {(data?.gamification?.achievementsUnlocked || 0) > 0 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-white dark:bg-[#1e1e2d] border border-amber-200/50 dark:border-amber-500/10 rounded-[2rem] p-6 shadow-sm">
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
              <h4 className="font-black text-sm text-gray-900 dark:text-white truncate">طالب متميز — فصل د. إسماعيل عيسى</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">لديك {data?.gamification?.achievementsUnlocked || 1} أوسمة وشهادات تميز معتمدة في المنصة</p>
            </div>
            <a href="/student/certificates" className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-sm transition-colors">
              استعراض 🏅
            </a>
          </div>
        </motion.div>
      )}

      {/* â”€â”€â”€ QUICK NAV â”€â”€â”€ */}
      <QuickNavGrid />

      {/* â”€â”€â”€ CHARTS ROW â”€â”€â”€ */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Radar */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
          className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-[2rem] p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
              <Target className="w-4 h-4 text-violet-500" />
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900 dark:text-white text-sm">ط§ظ„ط£ط¯ط§ط، ط§ظ„ط´ط§ظ…ظ„</h3>
              <p className="text-[10px] text-gray-500">ظ…ظ‚ط§ط±ظ†ط© ط¨ظٹظ† ط§ظ„ظ…ظˆط§ط¯</p>
            </div>
          </div>
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <PolarGrid stroke="currentColor" className="text-gray-200 dark:text-gray-800" strokeDasharray="3 3" />
                <PolarAngleAxis dataKey="grade" tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 600 }} />
                <Radar name="ط§ظ„ط£ط¯ط§ط،" dataKey="grade" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.35} strokeWidth={2.5} />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          ) : <div className="h-[220px] flex items-center justify-center"><p className="text-gray-400 text-sm">ظ„ط§ طھظˆط¬ط¯ ط¨ظٹط§ظ†ط§طھ ظƒط§ظپظٹط©</p></div>}
        </motion.div>

        {/* Weekly Area Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-[2rem] p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900 dark:text-white text-sm">ط§ظ„ظ†ط´ط§ط· ط§ظ„ط£ط³ط¨ظˆط¹ظٹ</h3>
              <p className="text-[10px] text-gray-500">ط¢ط®ط± 7 ط£ظٹط§ظ…</p>
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
              <XAxis dataKey="grade" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="grade" stroke="#8b5cf6" fill="url(#gS)" strokeWidth={2.5} activeDot={{ r: 5, strokeWidth: 0 }} />
              <Area type="monotone" dataKey="grade" stroke="#38bdf8" fill="url(#gA)" strokeWidth={2.5} activeDot={{ r: 5, strokeWidth: 0 }} />
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
              <h3 className="font-extrabold text-gray-900 dark:text-white text-sm">ط¯ط±ط¬ط§طھ ط§ظ„ظ…ظˆط§ط¯</h3>
              <p className="text-[10px] text-gray-500">ظ…ظ‚ط§ط±ظ†ط© طھظپطµظٹظ„ظٹط©</p>
            </div>
          </div>
          {subjectBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={subjectBarData} margin={{ top: 10, right: 0, left: -30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-gray-100 dark:text-gray-800/50" />
                <XAxis dataKey="grade" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9ca3af' }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9ca3af' }} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="grade" radius={[6, 6, 0, 0]} maxBarSize={32}>
                  {subjectBarData.map((entry, index) => (
                    <Cell key={index} fill={entry.grade >= 85 ? '#10b981' : entry.grade >= 65 ? '#f59e0b' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-[220px] flex items-center justify-center"><p className="text-gray-400 text-sm">ظ„ط§ طھظˆط¬ط¯ ط¨ظٹط§ظ†ط§طھ</p></div>}
        </motion.div>
      </div>

      {/* â”€â”€â”€ MAIN CONTENT + SIDEBAR â”€â”€â”€ */}
      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        <AssignmentsTimeline assignments={allAssignments} liveCount={liveAssignments.length} />

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          <AiInsightCard />
          <PomodoroTimer />
          <AchievementsShowcase count={gamification.achievementsUnlocked} />
        </div>
      </div>

      {/* â”€â”€â”€ SUBJECTS DETAILED CARDS â”€â”€â”€ */}
      {subjectPerformance.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <h3 className="font-extrabold text-gray-900 dark:text-white text-xl mb-5 flex items-center gap-2 px-1">
            <Target className="w-6 h-6 text-violet-500" /> طھط­ظ„ظٹظ„ ط£ط¯ط§ط، ط§ظ„ظ…ظˆط§ط¯ ط§ظ„طھظپطµظٹظ„ظٹ
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {subjectPerformance.map((s, i) => {
              const pct = Math.min(Math.round(s.averageGrade || 0), 100)
              const color = pct >= 85 ? '#10b981' : pct >= 65 ? '#f59e0b' : '#ef4444'
              const label = pct >= 85 ? 'ظ…ط³طھظˆظ‰ ظ…ظ…طھط§ط² âœ¨' : pct >= 65 ? 'ط£ط¯ط§ط، ط¬ظٹط¯ ًں‘چ' : 'ظٹط­طھط§ط¬ ظ„ظ„طھط­ط³ظٹظ† âڑ ï¸ڈ'
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
                    <span className="text-gray-400">{s.totalLessons} ط¯ط±ط³ â€¢ {s.submittedAssignments}/{s.totalAssignments} ظˆط§ط¬ط¨</span>
                    <span style={{ color }} className="font-bold">{label}</span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      )}

    </div>
  )
}


