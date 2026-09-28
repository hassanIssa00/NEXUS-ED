'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { apiClient } from '@/lib/api/client'
import { SocketProvider } from '@/lib/providers/socket-provider'
import {
  BarChart3, TrendingUp, Users, Award, BookOpen, BrainCircuit,
  Loader2, RefreshCw, AlertTriangle, CheckCircle2, Star, Target,
  GraduationCap, Zap, Download
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ScatterChart, Scatter, ZAxis, LineChart, Line
} from 'recharts'

function Section({ title, icon: Icon, color, children }: {
  title: string; icon: any; color: string; children: React.ReactNode
}) {
  return (
    <div className="bg-card border border-border rounded-3xl overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <h3 className="font-bold text-foreground">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

function AnalyticsInner() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [aiInsight, setAiInsight] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Use admin dashboard for school-wide data
      const [adminRes] = await Promise.all([
        apiClient.get('/dashboard/admin').catch(() => ({ data: null })),
      ])
      setData(adminRes.data?.data ?? adminRes.data)
    } catch { setData(null) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const generateInsight = async () => {
    setAiLoading(true)
    try {
      const kpis = data?.kpis || {}
      const res = await apiClient.post('/ai/ask', {
        question: `أنت مستشار تربوي. بناءً على: ${kpis.totalStudents} طالب، ${kpis.totalTeachers} معلم، نسبة الحضور ${kpis.attendanceRate ?? 'غير محددة'}%، الإيرادات ${kpis.totalRevenue?.toLocaleString()} ريال. قدم تحليلاً أكاديمياً عميقاً وتوصيات محددة لتحسين أداء المدرسة (5 نقاط موجزة بالعربية).`
      })
      setAiInsight(res.data?.data?.answer || 'تعذر توليد التحليل.')
    } catch { setAiInsight('تأكد من اتصال خدمة AI.') }
    finally { setAiLoading(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
    </div>
  )

  const kpis = data?.kpis || {}
  const enrollSeries = (data?.enrollmentSeries || []).map((e: any) => ({
    name: e.label, طلاب: e.value
  }))
  const revSeries = (data?.revenueSeries || []).map((e: any) => ({
    name: e.label, إيرادات: e.value
  }))

  const subjectRadar = [
    { subject: 'القرآن الكريم', value: 94 },
    { subject: 'لغتي الجميلة', value: 92 },
    { subject: 'الرياضيات', value: 88 },
    { subject: 'العلوم', value: 89 },
    { subject: 'الحاسب والتقنية', value: 91 },
    { subject: 'التربية الفنية والبدنية', value: 95 },
  ]

  // Risk student simulation
  const riskData = [
    { name: 'ممتازون', count: Math.floor((kpis.totalStudents || 100) * 0.35), color: '#22c55e' },
    { name: 'جيدون', count: Math.floor((kpis.totalStudents || 100) * 0.40), color: '#3b82f6' },
    { name: 'يحتاجون دعم', count: Math.floor((kpis.totalStudents || 100) * 0.17), color: '#f59e0b' },
    { name: 'مخطر عليهم', count: Math.floor((kpis.totalStudents || 100) * 0.08), color: '#ef4444' },
  ]

  return (
    <div className="space-y-6 pb-10" dir="rtl">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-700 via-violet-600 to-indigo-700 p-8 text-white shadow-2xl">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-purple-200 text-sm mb-1">لوحة التحليلات المتقدمة</p>
            <h1 className="text-3xl font-extrabold mb-2">مركز قيادة الأداء المدرسي</h1>
            <p className="text-white/80 text-sm mb-4">تحليل شامل للأداء الأكاديمي، الحضور، والإيرادات</p>
            <div className="flex gap-3 flex-wrap">
              {[
                { v: kpis.totalStudents || 0, l: 'طالب', c: '#a78bfa' },
                { v: kpis.totalTeachers || 0, l: 'معلم', c: '#60a5fa' },
                { v: `${(kpis.totalRevenue || 0).toLocaleString()}`, l: 'إيرادات', c: '#34d399' },
              ].map((s, i) => (
                <div key={i} className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2">
                  <p className="font-extrabold text-lg" style={{ color: s.c }}>{s.v}</p>
                  <p className="text-xs text-white/70">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={load}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors">
              <RefreshCw className="w-4 h-4" /> تحديث البيانات
            </button>
            <button onClick={generateInsight} disabled={aiLoading}
              className="flex items-center gap-2 bg-yellow-500/80 hover:bg-yellow-500 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors disabled:opacity-50">
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
              {aiLoading ? 'يحلل...' : 'تحليل AI الشامل'}
            </button>
          </div>
        </div>
      </motion.div>

      {/* AI Insight Box */}
      {aiInsight && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 border border-violet-200 dark:border-violet-800 rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <BrainCircuit className="w-5 h-5 text-violet-600" />
            <h3 className="font-bold text-violet-700 dark:text-violet-300">تحليل الذكاء الاصطناعي للأداء المدرسي</h3>
          </div>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{aiInsight}</p>
          <button onClick={() => setAiInsight(null)} className="text-xs text-muted-foreground hover:text-foreground mt-3 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> تحليل جديد
          </button>
        </motion.div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي الطلاب', value: kpis.totalStudents || 0, icon: GraduationCap, color: '#8b5cf6', trend: '+5%' },
          { label: 'المعلمون', value: kpis.totalTeachers || 0, icon: BookOpen, color: '#3b82f6', trend: '+2%' },
          { label: 'الفصول', value: kpis.totalClasses || 0, icon: Users, color: '#14b8a6', trend: '0%' },
          { label: 'الإيرادات', value: `${(kpis.totalRevenue || 0).toLocaleString()}`, icon: Award, color: '#22c55e', trend: '+8%' },
        ].map((k, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            whileHover={{ y: -3 }} className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${k.color}15` }}>
                <k.icon className="w-5 h-5" style={{ color: k.color }} />
              </div>
              <span className={`text-xs font-bold ${k.trend.startsWith('+') ? 'text-emerald-600' : 'text-muted-foreground'}`}>{k.trend}</span>
            </div>
            <p className="text-2xl font-extrabold text-foreground">{k.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{k.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Enrollment + Revenue */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Section title="اتجاه تسجيل الطلاب" icon={TrendingUp} color="#8b5cf6">
          {enrollSeries.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={enrollSeries} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="enG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                <Area type="monotone" dataKey="طلاب" stroke="#8b5cf6" fill="url(#enG)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-muted-foreground text-sm py-12">لا توجد بيانات</p>}
        </Section>

        <Section title="الإيرادات الشهرية" icon={BarChart3} color="#22c55e">
          {revSeries.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revSeries} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                  formatter={(v: any) => [`${Number(v).toLocaleString()} ر.س`, 'الإيرادات']} />
                <Bar dataKey="إيرادات" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-muted-foreground text-sm py-12">لا توجد بيانات</p>}
        </Section>
      </div>

      {/* Subject Radar + Student Risk */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Section title="الأداء الأكاديمي حسب المواد الدراسية" icon={Target} color="#3b82f6">
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={subjectRadar}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <Radar dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </Section>

        <Section title="توزيع مستويات الطلاب" icon={Users} color="#f59e0b">
          <div className="space-y-3">
            {riskData.map((d, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-bold text-foreground">{d.name}</span>
                  <span className="font-extrabold" style={{ color: d.color }}>{d.count} طالب</span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <motion.div className="h-full rounded-full" style={{ backgroundColor: d.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.round((d.count / (kpis.totalStudents || 100)) * 100)}%` }}
                    transition={{ duration: 1, delay: i * 0.1 }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
                {riskData[3].count} طالب في وضع حرج
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                يُنصح بمراجعة ملفاتهم وتفعيل خطط التدخل المبكر.
              </p>
            </div>
          </div>
        </Section>
      </div>

      {/* System Health Summary */}
      <Section title="جودة النظام والأداء العام" icon={CheckCircle2} color="#10b981">
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { label: 'نسبة الحضور المتوقعة', value: '87%', status: 'good', icon: Star },
            { label: 'متوسط الدرجات', value: '76%', status: 'warn', icon: Award },
            { label: 'تسليم الواجبات', value: '91%', status: 'good', icon: CheckCircle2 },
          ].map((s, i) => {
            const isGood = s.status === 'good'
            return (
              <motion.div key={i} whileHover={{ y: -2 }}
                className={`p-4 rounded-2xl border ${isGood ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/10' : 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/10'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <s.icon className={`w-4 h-4 ${isGood ? 'text-emerald-500' : 'text-amber-500'}`} />
                  <p className="text-xs font-bold text-foreground">{s.label}</p>
                </div>
                <p className={`text-2xl font-extrabold ${isGood ? 'text-emerald-600' : 'text-amber-600'}`}>{s.value}</p>
              </motion.div>
            )
          })}
        </div>
      </Section>
    </div>
  )
}

export default function PrincipalAnalyticsPage() {
  return (
    <SocketProvider>
      <AnalyticsInner />
    </SocketProvider>
  )
}
