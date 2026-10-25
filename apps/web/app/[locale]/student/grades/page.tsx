'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '@/lib/api/client'
import { useRealtimeGrades } from '@/lib/providers/socket-provider'
import {
  Award, TrendingUp, TrendingDown, BookOpen, AlertCircle,
  Printer, Sparkles, BrainCircuit, ChevronDown, ChevronUp,
  Target, Zap, RefreshCw, Star, Loader2
} from 'lucide-react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar
} from 'recharts'
import { ReportPrintFooter, ReportPrintIdentity } from '@/components/reports/report-print-tools'
import { useLocale } from 'next-intl'

// ── helpers ────────────────────────────────────────────────
function gradeColor(pct: number) {
  if (pct >= 90) return '#22c55e'
  if (pct >= 80) return '#4A687C'
  if (pct >= 70) return '#f59e0b'
  if (pct >= 60) return '#f97316'
  return '#ef4444'
}

function letterGrade(pct: number) {
  if (pct >= 95) return 'A+'
  if (pct >= 90) return 'A'
  if (pct >= 85) return 'A-'
  if (pct >= 80) return 'B+'
  if (pct >= 75) return 'B'
  if (pct >= 70) return 'B-'
  if (pct >= 65) return 'C+'
  if (pct >= 60) return 'C'
  return 'D'
}

function GradeBadge({ pct, locale }: { pct: number | null; locale: 'ar' | 'en' }) {
  const color = pct === null ? '#94a3b8' : gradeColor(pct)
  const letter = pct === null ? '—' : letterGrade(pct)
  return (
    <div className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl border-2 font-extrabold"
      style={{ borderColor: color, color, backgroundColor: `${color}10` }}>
      <span className="text-lg leading-none">{letter}</span>
      <span className="text-[10px] leading-none mt-0.5">{pct === null ? (locale === 'en' ? 'N/A' : 'غير متاح') : `${pct}%`}</span>
    </div>
  )
}

// ── AI Analysis Widget ─────────────────────────────────────
function AiAnalysisCard({ subjects, locale }: { subjects: any[]; locale: 'ar' | 'en' }) {
  const isEnglish = locale === 'en'
  const t = (ar: string, en: string) => isEnglish ? en : ar
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const analyze = async () => {
    setLoading(true)
    try {
      const q = isEnglish
        ? `You are an expert teacher. Assess the student's performance in these subjects: ${subjects.map(s => `${s.name}: ${s.pct}%`).join(', ')}. Provide: (1) up to two strengths, (2) up to two areas for improvement, and (3) a practical three-step study plan. Reply concisely in English.`
        : `أنت معلم خبير. قيّم أداء الطالب في هذه المواد: ${subjects.map(s => `${s.name}: ${s.pct}%`).join(', ')}. قدّم: نقاط القوة (مادتان كحد أقصى)، ونقاط تحتاج إلى تحسين (مادتان كحد أقصى)، وخطة مذاكرة عملية من 3 خطوات. أجب بالعربية الموجزة فقط.`
      const res = await apiClient.post('/ai/ask', { question: q })
      setResult(res.data?.data?.answer)
    } catch { setResult(t('تعذر الاتصال بخدمة الذكاء الاصطناعي. تحقق من إعدادات الخدمة.', 'Could not connect to the AI service. Check the service configuration.')) }
    finally { setLoading(false) }
  }

  return (
    <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-3xl p-6 text-white">
      <h3 className="font-bold mb-3 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-yellow-300" /> {t('تحليل الذكاء الاصطناعي لأدائك الأكاديمي', 'AI analysis of your academic performance')}
      </h3>
      {!result ? (
        <div className="space-y-3">
          <p className="text-sm text-white/80">{t('احصل على تقييم فوري وخطة مذاكرة مخصصة بالذكاء الاصطناعي', 'Get an instant assessment and a personalized AI study plan')}</p>
          <button onClick={analyze} disabled={loading}
            className="w-full bg-white/20 hover:bg-white/30 py-3 rounded-2xl font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('جاري التحليل...', 'Analyzing…')}</> : <><BrainCircuit className="w-4 h-4" /> {t('ابدأ التحليل الذكي', 'Start AI analysis')}</>}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-white/10 rounded-2xl p-4">
            <p className="text-sm text-white/90 leading-relaxed whitespace-pre-line">{result}</p>
          </div>
          <button onClick={() => setResult(null)} className="text-xs text-white/60 hover:text-white transition-colors flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> {t('تحليل جديد', 'Analyze again')}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Subject Row ────────────────────────────────────────────
function SubjectRow({ grade, idx, locale }: { grade: any; idx: number; locale: 'ar' | 'en' }) {
  const isEnglish = locale === 'en'
  const t = (ar: string, en: string) => isEnglish ? en : ar
  const [expanded, setExpanded] = useState(false)
  const pct = typeof grade.pct === 'number' && Number.isFinite(grade.pct) ? Math.round(grade.pct) : null
  const color = pct === null ? '#94a3b8' : gradeColor(pct)

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
      className="bg-card border border-border rounded-2xl overflow-hidden">
      <button onClick={() => setExpanded(p => !p)} className="w-full flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
        <GradeBadge pct={pct} locale={locale} />
        <div className="flex-1 min-w-0 text-right">
          <p className="font-bold text-foreground">{grade.name || grade.subjectName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{grade.teacher || grade.teacherName} • {grade.code || grade.subjectCode}</p>
          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div className="h-full rounded-full" style={{ backgroundColor: color }}
              initial={{ width: 0 }} animate={{ width: `${pct ?? 0}%` }} transition={{ duration: 1, delay: idx * 0.05 }} />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {pct !== null && pct >= 85 ? <TrendingUp className="w-4 h-4 text-emerald-500" /> : pct !== null && pct < 65 ? <TrendingDown className="w-4 h-4 text-rose-500" /> : null}
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 pt-1 border-t border-border/50 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: t('الدرجة', 'Score'), value: grade.score !== null && grade.maxScore !== null ? `${grade.score} / ${grade.maxScore}` : t('لا توجد درجة مكتملة', 'No completed score') },
                  { label: t('النسبة', 'Percentage'), value: pct === null ? t('غير متاحة', 'N/A') : `${pct}%` },
                  { label: t('التقدير', 'Grade'), value: pct === null ? '—' : letterGrade(pct) },
                ].map((s, i) => (
                  <div key={i} className="bg-muted/50 rounded-xl p-3 text-center">
                    <p className="text-sm font-extrabold text-foreground" style={{ color }}>{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
              {grade.assignments?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-muted-foreground mb-2">{t('الواجبات المصححة', 'Graded assignments')}</p>
                  <div className="space-y-1.5">
                    {grade.assignments.map((a: any, i: number) => {
                      const aPct = Math.round(((a.grade ?? a.score ?? 0) / (a.maxScore ?? 100)) * 100)
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <div className="flex-1 text-xs text-muted-foreground truncate">{a.name || a.title}</div>
                          <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${aPct}%`, backgroundColor: gradeColor(aPct) }} />
                          </div>
                          <span className="text-xs font-bold" style={{ color: gradeColor(aPct) }}>{a.grade ?? a.score}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {pct !== null && pct < 70 && (
                <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    {t('هذه المادة تحتاج اهتماماً. راجع دروسها وتواصل مع معلمك للحصول على دعم إضافي.', 'This subject needs attention. Review its lessons and contact your teacher for extra support.')}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Main ──────────────────────────────────────────────────
export default function StudentGradesPage() {
  const locale = useLocale() === 'en' ? 'en' : 'ar'
  const isEnglish = locale === 'en'
  const t = useCallback((ar: string, en: string) => isEnglish ? en : ar, [isEnglish])
  const [grades, setGrades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [liveGrade, setLiveGrade] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'name' | 'grade' | 'recent'>('grade')

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const res = await apiClient.get('/grades')
      const raw = Array.isArray(res.data?.grades) ? res.data.grades : []
      const mapped = raw.map((g: any) => {
        const score = typeof (g.grade ?? g.score) === 'number' && Number.isFinite(g.grade ?? g.score)
          ? (g.grade ?? g.score)
          : null
        const maxScore = typeof (g.maxGrade ?? g.maxScore) === 'number' && Number.isFinite(g.maxGrade ?? g.maxScore)
          ? (g.maxGrade ?? g.maxScore)
          : null
        const recordedPercentage = typeof g.percentage === 'number' && Number.isFinite(g.percentage)
          ? g.percentage
          : null
        const pct = recordedPercentage ?? (score !== null && maxScore !== null && maxScore > 0
          ? (score / maxScore) * 100
          : null)

        return {
          id: g.id,
          name: g.subjectName || t('اسم المادة غير متاح', 'Subject unavailable'),
          code: g.subjectCode || '',
          teacher: g.teacher?.name || g.teacherName || '',
          score,
          maxScore,
          pct,
          assignments: [],
          createdAt: g.date,
        }
      })
      setGrades(mapped)
    } catch {
      setGrades([])
      setLoadError(t('تعذر تحميل سجلات الدرجات من المدرسة.', 'Could not load grade records from the school.'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { load() }, [load])

  // Real-time grade push
  useRealtimeGrades(useCallback((g: any) => {
    const msg = isEnglish ? `New grade recorded in ${g.subjectName}: ${g.score}/${g.maxScore}` : `تم رصد درجة جديدة في ${g.subjectName}: ${g.score}/${g.maxScore}`
    setLiveGrade(msg)
    setTimeout(() => setLiveGrade(null), 5000)
    load() // refresh list
  }, [load, isEnglish]))

  const sorted = [...grades].sort((a, b) => {
    if (sortBy === 'grade') {
      if (a.pct === null) return b.pct === null ? 0 : 1
      if (b.pct === null) return -1
      return b.pct - a.pct
    }
    if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '')
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  const scoredGrades = grades.filter((grade) => typeof grade.pct === 'number' && Number.isFinite(grade.pct))
  const avg = scoredGrades.length > 0 ? Math.round(scoredGrades.reduce((sum, grade) => sum + grade.pct, 0) / scoredGrades.length) : null
  const best = scoredGrades.reduce((current, grade) => current === null || grade.pct > current.pct ? grade : current, null as (typeof scoredGrades[number] | null))
  const worst = scoredGrades.reduce((current, grade) => current === null || grade.pct < current.pct ? grade : current, null as (typeof scoredGrades[number] | null))

  const radarData = scoredGrades.slice(0, 8).map(g => ({ subject: g.name.substring(0, 6), value: g.pct }))
  const histData = [...scoredGrades].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    .map(g => ({ name: g.name.substring(0, 6), [t('درجة', 'Score')]: g.pct }))

  return (
    <div className="report-print-root space-y-6 pb-10" dir={isEnglish ? 'ltr' : 'rtl'}>
      <ReportPrintIdentity title={t('التقرير الأكاديمي للطالب', 'Student academic report')} subtitle={t('سجل الدرجات المحفوظ في نظام المدرسة', 'Grade record saved in the school system')} />
      {/* Live toast */}
      <AnimatePresence>
        {liveGrade && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-sm font-bold">
            <Award className="w-4 h-4" /> {liveGrade}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-700 via-indigo-600 to-blue-600 p-8 text-white shadow-2xl">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-12 -left-8 w-48 h-48 bg-blue-300/20 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-violet-200 text-sm mb-1">{t('سجل الدرجات', 'Grade record')}</p>
            <h1 className="text-3xl font-extrabold mb-2">{t('أدائي الأكاديمي', 'My academic performance')}</h1>
            <p className="text-white/80 text-sm">{grades.length} {t('سجل درجة', 'grade records')} · {scoredGrades.length} {t('درجة مكتملة', 'completed scores')}</p>
          </div>
          <button type="button" onClick={() => window.print()} disabled={loading || grades.length === 0} className="no-print inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-indigo-700 shadow-md disabled:cursor-not-allowed disabled:opacity-50">
            <Printer className="h-4 w-4" /> {t('طباعة تقرير الدرجات A4', 'Print grade report (A4)')}
          </button>
          {/* Summary Cards */}
          <div className="flex gap-4 flex-wrap">
            {[
              { label: t('المعدل العام', 'Overall average'), value: avg === null ? '—' : `${avg}%`, icon: Star, color: '#fbbf24' },
              { label: t('أفضل مادة', 'Top subject'), value: best?.name ?? '—', icon: TrendingUp, color: '#22c55e' },
              { label: t('تحتاج تحسين', 'Needs improvement'), value: worst && worst.pct < 75 ? worst.name : '—', icon: Target, color: '#f87171' },
            ].map((s, i) => (
              <div key={i} className="bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 flex items-center gap-2">
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
                <div>
                  <p className="text-lg font-extrabold">{s.value}</p>
                  <p className="text-xs text-white/70">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Charts */}
      {scoredGrades.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-5">
          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
            className="bg-card border border-border rounded-3xl p-6">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-violet-500" /> {t('خريطة الأداء الشاملة', 'Overall performance map')}
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Radar dataKey="value" stroke="#234A65" fill="#234A65" fillOpacity={0.3} strokeWidth={2.5}
                  dot={{ r: 4, fill: '#234A65' }} />
              </RadarChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
            className="bg-card border border-border rounded-3xl p-6">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-500" /> {t('مقارنة الدرجات', 'Grade comparison')}
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={histData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} domain={[0, 100]} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                  formatter={(v: any) => [`${v}%`, t('الدرجة', 'Score')]} />
                <Bar dataKey={t('درجة', 'Score')} radius={[4, 4, 0, 0]} maxBarSize={32}
                  fill="#234A65"
                  label={{ position: 'top', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      )}

      {/* AI Analysis */}
      {scoredGrades.length > 0 && <AiAnalysisCard subjects={scoredGrades} locale={locale} />}

      {/* Grades List */}
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <Award className="w-5 h-5 text-violet-500" /> {t('تفاصيل الدرجات', 'Grade details')}
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t('ترتيب حسب:', 'Sort by:')}</span>
            {(['grade', 'name', 'recent'] as const).map(s => (
              <button key={s} onClick={() => setSortBy(s)}
                className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-colors ${sortBy === s ? 'bg-violet-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
                {s === 'grade' ? t('الدرجة', 'Score') : s === 'name' ? t('الاسم', 'Name') : t('الأحدث', 'Most recent')}
              </button>
            ))}
            <button onClick={load} className="p-1.5 rounded-xl bg-muted text-muted-foreground hover:bg-muted/70 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {loadError && <p role="alert" className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{loadError}</p>}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" aria-label={t('جاري التحميل', 'Loading')} />
          </div>
        ) : grades.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="w-16 h-16 bg-muted rounded-3xl flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="font-bold text-foreground">{t('لا توجد درجات مسجلة بعد', 'No grades recorded yet')}</p>
            <p className="text-sm text-muted-foreground">{t('ستظهر درجاتك هنا فور رصدها من المعلم', 'Your grades will appear here once entered by your teacher')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((g, i) => <SubjectRow key={g.id} grade={g} idx={i} locale={locale} />)}
          </div>
        )}
      </div>
      <ReportPrintFooter />
    </div>
  )
}
