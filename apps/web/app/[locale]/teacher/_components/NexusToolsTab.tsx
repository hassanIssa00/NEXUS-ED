'use client'

import { useMemo, useState } from 'react'
import { Link } from '@/i18n/routing'
import NexusAiToolDialog from './NexusAiToolDialog'
import {
  Activity, AlertTriangle, Award, BarChart3, BookMarked, BookOpen, Brain,
  Briefcase, Calendar, CalendarDays, Check, CheckSquare, Clipboard, FileEdit,
  FileOutput, FileSpreadsheet, FlaskConical, Flower2, Gamepad2, HeartHandshake,
  HelpCircle, Lightbulb, Map, MessageCircle, PenLine, Printer, Search, ShieldCheck,
  Star, Target, TestTube2, Trophy, TrendingUp, Users, type LucideIcon,
} from 'lucide-react'

type ToolStatus = 'api' | 'content' | 'ai' | 'unavailable' | 'guide'
type Tool = {
  id: string
  label: string
  icon: LucideIcon
  color: string
  status: ToolStatus
  href?: string
  note: string
}
type ToolGroup = { id: string; label: string; emoji: string; color: string; tools: Tool[] }

const GROUPS: ToolGroup[] = [
  {
    id: 'grading', label: 'التقييم والتصحيح', emoji: '✅', color: '#f59e0b', tools: [
      { id: 'autograde', label: 'التصحيح الآلي (تصحيحي)', icon: CheckSquare, color: '#f59e0b', status: 'api', href: '/teacher/grading', note: 'التصحيح والدرجات من تسليمات النظام الفعلية.' },
      { id: 'hwgrade', label: 'تصحيح الواجبات', icon: Check, color: '#d97706', status: 'api', href: '/teacher/automation/bulk-grading', note: 'يراجع التسليمات ويحفظ الدرجات عبر API الواجبات.' },
      { id: 'worksheets', label: 'اختبارات وأوراق عمل', icon: FileEdit, color: '#234A65', status: 'api', href: '/teacher/quizzes', note: 'إنشاء الاختبارات ونشرها ومراجعة التسليمات.' },
      { id: 'diagnosis', label: 'الاختبار التشخيصي', icon: TestTube2, color: '#4A687C', status: 'api', href: '/assessment/reports', note: 'يعرض تقارير محاولات الاختبار التشخيصي المحفوظة في النظام.' },
      { id: 'remedial', label: 'الخطة العلاجية', icon: Target, color: '#98793E', status: 'ai', note: 'لا يوجد API ينشئ خطة علاجية ويحفظها حاليًا. مؤشرات التعثر الفعلية متاحة من لوحة متابعة الطلاب.' },
      { id: 'hwreports', label: 'الاختبارات والواجبات (تقارير...)', icon: BarChart3, color: '#4A687C', status: 'api', href: '/teacher/automation/results', note: 'تحليل درجات وتسليمات الواجبات المحفوظة.' },
      { id: 'perf', label: 'الأداء الوظيفي', icon: Briefcase, color: '#35556B', status: 'ai', note: 'لا توجد خدمة أو صلاحية API لتقارير الأداء الوظيفي للمعلم.' },
    ],
  },
  {
    id: 'reports', label: 'التقارير والشهادات', emoji: '📋', color: '#234A65', tools: [
      { id: 'certs', label: 'كشوف وشهادات وملفات إنجاز', icon: Award, color: '#f59e0b', status: 'api', href: '/teacher/automation/certificates', note: 'إصدار الشهادات وحفظها في ملف الطالب عبر API النظام.' },
      { id: 'thanks', label: 'شهادات شكر', icon: Star, color: '#98793E', status: 'api', href: '/teacher/automation/certificates', note: 'إصدار شهادة شكر وحفظها وتنزيل ملف PDF من النظام.' },
      { id: 'report', label: 'تقريري', icon: BarChart3, color: '#98793E', status: 'api', href: '/teacher/reports', note: 'تقارير مبنية على درجات وحضور وواجبات مسجلة.' },
      { id: 'autoreport', label: 'التقارير والشواهد التلقائية', icon: FileOutput, color: '#35556B', status: 'ai', note: 'لا يوجد API يجمع الشواهد وينشئ تقريرًا تلقائيًا حتى الآن.' },
      { id: 'achievement', label: 'ملف إنجاز جاهز بالشواهد', icon: Trophy, color: '#d97706', status: 'ai', note: 'لا توجد خدمة لحفظ الشواهد وبناء ملف إنجاز تلقائيًا.' },
      { id: 'jobportfolio', label: 'ملف إنجاز وشواهد وظيفية', icon: ShieldCheck, color: '#35556B', status: 'ai', note: 'لا توجد خدمة أو API لملف الإنجاز الوظيفي حتى الآن.' },
    ],
  },
  {
    id: 'attendance', label: 'الحضور وإدارة الصف', emoji: '📅', color: '#10b981', tools: [
      { id: 'att', label: 'تطبيق إدارة الصفية', icon: Clipboard, color: '#10b981', status: 'api', href: '/teacher/classes', note: 'قوائم الفصول والحضور محفوظة من وإلى API النظام.' },
      { id: 'absent', label: 'رصد الغياب', icon: CalendarDays, color: '#ef4444', status: 'api', href: '/teacher/attendance', note: 'قراءة وحفظ سجلات الغياب الفعلية حسب الفصل والتاريخ.' },
      { id: 'daily', label: 'الإنجاز اليومي والأسبوعي', icon: Activity, color: '#35556B', status: 'ai', note: 'لا يوجد سجل إنجاز يومي أو أسبوعي بهذا الاسم في API الحالي.' },
      { id: 'activity', label: 'النشاط الطلابي', icon: Activity, color: '#98793E', status: 'api', href: '/teacher/photos', note: 'إدارة فعاليات المدرسة المرفوعة وحفظها عبر API الفعاليات.' },
      { id: 'actleader', label: 'رائد النشاط', icon: Award, color: '#234A65', status: 'api', href: '/teacher/photos', note: 'إدارة فعاليات وأنشطة المدرسة المسجلة عبر API الفعاليات.' },
    ],
  },
  {
    id: 'curriculum', label: 'المنهج والتحضير', emoji: '📚', color: '#35556B', tools: [
      { id: 'currdist', label: 'توزيع المنهج', icon: BookMarked, color: '#35556B', status: 'ai', note: 'لا توجد خدمة تحفظ توزيع المنهج على الفصول في API الحالي.' },
      { id: 'curr1448', label: 'توزيع المنهج 1448', icon: Calendar, color: '#234A65', status: 'ai', note: 'لا توجد خدمة توزيع أو حفظ خطة العام 1448 في API الحالي.' },
      { id: 'prep', label: 'التحضير المسرد', icon: PenLine, color: '#234A65', status: 'api', href: '/teacher/lessons', note: 'إنشاء الدروس وتعديلها وحفظها في API الدروس.' },
      { id: 'print', label: 'نسخ وطباعة التحضير', icon: Printer, color: '#64748b', status: 'ai', note: 'لا يوجد مسار يجلب التحضير المحفوظ ويصدره للطباعة.' },
      { id: 'books', label: 'الكتب الدراسية', icon: BookOpen, color: '#35556B', status: 'content', href: '/teacher/curriculum', note: 'يفتح فهرس الكتب والمناهج المتاح داخل المنصة.' },
      { id: 'solutions', label: 'حلول الكتب 1448', icon: BookMarked, color: '#98793E', status: 'ai', note: 'لا توجد مكتبة حلول أو API موثّق لها في النظام.' },
      { id: 'strategies', label: 'توثيق استراتيجيات التعلم', icon: Lightbulb, color: '#f59e0b', status: 'ai', note: 'لا يوجد API لحفظ استراتيجيات التعلم وربطها بالدروس.' },
      { id: 'cmap', label: 'خرائط مفاهيم', icon: Map, color: '#35556B', status: 'ai', note: 'مولّد المحتوى يستخرج مفاهيم من النص، لكنه لا ينشئ خريطة ويحفظها؛ لذلك أوقفت هذا الإجراء.' },
      { id: 'weekplan', label: 'الخطة الفصلية', icon: Calendar, color: '#35556B', status: 'ai', note: 'لا توجد خدمة لحفظ الخطط الفصلية أو توزيعها.' },
    ],
  },
  {
    id: 'communication', label: 'التواصل والتنويه', emoji: '📢', color: '#4A687C', tools: [
      { id: 'parentmsg', label: 'التواصل مع أولياء الأمور', icon: MessageCircle, color: '#4A687C', status: 'api', href: '/teacher/messages', note: 'المحادثات والرسائل تُقرأ وتُرسل عبر API الرسائل.' },
      { id: 'alert', label: 'تنويه', icon: AlertTriangle, color: '#ef4444', status: 'api', href: '/teacher/notifications', note: 'إرسال إشعارات فعلية للطلاب وأولياء الأمور.' },
      { id: 'forms', label: 'فورمز', icon: FileSpreadsheet, color: '#059669', status: 'api', href: '/teacher/quizzes', note: 'إنشاء نماذج تقييم إلكترونية وحفظ إجاباتها وتسليماتها.' },
      { id: 'submanage', label: 'طلب تفعيل الاشتراك', icon: ShieldCheck, color: '#10b981', status: 'api', href: '/teacher/messages', note: 'افتح محادثات المنصة لإرسال طلب التفعيل للإدارة ومتابعته.' },
    ],
  },
  {
    id: 'analytics', label: 'التحليل والذكاء الاصطناعي', emoji: '🧠', color: '#234A65', tools: [
      { id: 'counselor', label: 'الموجّه الطلابي', icon: HeartHandshake, color: '#234A65', status: 'api', href: '/teacher/student-risk-report', note: 'يعرض إنذارات مبنية على سجلات الدرجات والحضور الفعلية.' },
      { id: 'search', label: 'البحث السريع', icon: Search, color: '#35556B', status: 'api', href: '/teacher/classes', note: 'ابحث في قوائم طلاب فصولك المحمّلة من النظام.' },
      { id: 'patterns', label: 'أنماط التعلم', icon: Brain, color: '#234A65', status: 'ai', note: 'لا يوجد API يحلل أنماط التعلم أو يسجل نتائجها حاليًا.' },
      { id: 'noor', label: 'رصد وتحليل نور', icon: BarChart3, color: '#b45309', status: 'ai', note: 'لا يوجد ربط مع نظام نور أو بيانات اعتماد API له.' },
      { id: 'noorext', label: 'تحليل النتائج خارج نور', icon: TrendingUp, color: '#35556B', status: 'ai', note: 'لا توجد خدمة لاستيراد ملفات نتائج خارجية وتحليلها.' },
      { id: 'nafes', label: 'نافس (الاختبارات الوطنية)', icon: Target, color: '#dc2626', status: 'ai', note: 'لا توجد بيانات أو API رسمي لأسئلة نافس في النظام.' },
      { id: 'outcomes', label: 'خريطة نواتج التعلم', icon: Map, color: '#35556B', status: 'ai', note: 'لا توجد قاعدة نواتج تعلم أو API لربطها بنتائج الطلاب.' },
    ],
  },
  {
    id: 'content', label: 'المحتوى التفاعلي', emoji: '🎮', color: '#98793E', tools: [
      { id: 'games', label: 'منصة الألعاب التعليمية', icon: Gamepad2, color: '#10b981', status: 'api', href: '/teacher/games', note: 'يعرض ألعاب المدرسة وترتيب النتائج المحفوظة، مع تقييد API بمدرسة الحساب.' },
      { id: 'vlab', label: 'منصة التجارب الافتراضية', icon: FlaskConical, color: '#35556B', status: 'ai', note: 'لا توجد مكتبة تجارب افتراضية أو API مخصص لها.' },
      { id: 'kg', label: 'منصة الروضة', icon: Flower2, color: '#98793E', status: 'ai', note: 'لا توجد خدمة أو بيانات للروضة في API الحالي.' },
      { id: 'ppt', label: 'عروض تقديمية بوربوينت', icon: TrendingUp, color: '#e97316', status: 'ai', note: 'مولّد المحتوى لا يصدر ملفات PowerPoint؛ لذلك أوقفت زر التوليد الوهمي.' },
      { id: 'quran', label: 'الفهم القرآني', icon: BookOpen, color: '#065f46', status: 'content', href: '/teacher/curriculum', note: 'يفتح محتوى القرآن المتاح في فهرس المناهج.' },
      { id: 'guide', label: 'شرح الاستخدام', icon: HelpCircle, color: '#64748b', status: 'guide', note: 'عرض توضيح لمصادر الأدوات وحالتها.' },
    ],
  },
]

function statusLabel(status: ToolStatus) {
  if (status === 'api') return 'متصل بالنظام'
  if (status === 'content') return 'محتوى المنصة'
  if (status === 'ai') return 'جاهز بالذكاء الاصطناعي'
  if (status === 'guide') return 'دليل'
  return 'غير متاح حاليًا'
}

export default function NexusToolsTab() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [guideOpen, setGuideOpen] = useState(false)
  const [activeTool, setActiveTool] = useState<{ id: string; label: string; groupLabel: string } | null>(null)
  const totalTools = GROUPS.reduce((sum, group) => sum + group.tools.length, 0)
  const apiTools = GROUPS.reduce((sum, group) => sum + group.tools.filter((tool) => tool.status === 'api').length, 0)
  const aiTools = GROUPS.reduce((sum, group) => sum + group.tools.filter((tool) => tool.status === 'ai').length, 0)

  const filteredGroups = useMemo(() => GROUPS.map((group) => {
    if (activeCategory !== 'all' && group.id !== activeCategory) return null
    const tools = group.tools.filter((tool) => !searchQuery.trim() || tool.label.toLocaleLowerCase('ar').includes(searchQuery.trim().toLocaleLowerCase('ar')))
    return tools.length ? { ...group, tools } : null
  }).filter((group): group is ToolGroup => Boolean(group)), [activeCategory, searchQuery])

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      <section className="rounded-3xl bg-gradient-to-l from-teal-800 via-sky-800 to-indigo-900 p-6 text-white shadow-lg md:p-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <p className="mb-2 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold">صندوق أدوات المعلم</p>
            <h2 className="text-2xl font-black md:text-3xl">أدوات نكسس</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">افتح أدوات النظام المرتبطة ببيانات المنصة، أو شغّل الأداة الذكية عبر Groq واحفظ نتيجتها في قوالبك. أدوات التحليل الذكي تعتمد على البيانات التي تدخلها ولا تدّعي قراءة سجل لم يتم تحميله.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-3"><p className="text-2xl font-black">{totalTools}</p><p className="text-[11px] text-white/75">أداة</p></div>
            <div className="rounded-2xl border border-emerald-200/30 bg-emerald-400/15 px-3 py-3"><p className="text-2xl font-black">{apiTools}</p><p className="text-[11px] text-white/75">مرتبطة بـAPI</p></div>
            <div className="rounded-2xl border border-violet-200/30 bg-violet-400/15 px-3 py-3"><p className="text-2xl font-black">{aiTools}</p><p className="text-[11px] text-white/75">مدعومة بالذكاء</p></div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#1e1e2d] md:flex-row md:items-center md:justify-between">
        <label className="relative block flex-1">
          <Search className="absolute right-3.5 top-3 h-4 w-4 text-gray-400" />
          <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="ابحث عن أداة..." className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-3 pr-10 text-sm outline-none focus:border-teal-600 dark:border-white/10 dark:bg-white/5 dark:text-white" />
        </label>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setActiveCategory('all')} className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold ${activeCategory === 'all' ? 'bg-teal-700 text-white' : 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300'}`}>الكل ({totalTools})</button>
          {GROUPS.map((group) => <button key={group.id} onClick={() => setActiveCategory(group.id)} className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold ${activeCategory === group.id ? 'bg-teal-700 text-white' : 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300'}`}>{group.label} ({group.tools.length})</button>)}
        </div>
      </section>

      {filteredGroups.map((group) => (
        <section key={group.id} className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#1e1e2d]">
          <header className="flex items-center gap-3 border-b border-gray-100 px-5 py-4 dark:border-white/10">
            <span className="grid h-10 w-10 place-items-center rounded-xl text-lg" style={{ backgroundColor: `${group.color}18` }}>{group.emoji}</span>
            <div><h3 className="font-black text-gray-900 dark:text-white">{group.label}</h3><p className="text-xs text-gray-500">{group.tools.length} أدوات</p></div>
          </header>
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {group.tools.map((tool) => {
              const Icon = tool.icon
              const content = <>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: `${tool.color}18`, color: tool.color }}><Icon className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2"><span className="font-bold text-gray-900 dark:text-white">{tool.label}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tool.status === 'api' ? 'bg-emerald-100 text-emerald-800' : tool.status === 'ai' ? 'bg-violet-100 text-violet-800' : tool.status === 'content' || tool.status === 'guide' ? 'bg-sky-100 text-sky-800' : 'bg-amber-100 text-amber-900'}`}>{statusLabel(tool.status)}</span></span>
                  <span className="mt-1 block text-xs leading-5 text-gray-500 dark:text-gray-400">{tool.status === 'ai' ? 'يشغّل المهمة عبر Groq ويتيح حفظ الناتج وطباعته. أدخل بيانات كافية ومجهولة الهوية.' : tool.note}</span>
                </span>
              </>

              if (tool.status === 'guide') return <button key={tool.id} type="button" onClick={() => setGuideOpen(true)} className="flex min-h-28 items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50/60 p-4 text-right transition hover:bg-sky-50 dark:border-sky-900 dark:bg-sky-950/20">{content}</button>
              if (tool.status === 'ai') return <button key={tool.id} type="button" onClick={() => setActiveTool({ id: tool.id, label: tool.label, groupLabel: group.label })} className="flex min-h-28 items-start gap-3 rounded-2xl border border-violet-200 bg-violet-50/40 p-4 text-right transition hover:border-violet-400 hover:bg-violet-50 dark:border-violet-900/50 dark:bg-violet-950/10 dark:hover:bg-violet-950/30">{content}</button>
              if (tool.href) return <Link key={tool.id} href={tool.href as never} className="flex min-h-28 items-start gap-3 rounded-2xl border border-gray-200 p-4 text-right transition hover:border-teal-400 hover:bg-teal-50/40 dark:border-white/10 dark:hover:bg-white/5">{content}</Link>
              return <div key={tool.id} aria-disabled="true" className="flex min-h-28 items-start gap-3 rounded-2xl border border-dashed border-amber-200 bg-amber-50/40 p-4 text-right opacity-80 dark:border-amber-900 dark:bg-amber-950/10">{content}</div>
            })}
          </div>
        </section>
      ))}

      {filteredGroups.length === 0 && <p className="rounded-2xl border border-dashed p-10 text-center text-sm text-gray-500">مفيش أدوات مطابقة للبحث.</p>}

      {guideOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation" onClick={() => setGuideOpen(false)}>
        <section role="dialog" aria-modal="true" aria-labelledby="nexus-tools-guide-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#1e1e2d]" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-start gap-3"><HelpCircle className="mt-1 h-6 w-6 text-sky-700" /><div><h3 id="nexus-tools-guide-title" className="text-lg font-black text-gray-900 dark:text-white">دليل الأدوات</h3><p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">الأدوات الخضراء تقرأ أو تحفظ عبر خدمات المنصة. الأدوات البنفسجية تنفذ المهمة بالذكاء الاصطناعي ثم تتيح حفظ الناتج وطباعته. التحليل الذكي لا يقرأ بيانات المدرسة تلقائيًا؛ ألصق بيانات مجهولة الهوية عند الحاجة.</p></div></div>
          <button type="button" onClick={() => setGuideOpen(false)} className="mt-5 w-full rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white">إغلاق</button>
        </section>
      </div>}
      {activeTool && <NexusAiToolDialog tool={activeTool} onClose={() => setActiveTool(null)} />}
    </div>
  )
}
