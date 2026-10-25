'use client'

import { useMemo, useState } from 'react'
import { useLocale } from 'next-intl'
import { Link } from '@/i18n/routing'
import NexusAiToolDialog from './NexusAiToolDialog'
import {
  Activity, AlertTriangle, Award, BarChart3, BookMarked, BookOpen, Brain,
  Briefcase, Calendar, CalendarDays, Check, CheckSquare, Clipboard, FileEdit,
  FileOutput, FileSpreadsheet, FlaskConical, Flower2, Gamepad2, HeartHandshake,
  HelpCircle, Lightbulb, Map, MessageCircle, PenLine, Printer, Search, ShieldCheck,
  Star, Target, TestTube2, Trophy, TrendingUp, Users, Zap, type LucideIcon,
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
      { id: 'worksheets', label: 'الواجبات والاختبارات', icon: FileEdit, color: '#234A65', status: 'api', href: '/teacher/assignments', note: 'إنشاء الواجبات والاختبارات وإسنادها ومراجعة التسليمات من صفحة الواجبات.' },
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
    id: 'automation', label: 'الأتمتة الذكية', emoji: '⚙️', color: '#4A687C', tools: [
      { id: 'automation-hub', label: 'أدوات الأتمتة الذكية', icon: Zap, color: '#4A687C', status: 'api', href: '/teacher/automation', note: 'إدارة قواعد الأتمتة والتصحيح ورصد الحضور والتحضير من مركز واحد.' },
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
      { id: 'forms', label: 'نماذج الواجبات', icon: FileSpreadsheet, color: '#059669', status: 'api', href: '/teacher/assignments', note: 'إنشاء واجبات بأسئلة متنوعة ومراجعة الإجابات من صفحة الواجبات.' },
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

const ENGLISH_GROUPS: Record<string, string> = {
  grading: 'Assessment and grading', reports: 'Reports and certificates', automation: 'Smart automation',
  attendance: 'Attendance and classroom management', curriculum: 'Curriculum and lesson planning',
  communication: 'Communication and announcements', analytics: 'Analytics and AI', content: 'Interactive content',
}
const ENGLISH_TOOLS: Record<string, { label: string; note: string }> = {
  autograde: { label: 'Automatic grading', note: 'Review grades and submissions recorded in the system.' },
  hwgrade: { label: 'Grade assignments', note: 'Review submissions and save grades through the assignments API.' },
  worksheets: { label: 'Assignments and tests', note: 'Create and assign work, then review submissions from the assignments page.' },
  diagnosis: { label: 'Diagnostic assessment', note: 'View saved diagnostic assessment attempts.' },
  remedial: { label: 'Remedial plan', note: 'No API currently creates and saves remedial plans. Recorded student risk indicators are available in student monitoring.' },
  hwreports: { label: 'Assignment and test reports', note: 'Analyze saved assignment grades and submissions.' },
  perf: { label: 'Professional performance', note: 'No service or API permission is available for teacher performance reports.' },
  certs: { label: 'Records, certificates, and portfolios', note: 'Issue certificates and save them to the student file through the platform API.' },
  thanks: { label: 'Appreciation certificates', note: 'Issue an appreciation certificate, save it, and download its PDF.' },
  report: { label: 'My report', note: 'Reports based on recorded grades, attendance, and assignments.' },
  autoreport: { label: 'Automated reports and evidence', note: 'No API currently gathers evidence and creates an automated report.' },
  achievement: { label: 'Evidence-based achievement portfolio', note: 'No service currently saves evidence and builds an achievement portfolio automatically.' },
  jobportfolio: { label: 'Professional portfolio and evidence', note: 'No service or API is currently available for a professional portfolio.' },
  'automation-hub': { label: 'Smart automation tools', note: 'Manage automation rules, grading, attendance, and lesson preparation in one place.' },
  att: { label: 'Classroom management', note: 'Class rosters and attendance are saved through the platform API.' },
  absent: { label: 'Record absences', note: 'Read and save attendance records by class and date.' },
  daily: { label: 'Daily and weekly progress', note: 'No daily or weekly progress record with this name exists in the current API.' },
  activity: { label: 'Student activities', note: 'Manage school events and save them through the events API.' },
  actleader: { label: 'Activities coordinator', note: 'Manage school events and activities recorded through the events API.' },
  currdist: { label: 'Curriculum distribution', note: 'No service currently saves curriculum distribution by class.' },
  curr1448: { label: 'Curriculum distribution 1448 AH', note: 'No distribution or planning service is currently available for academic year 1448 AH.' },
  prep: { label: 'Lesson planning', note: 'Create, edit, and save lessons through the lessons API.' },
  print: { label: 'Copy and print lesson plans', note: 'No route currently retrieves saved lesson plans for printing.' },
  books: { label: 'Textbooks', note: 'Open the books and curriculum catalog available on the platform.' },
  solutions: { label: 'Textbook solutions 1448 AH', note: 'No solutions library or documented API is available.' },
  strategies: { label: 'Document learning strategies', note: 'No API currently saves learning strategies and links them to lessons.' },
  cmap: { label: 'Concept maps', note: 'The content generator can extract concepts from text, but cannot create and save a map.' },
  weekplan: { label: 'Term plan', note: 'No service is currently available for saving or distributing term plans.' },
  parentmsg: { label: 'Contact parents', note: 'Conversations and messages are read and sent through the messaging API.' },
  alert: { label: 'Announcement', note: 'Send notifications to students and parents.' },
  forms: { label: 'Assignment templates', note: 'Create assignments with varied questions and review responses from the assignments page.' },
  submanage: { label: 'Request subscription activation', note: 'Open platform conversations to send an activation request to the administration and follow up.' },
  counselor: { label: 'Student guidance', note: 'View alerts based on recorded grades and attendance.' },
  search: { label: 'Quick search', note: 'Search student rosters loaded from the system for your classes.' },
  patterns: { label: 'Learning patterns', note: 'No API currently analyzes or records learning patterns.' },
  noor: { label: 'Noor monitoring and analysis', note: 'There is no Noor system integration or API credential configured.' },
  noorext: { label: 'Analyze external results', note: 'There is no service for importing and analyzing external result files.' },
  nafes: { label: 'NAFS national assessments', note: 'No official NAFS question data or API is connected to the system.' },
  outcomes: { label: 'Learning outcomes map', note: 'There is no learning outcomes database or API linked to student results.' },
  games: { label: 'Educational games', note: 'View school games and saved rankings, restricted to the account school.' },
  vlab: { label: 'Virtual experiments', note: 'No virtual experiment library or dedicated API is available.' },
  kg: { label: 'Kindergarten platform', note: 'No kindergarten service or data is available in the current API.' },
  ppt: { label: 'PowerPoint presentations', note: 'The content generator does not export PowerPoint files.' },
  quran: { label: 'Quran comprehension', note: 'Open the Quran content available in the curriculum catalog.' },
  guide: { label: 'User guide', note: 'View information about tool sources and availability.' },
}

function statusLabel(status: ToolStatus, isEnglish: boolean) {
  if (status === 'api') return isEnglish ? 'Connected' : 'متصل بالنظام'
  if (status === 'content') return isEnglish ? 'Platform content' : 'محتوى المنصة'
  if (status === 'ai') return isEnglish ? 'AI assisted' : 'جاهز بالذكاء الاصطناعي'
  if (status === 'guide') return isEnglish ? 'Guide' : 'دليل'
  return isEnglish ? 'Currently unavailable' : 'غير متاح حاليًا'
}

export default function NexusToolsTab() {
  const isEnglish = useLocale() === 'en'
  const t = (ar: string, en: string) => isEnglish ? en : ar
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [guideOpen, setGuideOpen] = useState(false)
  const [activeTool, setActiveTool] = useState<{ id: string; label: string; groupLabel: string } | null>(null)
  const totalTools = GROUPS.reduce((sum, group) => sum + group.tools.length, 0)
  const apiTools = GROUPS.reduce((sum, group) => sum + group.tools.filter((tool) => tool.status === 'api').length, 0)
  const aiTools = GROUPS.reduce((sum, group) => sum + group.tools.filter((tool) => tool.status === 'ai').length, 0)

  const filteredGroups = useMemo(() => GROUPS.map((sourceGroup) => {
    const group = isEnglish ? {
      ...sourceGroup,
      label: ENGLISH_GROUPS[sourceGroup.id] || sourceGroup.label,
      tools: sourceGroup.tools.map((tool) => ({ ...tool, label: ENGLISH_TOOLS[tool.id]?.label || tool.label, note: ENGLISH_TOOLS[tool.id]?.note || tool.note })),
    } : sourceGroup
    if (activeCategory !== 'all' && group.id !== activeCategory) return null
    const tools = group.tools.filter((tool) => !searchQuery.trim() || tool.label.toLocaleLowerCase(isEnglish ? 'en' : 'ar').includes(searchQuery.trim().toLocaleLowerCase(isEnglish ? 'en' : 'ar')))
    return tools.length ? { ...group, tools } : null
  }).filter((group): group is ToolGroup => Boolean(group)), [activeCategory, searchQuery, isEnglish])

  return (
    <div className="space-y-6 pb-12" dir={isEnglish ? 'ltr' : 'rtl'}>
      <section className="rounded-3xl bg-gradient-to-l from-teal-800 via-sky-800 to-indigo-900 p-6 text-white shadow-lg md:p-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <p className="mb-2 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold">{t('صندوق أدوات المعلم', 'Teacher toolbox')}</p>
            <h2 className="text-2xl font-black md:text-3xl">{t('أدوات نكسس', 'Nexus tools')}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">{t('افتح أدوات النظام المرتبطة ببيانات المنصة، أو شغّل الأداة الذكية عبر Groq واحفظ نتيجتها في قوالبك. أدوات التحليل الذكي تعتمد على البيانات التي تدخلها ولا تدّعي قراءة سجل لم يتم تحميله.', 'Open tools connected to platform data, or run an AI tool with Groq and save its result to your templates. AI analysis uses only the data you provide and does not claim to read records that were not loaded.')}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-3"><p className="text-2xl font-black">{totalTools}</p><p className="text-[11px] text-white/75">{t('أداة', 'Tools')}</p></div>
            <div className="rounded-2xl border border-emerald-200/30 bg-emerald-400/15 px-3 py-3"><p className="text-2xl font-black">{apiTools}</p><p className="text-[11px] text-white/75">{t('مرتبطة بـAPI', 'API connected')}</p></div>
            <div className="rounded-2xl border border-violet-200/30 bg-violet-400/15 px-3 py-3"><p className="text-2xl font-black">{aiTools}</p><p className="text-[11px] text-white/75">{t('مدعومة بالذكاء', 'AI assisted')}</p></div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#1e1e2d] md:flex-row md:items-center md:justify-between">
        <label className="relative block flex-1">
          <Search className={`absolute ${isEnglish ? 'left-3.5' : 'right-3.5'} top-3 h-4 w-4 text-gray-400`} />
          <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={t('ابحث عن أداة...', 'Search tools...')} className={`w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 ${isEnglish ? 'pl-10 pr-3' : 'pl-3 pr-10'} text-sm outline-none focus:border-teal-600 dark:border-white/10 dark:bg-white/5 dark:text-white`} />
        </label>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setActiveCategory('all')} className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold ${activeCategory === 'all' ? 'bg-teal-700 text-white' : 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300'}`}>{t('الكل', 'All')} ({totalTools})</button>
          {GROUPS.map((group) => <button key={group.id} onClick={() => setActiveCategory(group.id)} className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold ${activeCategory === group.id ? 'bg-teal-700 text-white' : 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300'}`}>{isEnglish ? ENGLISH_GROUPS[group.id] : group.label} ({group.tools.length})</button>)}
        </div>
      </section>

      {filteredGroups.map((group) => (
        <section key={group.id} className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#1e1e2d]">
          <header className="flex items-center gap-3 border-b border-gray-100 px-5 py-4 dark:border-white/10">
            <span className="grid h-10 w-10 place-items-center rounded-xl text-lg" style={{ backgroundColor: `${group.color}18` }}>{group.emoji}</span>
            <div><h3 className="font-black text-gray-900 dark:text-white">{group.label}</h3><p className="text-xs text-gray-500">{group.tools.length} {t('أدوات', 'tools')}</p></div>
          </header>
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {group.tools.map((tool) => {
              const Icon = tool.icon
              const content = <>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: `${tool.color}18`, color: tool.color }}><Icon className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2"><span className="font-bold text-gray-900 dark:text-white">{tool.label}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tool.status === 'api' ? 'bg-emerald-100 text-emerald-800' : tool.status === 'ai' ? 'bg-violet-100 text-violet-800' : tool.status === 'content' || tool.status === 'guide' ? 'bg-sky-100 text-sky-800' : 'bg-amber-100 text-amber-900'}`}>{statusLabel(tool.status, isEnglish)}</span></span>
                  <span className="mt-1 block text-xs leading-5 text-gray-500 dark:text-gray-400">{tool.status === 'ai' ? t('يشغّل المهمة عبر Groq ويتيح حفظ الناتج وطباعته. أدخل بيانات كافية ومجهولة الهوية.', 'Runs the task with Groq and lets you save or print the result. Provide sufficient anonymized data.') : tool.note}</span>
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

      {filteredGroups.length === 0 && <p className="rounded-2xl border border-dashed p-10 text-center text-sm text-gray-500">{t('لا توجد أدوات مطابقة للبحث.', 'No tools match your search.')}</p>}

      {guideOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation" onClick={() => setGuideOpen(false)}>
        <section role="dialog" aria-modal="true" aria-labelledby="nexus-tools-guide-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#1e1e2d]" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-start gap-3"><HelpCircle className="mt-1 h-6 w-6 text-sky-700" /><div><h3 id="nexus-tools-guide-title" className="text-lg font-black text-gray-900 dark:text-white">{t('دليل الأدوات', 'Tools guide')}</h3><p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">{t('الأدوات الخضراء تقرأ أو تحفظ عبر خدمات المنصة. الأدوات البنفسجية تنفذ المهمة بالذكاء الاصطناعي ثم تتيح حفظ الناتج وطباعته. التحليل الذكي لا يقرأ بيانات المدرسة تلقائيًا؛ ألصق بيانات مجهولة الهوية عند الحاجة.', 'Green tools read or save data through platform services. Purple tools use AI and let you save or print the result. AI analysis does not read school data automatically; paste anonymized data when needed.')}</p></div></div>
          <button type="button" onClick={() => setGuideOpen(false)} className="mt-5 w-full rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white">{t('إغلاق', 'Close')}</button>
        </section>
      </div>}
      {activeTool && <NexusAiToolDialog tool={activeTool} onClose={() => setActiveTool(null)} />}
    </div>
  )
}
