'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { apiClient } from '@/lib/api/client'
import { SocketProvider } from '@/lib/providers/socket-provider'
import {
  BarChart3, TrendingUp, Users, Award, BookOpen, BrainCircuit,
  Loader2, RefreshCw, AlertTriangle, CheckCircle2, GraduationCap
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Legend
} from 'recharts'
import { PrintReportButton, ReportPrintFooter, ReportPrintIdentity } from '@/components/reports/report-print-tools'
import { useLocale } from 'next-intl'

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
  const isEnglish = useLocale() === 'en'
  const t = (arabic: string, english: string) => isEnglish ? english : arabic
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [aiInsight, setAiInsight] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [riskSummary, setRiskSummary] = useState<{ total: number; critical: number; high: number; medium: number; low: number } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [adminRes, classesRes] = await Promise.all([
        apiClient.get('/dashboard/admin'),
        apiClient.get('/classes'),
      ])
      setData(adminRes.data?.data ?? adminRes.data)
      const classes = Array.isArray(classesRes.data) ? classesRes.data : []
      const warningLists = await Promise.all(classes.map((schoolClass: any) =>
        apiClient.get('/analytics/student/early-warnings', { params: { classId: schoolClass.id } })
          .then(({ data }) => Array.isArray(data) ? data : [])
      ))
      const warningByStudent = new Map<string, string>()
      const riskWeight: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }
      warningLists.flat().forEach((warning: any) => {
        const current = warningByStudent.get(warning.studentId)
        if (!current || riskWeight[warning.riskLevel] > riskWeight[current]) warningByStudent.set(warning.studentId, warning.riskLevel)
      })
      const counts = { total: warningByStudent.size, critical: 0, high: 0, medium: 0, low: 0 }
      warningByStudent.forEach((level) => {
        if (level === 'CRITICAL') counts.critical++
        else if (level === 'HIGH') counts.high++
        else if (level === 'MEDIUM') counts.medium++
        else counts.low++
      })
      setRiskSummary(counts)
    } catch { setData(null); setRiskSummary(null); setLoadError(t('تعذر تحميل التقرير من سجلات المدرسة. حدّث الصفحة أو حاول مرة أخرى.', 'Could not load the report from school records. Refresh the page and try again.')) }
    finally { setLoading(false) }
  }, [isEnglish])

  useEffect(() => { load() }, [load])

  const generateInsight = async () => {
    setAiLoading(true)
    try {
      const kpis = data?.kpis || {}
      const res = await apiClient.post('/ai/ask', {
        question: isEnglish
          ? `You are an education analyst. Analyze only these recorded school data and do not assume missing facts: ${kpis.totalStudents} students, ${kpis.totalTeachers} teachers, attendance rate ${kpis.attendanceRate ?? 'not available'}%. Collected amounts by currency: ${(kpis.revenueByCurrency || []).map((item: any) => `${item.total} ${item.currency}`).join(', ') || 'no collections recorded'}. State the limits of the available data, then give concise, actionable recommendations in English.`
          : `أنت مستشار تربوي. حلل البيانات المسجلة التالية دون افتراض ما ليس موجوداً: ${kpis.totalStudents} طالب، ${kpis.totalTeachers} معلم، نسبة الحضور ${kpis.attendanceRate ?? 'غير محددة'}%. مبالغ التحصيل حسب العملة: ${(kpis.revenueByCurrency || []).map((item: any) => `${item.total} ${item.currency}`).join('، ') || 'لا يوجد تحصيل مسجل'}. اذكر حدود البيانات ثم قدم توصيات موجزة قابلة للتنفيذ.`
      })
      setAiInsight(res.data?.data?.answer || t('تعذر توليد التحليل.', 'Could not generate the analysis.'))
    } catch { setAiInsight(t('تأكد من اتصال خدمة AI.', 'Check the AI service connection.')) }
    finally { setAiLoading(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
    </div>
  )

  const kpis = data?.kpis || {}
  const enrollSeries = (data?.enrollmentSeries || []).map((item: any) => ({ label: item.label, value: item.value }))
  const revenueSource: Array<{ label: string; currency: string; value: number }> = data?.revenueSeries || []
  const revenueCurrencies: string[] = Array.from(new Set<string>(revenueSource.map((item) => item.currency)))
  const revenueLabels: string[] = Array.from(new Set<string>(revenueSource.map((item) => item.label)))
  const revSeries = revenueLabels.map((label) => Object.assign(
    { name: label },
    ...revenueCurrencies.map((currency: string) => ({
      [currency]: revenueSource.find((item: any) => item.label === label && item.currency === currency)?.value ?? 0,
    })),
  ))
  const revenueDisplay = (data?.kpis.revenueByCurrency || []).map((item: any) =>
    new Intl.NumberFormat(isEnglish ? 'en-US' : 'ar-SA', { style: 'currency', currency: item.currency }).format(item.total),
  ).join(' · ') || t('لا يوجد تحصيل مسجل', 'No collections recorded')

  const riskData = riskSummary ? [
    { name: t('مخاطر حرجة', 'Critical risk'), count: riskSummary.critical, color: '#ef4444' },
    { name: t('مخاطر عالية', 'High risk'), count: riskSummary.high, color: '#f97316' },
    { name: t('مخاطر متوسطة', 'Moderate risk'), count: riskSummary.medium, color: '#f59e0b' },
    { name: t('مخاطر منخفضة', 'Low risk'), count: riskSummary.low, color: '#22c55e' },
  ] : []

  return (
    <main className="report-print-root space-y-6 pb-10" dir={isEnglish ? 'ltr' : 'rtl'}>
      <ReportPrintIdentity title={t('مركز قيادة الأداء المدرسي', 'School performance center')} subtitle={t('ملخص حسب سجلات المدرسة الفعلية', 'Summary from recorded school data')} />
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-700 via-violet-600 to-indigo-700 p-8 text-white shadow-2xl">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-purple-200 text-sm mb-1">{t('لوحة التحليلات المتقدمة', 'Advanced analytics')}</p>
            <h1 className="text-3xl font-extrabold mb-2">{t('مركز قيادة الأداء المدرسي', 'School performance center')}</h1>
            <p className="text-white/80 text-sm mb-4">{t('تحليل شامل للأداء الأكاديمي، الحضور، والإيرادات', 'A combined view of academic performance, attendance, and collections')}</p>
            <div className="flex gap-3 flex-wrap">
              {[
                { v: kpis.totalStudents ?? '—', l: t('طالب', 'Students'), c: '#91A5B2' },
                { v: kpis.totalTeachers ?? '—', l: t('معلم', 'Teachers'), c: '#91A5B2' },
                { v: revenueDisplay, l: t('التحصيل حسب العملة', 'Collections by currency'), c: '#34d399' },
              ].map((s, i) => (
                <div key={i} className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2">
                  <p className="font-extrabold text-lg" style={{ color: s.c }}>{s.v}</p>
                  <p className="text-xs text-white/70">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="print:hidden flex flex-col gap-2">
            {data && !loadError && <PrintReportButton />}
            <button onClick={load}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors">
              <RefreshCw className="w-4 h-4" /> {t('تحديث البيانات', 'Refresh data')}
            </button>
            <button onClick={generateInsight} disabled={aiLoading || !data}
              className="flex items-center gap-2 bg-yellow-500/80 hover:bg-yellow-500 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors disabled:opacity-50">
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
              {aiLoading ? t('يحلل...', 'Analyzing...') : t('تحليل AI الشامل', 'Generate AI analysis')}
            </button>
          </div>
        </div>
      </motion.div>

      {loadError && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive print:hidden">{loadError} <button type="button" onClick={load} className="ms-2 font-bold underline">{t('إعادة المحاولة', 'Try again')}</button></p>}

      {/* AI Insight Box */}
      {aiInsight && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 border border-violet-200 dark:border-violet-800 rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <BrainCircuit className="w-5 h-5 text-violet-600" />
            <h3 className="font-bold text-violet-700 dark:text-violet-300">{t('تحليل الذكاء الاصطناعي للأداء المدرسي', 'AI analysis of school performance')}</h3>
          </div>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{aiInsight}</p>
          <button onClick={() => setAiInsight(null)} className="text-xs text-muted-foreground hover:text-foreground mt-3 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> {t('تحليل جديد', 'Generate new analysis')}
          </button>
        </motion.div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t('إجمالي الطلاب', 'Total students'), value: kpis.totalStudents ?? '—', icon: GraduationCap, color: '#234A65' },
          { label: t('المعلمون', 'Teachers'), value: kpis.totalTeachers ?? '—', icon: BookOpen, color: '#4A687C' },
          { label: t('الفصول', 'Classes'), value: kpis.totalClasses ?? '—', icon: Users, color: '#98793E' },
          { label: t('التحصيل حسب العملة', 'Collections by currency'), value: revenueDisplay, icon: Award, color: '#22c55e' },
        ].map((k, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            whileHover={{ y: -3 }} className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${k.color}15` }}>
                <k.icon className="w-5 h-5" style={{ color: k.color }} />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-foreground">{k.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{k.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Enrollment + Revenue */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Section title={t('اتجاه تسجيل الطلاب', 'Student enrollment trend')} icon={TrendingUp} color="#234A65">
          {enrollSeries.length > 0 ? (
            <div className="print:hidden">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={enrollSeries} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="enG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#234A65" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#234A65" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                <Area type="monotone" dataKey="value" name={t('طلاب جدد', 'New students')} stroke="#234A65" fill="url(#enG)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
            </div>
          ) : <p className="text-center text-muted-foreground text-sm py-12">{t('لا توجد بيانات', 'No data available')}</p>}
          {enrollSeries.length > 0 && <table className="hidden print:table"><thead><tr><th>{t('الشهر', 'Month')}</th><th>{t('عدد تسجيلات الطلاب', 'Student enrollments')}</th></tr></thead><tbody>{enrollSeries.map((item: any) => <tr key={item.label}><td>{item.label}</td><td>{item.value}</td></tr>)}</tbody></table>}
        </Section>

        <Section title={t('الإيرادات الشهرية', 'Monthly collections')} icon={BarChart3} color="#22c55e">
          {revSeries.length > 0 ? (
            <div className="print:hidden">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revSeries} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                  formatter={(value: any, currency: any) => [new Intl.NumberFormat(isEnglish ? 'en-US' : 'ar-SA', { style: 'currency', currency: String(currency) }).format(Number(value)), String(currency)]} />
                <Legend />
                {revenueCurrencies.map((currency: any, index: number) => <Bar key={currency} dataKey={currency} fill={['#22c55e', '#4A687C', '#f59e0b', '#234A65'][index % 4]} radius={[4, 4, 0, 0]} maxBarSize={32} />)}
              </BarChart>
            </ResponsiveContainer>
            </div>
          ) : <p className="text-center text-muted-foreground text-sm py-12">{t('لا توجد بيانات', 'No data available')}</p>}
          {revenueSource.length > 0 && <table className="hidden print:table"><thead><tr><th>{t('الشهر', 'Month')}</th><th>{t('العملة', 'Currency')}</th><th>{t('الإيراد المحصل', 'Collections')}</th></tr></thead><tbody>{revenueSource.map((item: any) => <tr key={`${item.label}:${item.currency}`}><td>{item.label}</td><td>{item.currency}</td><td>{new Intl.NumberFormat(isEnglish ? 'en-US' : 'ar-SA', { style: 'currency', currency: item.currency }).format(item.value)}</td></tr>)}</tbody></table>}
        </Section>
      </div>

      {/* Recorded early-warning summary */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Section title={t('توزيع درجات التنبيه للطلاب ذوي المؤشرات', 'Risk levels for students with indicators')} icon={Users} color="#f59e0b">
          {riskSummary ? <div className="space-y-3">
            {riskData.map((d, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-bold text-foreground">{d.name}</span>
                  <span className="font-extrabold" style={{ color: d.color }}>{d.count} {t('طالب', 'students')}</span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <motion.div className="h-full rounded-full" style={{ backgroundColor: d.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${riskSummary.total > 0 ? Math.round((d.count / riskSummary.total) * 100) : 0}%` }}
                    transition={{ duration: 1, delay: i * 0.1 }} />
                </div>
              </div>
            ))}
          </div> : <p className="py-10 text-center text-sm text-muted-foreground">{t('تعذر تحميل تنبيهات الطلاب الفعلية.', 'Could not load current student alerts.')}</p>}
          {riskSummary && <div className="mt-5 bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
                {riskSummary.critical} {t('طالب لديهم تنبيه حرج', 'students have a critical alert')}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('يُنصح بمراجعة ملفاتهم وتفعيل خطط التدخل المبكر.', 'Review their records and consider early support plans.')}
              </p>
            </div>
          </div>}
        </Section>
      </div>

      <Section title={t('آخر النشاط المسجل في المدرسة', 'Recent school activity')} icon={CheckCircle2} color="#10b981">
        {data?.recentActivity?.length ? <div className="overflow-x-auto"><table className="w-full text-start text-sm"><thead><tr><th className="p-2">{t('الإجراء', 'Action')}</th><th className="p-2">{t('بواسطة', 'By')}</th><th className="p-2">{t('التاريخ', 'Date')}</th></tr></thead><tbody>{data.recentActivity.map((item: any) => <tr key={item.id} className="border-t border-border"><td className="p-2">{item.action}</td><td className="p-2">{item.actor}</td><td className="p-2">{new Intl.DateTimeFormat(isEnglish ? 'en-US' : 'ar-SA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.createdAt))}</td></tr>)}</tbody></table></div> : <p className="py-8 text-center text-sm text-muted-foreground">{t('لا توجد إجراءات مسجلة في سجل المدرسة.', 'No actions are recorded in the school log.')}</p>}
      </Section>
      <ReportPrintFooter />
    </main>
  )
}

export default function PrincipalAnalyticsPage() {
  return (
    <SocketProvider>
      <AnalyticsInner />
    </SocketProvider>
  )
}
