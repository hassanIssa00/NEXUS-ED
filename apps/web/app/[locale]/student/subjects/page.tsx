'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, ChevronDown, ChevronUp, FileText, Star,
  Sparkles, CheckCircle2, Download, ExternalLink, Library, GraduationCap, Award
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface SubjectDetail {
  id: string
  name: string
  emoji: string
  teacher: string
  description: string
  totalLessons: number
  color: string
  lightBg: string
  textColor: string
  borderColor: string
  books: { title: string; pages: number; term: string; fileType: string }[]
  units: {
    unitTitle: string
    lessons: { title: string; duration: string; completed: boolean }[]
  }[]
}

const FULL_CURRICULUM: SubjectDetail[] = [
  {
    id: 'arabic',
    name: 'اللغة العربية (لغتي)',
    emoji: '📖',
    teacher: 'د. إسماعيل عيسى',
    description: 'منهج لغتي المتكامل: الحروف الهجائية، القراءة والكتابة، المدود، الإملاء والخط',
    totalLessons: 18,
    color: 'from-blue-500 to-indigo-600',
    lightBg: 'bg-blue-50 dark:bg-blue-500/10',
    textColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-blue-200 dark:border-blue-500/30',
    books: [
      { title: 'كتاب لغتي - كتاب الطالب (الفصل الدراسي الأول)', pages: 142, term: 'الفصل الأول', fileType: 'PDF' },
      { title: 'كتاب النشاط والتمارين اللغوية', pages: 88, term: 'الفصل الأول', fileType: 'PDF' },
      { title: 'دليل الإملاء والخط العربي للمرحلة الابتدائية', pages: 56, term: 'سنوي', fileType: 'PDF' },
    ],
    units: [
      {
        unitTitle: 'الوحدة الأولى: أسرتي وأقاربي',
        lessons: [
          { title: 'مدخل الوحدة والاستماع', duration: '45 دقيقة', completed: true },
          { title: 'حرف الميم (م) — نطقاً ورسماً وحركات', duration: '45 دقيقة', completed: true },
          { title: 'حرف الباء (ب) — أشكال الحرف ومواضعه', duration: '45 دقيقة', completed: true },
          { title: 'حرف الراء (ر) — الحركات القصيرة والطويلة', duration: '45 دقيقة', completed: true },
          { title: 'المد بالألف والواو والياء', duration: '45 دقيقة', completed: true },
        ],
      },
      {
        unitTitle: 'الوحدة الثانية: مدرستي وبيئتي',
        lessons: [
          { title: 'حرف الصاد (ص) وتطبيقاته', duration: '45 دقيقة', completed: true },
          { title: 'حرف الفاء (ف) وقراءة الكلمات البسيطة', duration: '45 دقيقة', completed: false },
          { title: 'حرف السين (س) وكتابة الجمل', duration: '45 دقيقة', completed: false },
          { title: 'التاء المربوطة والمفتوحة والهاء', duration: '45 دقيقة', completed: false },
          { title: 'التنوين (ضم - فتح - كسر)', duration: '45 دقيقة', completed: false },
        ],
      },
      {
        unitTitle: 'الوحدة الثالثة: مدينتي وقريتي',
        lessons: [
          { title: 'اللام الشمسية واللام القمرية', duration: '45 دقيقة', completed: false },
          { title: 'القراءة الجهرية المنغمة للقصص القصيرة', duration: '45 دقيقة', completed: false },
          { title: 'الإملاء المنظور والاختباري', duration: '45 دقيقة', completed: false },
        ],
      },
    ],
  },
  {
    id: 'quran',
    name: 'القرآن الكريم والدراسات الإسلامية',
    emoji: '📿',
    teacher: 'د. إسماعيل عيسى',
    description: 'حفظ وتلاوة وتجويد قصار السور من جزء عم مع فهم معاني الكلمات والآداب القرآنية',
    totalLessons: 16,
    color: 'from-emerald-500 to-green-600',
    lightBg: 'bg-emerald-50 dark:bg-emerald-500/10',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    borderColor: 'border-emerald-200 dark:border-emerald-500/30',
    books: [
      { title: 'المصحف المدرسي الشريف (جزء عم)', pages: 64, term: 'سنوي', fileType: 'PDF' },
      { title: 'كتاب الدراسات الإسلامية - التلاوة والحفظ', pages: 96, term: 'الفصل الأول', fileType: 'PDF' },
      { title: 'مذكرة تدريبات التجويد ومخارج الحروف', pages: 40, term: 'الفصل الأول', fileType: 'PDF' },
    ],
    units: [
      {
        unitTitle: 'الوحدة الأولى: سورة الفاتحة وقصار السور',
        lessons: [
          { title: 'سورة الفاتحة — تلاوة وتدبر وفضلها', duration: '45 دقيقة', completed: true },
          { title: 'سورة الناس — حفظ وتطبيق أحكام الاستعاذة', duration: '45 دقيقة', completed: true },
          { title: 'سورة الفلق — معاني المفردات والحفظ', duration: '45 دقيقة', completed: true },
          { title: 'سورة الإخلاص — فضل التوحيد وأجرها', duration: '45 دقيقة', completed: true },
        ],
      },
      {
        unitTitle: 'الوحدة الثانية: السور المعظمة من جزء عم',
        lessons: [
          { title: 'سورة المسد — قصة الآيات والحفظ', duration: '45 دقيقة', completed: true },
          { title: 'سورة النصر — معاني النصر والاستغفار', duration: '45 دقيقة', completed: false },
          { title: 'سورة الكافرون — براءة التوحيد وتجويدها', duration: '45 دقيقة', completed: false },
          { title: 'سورة الكوثر — نعم الله على نبيه ﷺ', duration: '45 دقيقة', completed: false },
          { title: 'سورة الماعون — إطعام المسكين ومساعدة المحتاج', duration: '45 دقيقة', completed: false },
        ],
      },
    ],
  },
  {
    id: 'math',
    name: 'الرياضيات',
    emoji: '🔢',
    teacher: 'د. إسماعيل عيسى',
    description: 'الأعداد والمقارنة، الجمع والطرح حتى 100، الأشكال الهندسية والقياس وحل المشكلات',
    totalLessons: 20,
    color: 'from-amber-500 to-orange-600',
    lightBg: 'bg-amber-50 dark:bg-amber-500/10',
    textColor: 'text-amber-600 dark:text-amber-400',
    borderColor: 'border-amber-200 dark:border-amber-500/30',
    books: [
      { title: 'كتاب الرياضيات للصف الأول الابتدائي - الطالب', pages: 160, term: 'الفصل الأول', fileType: 'PDF' },
      { title: 'كتاب التمارين والأنشطة الحسابية', pages: 72, term: 'الفصل الأول', fileType: 'PDF' },
      { title: 'دليل الوسائل التعليمية والألعاب الرياضية', pages: 48, term: 'سنوي', fileType: 'PDF' },
    ],
    units: [
      {
        unitTitle: 'الفصل 1: المقارنة والتصنيف',
        lessons: [
          { title: 'التصنيف وفق خاصية واحدة (اللون والشكل)', duration: '45 دقيقة', completed: true },
          { title: 'التصنيف وفق أكثر من خاصية', duration: '45 دقيقة', completed: true },
          { title: 'يساوي، أكثر من، أقل من', duration: '45 دقيقة', completed: true },
        ],
      },
      {
        unitTitle: 'الفصل 2: الأعداد حتى 5 والأعداد حتى 10',
        lessons: [
          { title: 'الأعداد 1، 2، 3 — قراءة وكتابة وتمثيل', duration: '45 دقيقة', completed: true },
          { title: 'العددان 4 و 5 والعدد صفر', duration: '45 دقيقة', completed: true },
          { title: 'الأعداد 6، 7، 8، 9، 10 وتطبيقاتها', duration: '45 دقيقة', completed: true },
          { title: 'مقارنة الأعداد وترتيبها', duration: '45 دقيقة', completed: false },
        ],
      },
      {
        unitTitle: 'الفصل 3: طرائق الجمع ومفاهيم الطرح',
        lessons: [
          { title: 'قصص الجمع وجمل الجمع البسيطة', duration: '45 دقيقة', completed: false },
          { title: 'الجمع بالعد التصاعدي', duration: '45 دقيقة', completed: false },
          { title: 'مفهوم الطرح وجمل الطرح', duration: '45 دقيقة', completed: false },
          { title: 'العلاقة بين الجمع والطرح', duration: '45 دقيقة', completed: false },
        ],
      },
    ],
  },
  {
    id: 'science',
    name: 'العلوم الطبيعية والحياتية',
    emoji: '🔬',
    teacher: 'د. إسماعيل عيسى',
    description: 'استكشاف الكائنات الحية، النباتات والحيوانات، البيئات، الحواس الخمس والطقس والمناخ',
    totalLessons: 14,
    color: 'from-teal-500 to-cyan-600',
    lightBg: 'bg-teal-50 dark:bg-teal-500/10',
    textColor: 'text-teal-600 dark:text-teal-400',
    borderColor: 'border-teal-200 dark:border-teal-500/30',
    books: [
      { title: 'كتاب العلوم للصف الأول الابتدائي - الطالب', pages: 128, term: 'الفصل الأول', fileType: 'PDF' },
      { title: 'كراس النشاط والتجارب العملية', pages: 52, term: 'الفصل الأول', fileType: 'PDF' },
    ],
    units: [
      {
        unitTitle: 'الوحدة 1: النباتات ومخلوقات الله الحية',
        lessons: [
          { title: 'المخلوقات الحية والأشياء غير الحية', duration: '45 دقيقة', completed: true },
          { title: 'أجزاء النبات (الجذور، الساق، الأوراق)', duration: '45 دقيقة', completed: true },
          { title: 'كيف تنمو النباتات وتتغير دورة حياتها؟', duration: '45 دقيقة', completed: true },
        ],
      },
      {
        unitTitle: 'الوحدة 2: الحيوانات ومواطنها',
        lessons: [
          { title: 'أنواع الحيوانات واختلافاتها', duration: '45 دقيقة', completed: false },
          { title: 'أين تعيش الحيوانات؟ (الصحراء والغابة والماء)', duration: '45 دقيقة', completed: false },
          { title: 'الحواس الخمس واستكشاف العالم', duration: '45 دقيقة', completed: false },
        ],
      },
    ],
  },
  {
    id: 'islamic',
    name: 'التربية الإسلامية والفقه والسلوك',
    emoji: '🕌',
    teacher: 'د. إسماعيل عيسى',
    description: 'أركان الإسلام والإيمان، سيرة النبي محمد ﷺ، الوضوء وآداب الطعام والتحية وحسن الخلق',
    totalLessons: 12,
    color: 'from-green-600 to-teal-700',
    lightBg: 'bg-green-50 dark:bg-green-500/10',
    textColor: 'text-green-700 dark:text-green-300',
    borderColor: 'border-green-200 dark:border-green-500/30',
    books: [
      { title: 'كتاب التوحيد والفقه والسلوك للصف الأول', pages: 112, term: 'الفصل الأول', fileType: 'PDF' },
      { title: 'دليل الأذكار والآداب اليومية للناشئة', pages: 36, term: 'سنوي', fileType: 'PDF' },
    ],
    units: [
      {
        unitTitle: 'قسم التوحيد والعقيدة',
        lessons: [
          { title: 'من ربك؟ ربي الله الذي خلقني ورزقني', duration: '45 دقيقة', completed: true },
          { title: 'ما دينك؟ ديني الإسلام', duration: '45 دقيقة', completed: true },
          { title: 'من نبيك؟ نبيي محمد ﷺ', duration: '45 دقيقة', completed: true },
        ],
      },
      {
        unitTitle: 'قسم الفقه والآداب الإسلامية',
        lessons: [
          { title: 'الشهادتان: معناهما وفضلهما', duration: '45 دقيقة', completed: false },
          { title: 'الصلوات الخمس وأوقاتها', duration: '45 دقيقة', completed: false },
          { title: 'آداب قضاء الحاجة والوضوء الصحيح', duration: '45 دقيقة', completed: false },
          { title: 'آداب الطعام والشراب والسلام', duration: '45 دقيقة', completed: false },
        ],
      },
    ],
  },
  {
    id: 'art',
    name: 'الفنون البصرية والتربية التشكيلية',
    emoji: '🎨',
    teacher: 'د. إسماعيل عيسى',
    description: 'تنمية الذوق الجمالي، التعرف على الألوان الأساسية، الرسم الحر والزخرفة البسيطة',
    totalLessons: 8,
    color: 'from-pink-500 to-rose-600',
    lightBg: 'bg-pink-50 dark:bg-pink-500/10',
    textColor: 'text-pink-600 dark:text-pink-400',
    borderColor: 'border-pink-200 dark:border-pink-500/30',
    books: [
      { title: 'كتاب التربية الفنية للصف الأول الابتدائي', pages: 84, term: 'الفصل الأول', fileType: 'PDF' },
      { title: 'كراسة الرسم والتلوين التطبيقي', pages: 48, term: 'الفصل الأول', fileType: 'PDF' },
    ],
    units: [
      {
        unitTitle: 'الوحدة الأولى: عالم الألوان',
        lessons: [
          { title: 'الألوان الأساسية (أحمر - أزرق - أصفر)', duration: '45 دقيقة', completed: true },
          { title: 'دمج الألوان وتكوين ألوان جديدة', duration: '45 دقيقة', completed: true },
          { title: 'التلوين المنتظم داخل الحدود', duration: '45 دقيقة', completed: true },
        ],
      },
      {
        unitTitle: 'الوحدة الثانية: الخطوط والتشكيل',
        lessons: [
          { title: 'الخطوط المنحنية والمستقيمة في الطبيعة', duration: '45 دقيقة', completed: false },
          { title: 'رسم بيتي ومدرستي بالألوان الشمعية', duration: '45 دقيقة', completed: false },
        ],
      },
    ],
  },
]

export default function StudentSubjectsPage() {
  const [expandedId, setExpandedId] = useState<string | null>('arabic')
  const [grades, setGrades] = useState<Record<string, number>>({})
  const [activeTab, setActiveTab] = useState<'all' | 'books' | 'lessons'>('all')

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

        const subs = nexusBridge.getHomeworkSubmissions().filter((s: any) => s.studentId === linkedStudentId)
        const gradeMap: Record<string, number> = {}

        FULL_CURRICULUM.forEach((subj, i) => {
          const matched = subs.filter((s: any) => s.assignmentTitle?.includes(subj.name.split(' ')[0]) || s.subject?.includes(subj.name.split(' ')[0]))
          if (matched.length > 0) {
            gradeMap[subj.id] = Math.round(matched.reduce((acc: number, s: any) => acc + (s.grade || 0), 0) / matched.length)
          } else {
            gradeMap[subj.id] = [94, 98, 92, 88, 95, 96][i] || 90
          }
        })
        setGrades(gradeMap)
      } catch (e) {
        console.error('Subjects page load error:', e)
        setGrades({ arabic: 94, quran: 98, math: 92, science: 88, islamic: 95, art: 96 })
      }
    }
    load()
  }, [])

  const totalBooks = FULL_CURRICULUM.reduce((acc, s) => acc + s.books.length, 0)
  const totalLessonsCount = FULL_CURRICULUM.reduce((acc, s) => acc + s.totalLessons, 0)
  const avgGrade = Math.round(Object.values(grades).reduce((a, b) => a + b, 0) / (Object.values(grades).length || 1))

  return (
    <div className="space-y-8 pb-16" dir="rtl">
      {/* ── HERO BANNER ── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#00605a] via-[#009688] to-[#00D1B2] p-8 md:p-10 text-white shadow-[0_24px_70px_rgba(0,209,178,0.32)]">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
            className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
          <motion.div animate={{ rotate: -360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
            className="absolute -bottom-24 -left-16 w-80 h-80 rounded-full bg-teal-300/20 blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-4 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
            <span className="text-xs font-bold text-teal-100">فصل د. إسماعيل عيسى — الصف الأول الابتدائي</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black mb-3 tracking-tight">المناهج والكتب الدراسية 📚</h1>
          <p className="text-teal-50 text-sm md:text-base max-w-2xl font-medium leading-relaxed">
            جميع المقررات التعليمية المعتمدة مع الكتب المدرسية والدروس التفصيلية وحالة الإنجاز والدرجات.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {[
              { label: 'المواد المقررة', value: `${FULL_CURRICULUM.length} مواد` },
              { label: 'الكتب والكتيبات', value: `${totalBooks} كتب` },
              { label: 'إجمالي الحصص', value: `${totalLessonsCount} حصة` },
              { label: 'معدل الإنجاز العام', value: `${avgGrade}%` },
            ].map((stat, i) => (
              <div key={i} className="bg-white/10 border border-white/15 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-sm">
                <p className="text-[10px] text-teal-200 font-bold uppercase">{stat.label}</p>
                <p className="text-lg font-black">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── FILTER TABS ── */}
      <div className="flex gap-2 bg-gray-100 dark:bg-white/5 p-1.5 rounded-2xl w-fit">
        {[
          { key: 'all', label: 'كافة المواد والكتب', icon: Library },
          { key: 'books', label: 'المكتبة والكتب فقط', icon: BookOpen },
          { key: 'lessons', label: 'خطة الدروس فقط', icon: GraduationCap },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ${
              activeTab === t.key
                ? 'bg-white dark:bg-[#1e1e2d] text-teal-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── CURRICULUM ACCORDION ── */}
      <div className="space-y-5">
        {FULL_CURRICULUM.map((subj, i) => {
          const isExpanded = expandedId === subj.id
          const grade = grades[subj.id] || 90
          const allLessons = subj.units.flatMap(u => u.lessons)
          const completedCount = allLessons.filter(l => l.completed).length

          return (
            <motion.div
              key={subj.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-[2rem] shadow-sm overflow-hidden"
            >
              {/* Header Card */}
              <div className="p-6 md:p-7">
                <div className="flex flex-col md:flex-row md:items-center gap-5 justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${subj.color} flex items-center justify-center text-3xl flex-shrink-0 shadow-md text-white`}>
                      {subj.emoji}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h2 className="text-xl font-black text-gray-900 dark:text-white">{subj.name}</h2>
                        <Badge className={`rounded-xl border-0 font-bold text-xs ${subj.lightBg} ${subj.textColor}`}>
                          {subj.totalLessons} حصة
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-medium leading-relaxed">{subj.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1 font-bold">
                          <Star className="w-3.5 h-3.5 text-amber-500" />
                          المعلم المشرف: {subj.teacher}
                        </span>
                        <span>•</span>
                        <span>{subj.books.length} كتب ومقررات</span>
                        <span>•</span>
                        <span>{completedCount} من {allLessons.length} دروس منجزة</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress & Actions */}
                  <div className="flex items-center gap-4 border-t md:border-t-0 pt-4 md:pt-0 border-gray-100 dark:border-white/5">
                    <div className="text-left flex-shrink-0 min-w-[90px]">
                      <div className={`text-2xl font-black ${subj.textColor}`}>{grade}%</div>
                      <p className="text-[10px] text-gray-400 font-bold">مستوى التحصيل</p>
                      <div className="w-24 h-1.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden mt-1.5">
                        <div className={`h-full bg-gradient-to-r ${subj.color} rounded-full`} style={{ width: `${grade}%` }} />
                      </div>
                    </div>

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : subj.id)}
                      className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-1.5 transition-all ${subj.lightBg} ${subj.textColor} border ${subj.borderColor} hover:scale-105 active:scale-95`}
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          إغلاق
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          عرض الكتب والدروس
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Expandable Section */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]"
                  >
                    <div className="p-6 md:p-8 space-y-6">
                      {/* Section: Books */}
                      {(activeTab === 'all' || activeTab === 'books') && (
                        <div>
                          <h3 className="font-black text-gray-900 dark:text-white text-base mb-3 flex items-center gap-2">
                            <BookOpen className={`w-4 h-4 ${subj.textColor}`} />
                            الكتب والمقررات الدراسية المعتمدة
                          </h3>
                          <div className="grid md:grid-cols-3 gap-3">
                            {subj.books.map((book, bi) => (
                              <div
                                key={bi}
                                className="bg-white dark:bg-[#1e1e2d] border border-gray-200/80 dark:border-white/10 rounded-2xl p-4 shadow-sm flex flex-col justify-between"
                              >
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <Badge className="bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border-0 text-[10px] font-bold">
                                      {book.term}
                                    </Badge>
                                    <span className="text-[10px] font-mono font-bold text-gray-400">{book.fileType}</span>
                                  </div>
                                  <h4 className="font-black text-xs text-gray-900 dark:text-white leading-snug mb-1">
                                    {book.title}
                                  </h4>
                                  <p className="text-[11px] text-gray-500 font-medium">{book.pages} صفحة ملونة</p>
                                </div>
                                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                                  <button
                                    onClick={() => alert(`جاري فتح وتصفح ${book.title} بصيغة تفاعلية...`)}
                                    className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    تصفح الكتاب
                                  </button>
                                  <button
                                    onClick={() => alert(`جاري تنزيل نسخة رقمية من ${book.title}...`)}
                                    className="p-1.5 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-teal-50 text-gray-600 dark:text-gray-300 hover:text-teal-600 transition-colors"
                                    title="تحميل PDF"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Section: Units & Lessons */}
                      {(activeTab === 'all' || activeTab === 'lessons') && (
                        <div>
                          <h3 className="font-black text-gray-900 dark:text-white text-base mb-3 flex items-center gap-2">
                            <GraduationCap className={`w-4 h-4 ${subj.textColor}`} />
                            خطة الدروس والوحدات التعليمية
                          </h3>
                          <div className="space-y-4">
                            {subj.units.map((unit, ui) => (
                              <div key={ui} className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-2xl p-4 shadow-sm">
                                <h4 className="font-black text-sm text-gray-900 dark:text-white mb-3 text-teal-700 dark:text-teal-300">
                                  {unit.unitTitle}
                                </h4>
                                <div className="divide-y divide-gray-100 dark:divide-white/5">
                                  {unit.lessons.map((lesson, li) => (
                                    <div key={li} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                                      <div className="flex items-center gap-2.5">
                                        {lesson.completed ? (
                                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                        ) : (
                                          <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-white/20 flex-shrink-0" />
                                        )}
                                        <span className={`font-bold ${lesson.completed ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>
                                          {lesson.title}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[11px] text-gray-400 font-mono">{lesson.duration}</span>
                                        {lesson.completed ? (
                                          <Badge className="bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-0 text-[10px]">
                                            تم الإنجاز ✓
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline" className="text-[10px] text-gray-400 border-gray-200 dark:border-white/10">
                                            قادم
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
