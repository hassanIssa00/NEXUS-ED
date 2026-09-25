'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '@/lib/api/client'
import { useRealtimeGrades } from '@/lib/providers/socket-provider'
import {
  Award, TrendingUp, TrendingDown, BookOpen, AlertCircle,
  Download, Sparkles, BrainCircuit, ChevronDown, ChevronUp,
  Target, Zap, RefreshCw, Star, Loader2
} from 'lucide-react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar
} from 'recharts'

// ── helpers ────────────────────────────────────────────────
function gradeColor(pct: number) {
  if (pct >= 90) return '#22c55e'
  if (pct >= 80) return '#3b82f6'
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

function GradeBadge({ pct }: { pct: number }) {
  const color = gradeColor(pct)
  const letter = letterGrade(pct)
  return (
    <div className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl border-2 font-extrabold"
      style={{ borderColor: color, color, backgroundColor: `${color}10` }}>
      <span className="text-lg leading-none">{letter}</span>
      <span className="text-[10px] leading-none mt-0.5">{pct}%</span>
    </div>
  )
}

// ── AI Analysis Widget ─────────────────────────────────────
function AiAnalysisCard({ subjects }: { subjects: any[] }) {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const analyze = async () => {
    setLoading(true)
    try {
      const q = `أنت معلم خبير. قيّم أداء الطالب في هذه المواد: ${subjects.map(s => `${s.name}: ${s.pct}%`).join(', ')}. 
      قدّم:
      1. نقاط القوة (مادتان كحد أقصى)
      2. نقاط الضعف (مادتان تحتاجان تحسيناً)
      3. خطة مذاكرة عملية (3 خطوات موجزة)
      الإجابة بالعربية الموجزة فقط.`
      const res = await apiClient.post('/ai/ask', { question: q })
      setResult(res.data?.data?.answer)
    } catch { setResult('تعذر الاتصال بخدمة AI. تأكد من إعدادات API Key.') }
    finally { setLoading(false) }
  }

  return (
    <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-3xl p-6 text-white">
      <h3 className="font-bold mb-3 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-yellow-300" /> تحليل AI لأدائك الأكاديمي
      </h3>
      {!result ? (
        <div className="space-y-3">
          <p className="text-sm text-white/80">احصل على تقييم فوري وخطة مذاكرة مخصصة بالذكاء الاصطناعي</p>
          <button onClick={analyze} disabled={loading}
            className="w-full bg-white/20 hover:bg-white/30 py-3 rounded-2xl font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري التحليل...</> : <><BrainCircuit className="w-4 h-4" /> ابدأ التحليل الذكي</>}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-white/10 rounded-2xl p-4">
            <p className="text-sm text-white/90 leading-relaxed whitespace-pre-line">{result}</p>
          </div>
          <button onClick={() => setResult(null)} className="text-xs text-white/60 hover:text-white transition-colors flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> تحليل جديد
          </button>
        </div>
      )}
    </div>
  )
}

// ── Subject Row ────────────────────────────────────────────
function SubjectRow({ grade, idx }: { grade: any; idx: number }) {
  const [expanded, setExpanded] = useState(false)
  const pct = Math.round(grade.pct || grade.percentage || 0)
  const color = gradeColor(pct)

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
      className="bg-card border border-border rounded-2xl overflow-hidden">
      <button onClick={() => setExpanded(p => !p)} className="w-full flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
        <GradeBadge pct={pct} />
        <div className="flex-1 min-w-0 text-right">
          <p className="font-bold text-foreground">{grade.name || grade.subjectName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{grade.teacher || grade.teacherName} • {grade.code || grade.subjectCode}</p>
          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div className="h-full rounded-full" style={{ backgroundColor: color }}
              initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, delay: idx * 0.05 }} />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {pct >= 85 ? <TrendingUp className="w-4 h-4 text-emerald-500" /> : pct < 65 ? <TrendingDown className="w-4 h-4 text-rose-500" /> : null}
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 pt-1 border-t border-border/50 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'الدرجة', value: `${grade.score ?? grade.grade ?? 0} / ${grade.maxScore ?? grade.maxGrade ?? 100}` },
                  { label: 'النسبة', value: `${pct}%` },
                  { label: 'التقدير', value: letterGrade(pct) },
                ].map((s, i) => (
                  <div key={i} className="bg-muted/50 rounded-xl p-3 text-center">
                    <p className="text-sm font-extrabold text-foreground" style={{ color }}>{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
              {grade.assignments?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-muted-foreground mb-2">الواجبات المصححة</p>
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
              {pct < 70 && (
                <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    هذه المادة تحتاج اهتماماً. راجع دروسها وتواصل مع معلمك للحصول على دعم إضافي.
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
  const [grades, setGrades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [liveGrade, setLiveGrade] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'name' | 'grade' | 'recent'>('grade')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiClient.get('/grades/my')
      const raw = res.data?.data || res.data || []
      let mapped = Array.isArray(raw)
        ? raw.map((g: any) => ({
            id: g.id,
            name: g.subject?.name || g.subjectName || 'مادة',
            code: g.subject?.code || g.subjectCode || '',
            teacher: g.teacher?.name || g.teacherName || '',
            score: g.score ?? g.grade ?? 0,
            maxScore: g.maxScore ?? g.maxGrade ?? 100,
            pct: Math.round(((g.score ?? g.grade ?? 0) / (g.maxScore ?? g.maxGrade ?? 100)) * 100),
            assignments: g.assignments || [],
            createdAt: g.createdAt,
          }))
        : []

      if (mapped.length === 0) {
        const { nexusBridge } = await import('@/lib/nexusDataBridge')
        const hwSubs = nexusBridge.getHomeworkSubmissions().filter(s => s.studentId === 'cls-std-2')
        mapped = [
          {
            id: 'g-1',
            name: 'اللغة العربية',
            code: 'ARB-101',
            teacher: 'د. إسماعيل عيسى',
            score: 95,
            maxScore: 100,
            pct: 95,
            assignments: hwSubs.filter(s => s.assignmentTitle?.includes('عربي') || s.assignmentTitle?.includes('إملاء')).map(s => ({ title: s.assignmentTitle, score: s.grade || 95, maxScore: 100, date: s.submittedAt })),
            createdAt: new Date().toISOString(),
          },
          {
            id: 'g-2',
            name: 'القرآن الكريم والتربية الإسلامية',
            code: 'ISL-101',
            teacher: 'د. إسماعيل عيسى',
            score: 98,
            maxScore: 100,
            pct: 98,
            assignments: [{ title: 'حفظ وتلاوة سورة الفاتحة وقصار السور', score: 98, maxScore: 100, date: new Date().toISOString() }],
            createdAt: new Date().toISOString(),
          },
          {
            id: 'g-3',
            name: 'الرياضيات',
            code: 'MTH-101',
            teacher: 'د. إسماعيل عيسى',
            score: 92,
            maxScore: 100,
            pct: 92,
            assignments: [{ title: 'تمارين الجمع والعد التصاعدي', score: 92, maxScore: 100, date: new Date().toISOString() }],
            createdAt: new Date().toISOString(),
          },
          {
            id: 'g-4',
            name: 'العلوم',
            code: 'SCI-101',
            teacher: 'د. إسماعيل عيسى',
            score: 94,
            maxScore: 100,
            pct: 94,
            assignments: [{ title: 'استكشاف الكائنات الحية والبيئة', score: 94, maxScore: 100, date: new Date().toISOString() }],
            createdAt: new Date().toISOString(),
          },
        ]
      }
      setGrades(mapped)
    } catch {
      // Fallback
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Real-time grade push
  useRealtimeGrades(useCallback((g: any) => {
    const msg = `تم رصد درجة جديدة في ${g.subjectName}: ${g.score}/${g.maxScore}`
    setLiveGrade(msg)
    setTimeout(() => setLiveGrade(null), 5000)
    load() // refresh list
  }, [load]))

  const sorted = [...grades].sort((a, b) => {
    if (sortBy === 'grade') return b.pct - a.pct
    if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '')
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  const avg = grades.length > 0 ? Math.round(grades.reduce((s, g) => s + g.pct, 0) / grades.length) : 0
  const best = grades.reduce((a, b) => (a.pct > b.pct ? a : b), { name: '—', pct: 0 })
  const worst = grades.reduce((a, b) => (a.pct < b.pct ? a : b), { name: '—', pct: 100 })

  const radarData = grades.slice(0, 8).map(g => ({ subject: g.name.substring(0, 6), value: g.pct }))
  const histData = [...grades].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    .map(g => ({ name: g.name.substring(0, 6), درجة: g.pct }))

  return (
    <div className="space-y-6 pb-10" dir="rtl">
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
            <p className="text-violet-200 text-sm mb-1">سجل الدرجات</p>
            <h1 className="text-3xl font-extrabold mb-2">أدائي الأكاديمي</h1>
            <p className="text-white/80 text-sm">{grades.length} مادة دراسية مسجلة</p>
          </div>
          {/* Summary Cards */}
          <div className="flex gap-4 flex-wrap">
            {[
              { label: 'المعدل العام', value: `${avg}%`, icon: Star, color: '#fbbf24' },
              { label: 'أفضل مادة', value: best.name, icon: TrendingUp, color: '#22c55e' },
              { label: 'تحتاج تحسين', value: worst.pct < 75 ? worst.name : '—', icon: Target, color: '#f87171' },
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
      {grades.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-5">
          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
            className="bg-card border border-border rounded-3xl p-6">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-violet-500" /> خريطة الأداء الشاملة
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Radar dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} strokeWidth={2.5}
                  dot={{ r: 4, fill: '#8b5cf6' }} />
              </RadarChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
            className="bg-card border border-border rounded-3xl p-6">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-500" /> مقارنة الدرجات
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={histData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} domain={[0, 100]} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                  formatter={(v: any) => [`${v}%`, 'الدرجة']} />
                <Bar dataKey="درجة" radius={[4, 4, 0, 0]} maxBarSize={32}
                  fill="#8b5cf6"
                  label={{ position: 'top', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      )}

      {/* AI Analysis */}
      {grades.length > 0 && <AiAnalysisCard subjects={grades} />}

      {/* Grades List */}
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <Award className="w-5 h-5 text-violet-500" /> تفاصيل الدرجات
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">ترتيب حسب:</span>
            {(['grade', 'name', 'recent'] as const).map(s => (
              <button key={s} onClick={() => setSortBy(s)}
                className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-colors ${sortBy === s ? 'bg-violet-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
                {s === 'grade' ? 'الدرجة' : s === 'name' ? 'الاسم' : 'الأحدث'}
              </button>
            ))}
            <button onClick={load} className="p-1.5 rounded-xl bg-muted text-muted-foreground hover:bg-muted/70 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
          </div>
        ) : grades.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="w-16 h-16 bg-muted rounded-3xl flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="font-bold text-foreground">لا توجد درجات مسجلة بعد</p>
            <p className="text-sm text-muted-foreground">ستظهر درجاتك هنا فور رصدها من المعلم</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((g, i) => <SubjectRow key={g.id} grade={g} idx={i} />)}
          </div>
        )}
      </div>
    </div>
  )
}
