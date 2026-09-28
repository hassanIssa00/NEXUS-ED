'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Compass, FlaskConical, Calculator, BookOpen, Clock,
  CheckCircle2, Target, Trophy, Flame, Sparkles, TrendingUp,
  Brain, FileText, ArrowUpRight
} from 'lucide-react'

export function MiddleSchoolTrack() {
  const [activeTab, setActiveTab] = useState<'subjects' | 'lab' | 'projects'>('subjects')

  const SUBJECTS = [
    { name: 'الرياضيات (الجبر والهندسة)', score: 94, lessons: 18, color: '#3b82f6' },
    { name: 'العلوم المتكاملة (فيزياء وكيمياء)', score: 91, lessons: 16, color: '#10b981' },
    { name: 'لغتي الخالدة', score: 98, lessons: 20, color: '#8b5cf6' },
    { name: 'الدراسات الاجتماعية والوطنية', score: 95, lessons: 14, color: '#f59e0b' },
    { name: 'المهارات الرقمية والبرمجة', score: 99, lessons: 12, color: '#06b6d4' },
    { name: 'التفكير الناقد والفلسفة', score: 92, lessons: 10, color: '#ec4899' },
  ]

  const EXPERIMENTS = [
    { title: 'محاكاة قانون أوم والدوائر الكهربائية', category: 'فيزياء', icon: '⚡', duration: '15 دقيقة' },
    { title: 'قياس الرقم الهيدروجيني والأحماض (pH)', category: 'كيمياء', icon: '🧪', duration: '20 دقيقة' },
    { title: 'فحص الخلايا النباتية والحيوانية بالمجهر', category: 'أحياء', icon: '🔬', duration: '12 دقيقة' },
  ]

  return (
    <div className="space-y-8" dir="rtl">
      {/* ─── Hero Banner ─── */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2.5rem] p-8 text-white shadow-xl"
        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0284c7 60%, #0d9488 100%)' }}
      >
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-3">
              <Compass className="w-3.5 h-3.5 text-cyan-300" />
              <span className="text-xs font-bold text-cyan-100">مسار المرحلة المتوسطة (الصفوف 7 - 9)</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black mb-2 tracking-tight">
              منصة التحصيل الأكاديمي والمهارات المتطورة 📐
            </h2>
            <p className="text-white/80 text-xs md:text-sm font-medium max-w-xl leading-relaxed">
              تحليل أدائي شامل للمقررات، معامل افتراضية، ومساحة متقدمة للمشاريع والبحوث المنهجية.
            </p>
          </div>

          <div className="flex gap-3">
            <div className="px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center">
              <p className="text-2xl font-black">95.2%</p>
              <p className="text-[10px] text-cyan-100 font-bold">المعدل العام</p>
            </div>
            <div className="px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center">
              <p className="text-2xl font-black">6 / 6</p>
              <p className="text-[10px] text-cyan-100 font-bold">مقررات نشطة</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── Navigation Pills ─── */}
      <div className="flex gap-2">
        {[
          { id: 'subjects', label: '📊 المقررات والتحصيل الأكاديمي' },
          { id: 'lab', label: '🔬 المختبر العلمي الافتراضي' },
          { id: 'projects', label: '📋 المشاريع والبحوث الصفية' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === t.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white dark:bg-[#1e1e2d] text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-white/5'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── Tab Content ─── */}
      {activeTab === 'subjects' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SUBJECTS.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black text-gray-900 dark:text-white truncate">{s.name}</span>
                <span className="text-xs font-black px-2 py-0.5 rounded-lg text-white" style={{ backgroundColor: s.color }}>
                  {s.score}%
                </span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-white/5 h-2.5 rounded-full overflow-hidden mb-3">
                <div className="h-full rounded-full" style={{ width: `${s.score}%`, backgroundColor: s.color }} />
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-400 font-bold">
                <span>{s.lessons} حصة مكتملة</span>
                <button onClick={() => alert(`فتح ملف مقرر ${s.name}`)} className="text-blue-500 hover:underline flex items-center gap-0.5">
                  عرض المنهج <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {activeTab === 'lab' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {EXPERIMENTS.map((exp, i) => (
              <div
                key={i}
                className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-3xl p-6 shadow-sm hover:border-cyan-500/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <span className="text-3xl mb-3 inline-block">{exp.icon}</span>
                  <span className="text-[10px] font-black text-cyan-600 bg-cyan-50 dark:bg-cyan-950/30 px-2 py-0.5 rounded-full mr-2">
                    {exp.category}
                  </span>
                  <h4 className="font-black text-sm text-gray-900 dark:text-white mt-2 mb-1">{exp.title}</h4>
                  <p className="text-xs text-gray-400">مدة التجربة: {exp.duration}</p>
                </div>
                <button
                  onClick={() => alert(`تشغيل المعمل الافتراضي: ${exp.title}`)}
                  className="mt-4 w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm"
                >
                  <FlaskConical className="w-3.5 h-3.5" />
                  بدء التجربة التفاعلية
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'projects' && (
        <div className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-3xl p-6 shadow-sm">
          <h4 className="font-black text-sm text-gray-900 dark:text-white mb-4">المشاريع الفصلية والمهام الجماعية النشطة</h4>
          <div className="space-y-3">
            {[
              { title: 'بحث مصادر الطاقة المتجددة في المملكة 2030', subject: 'العلوم', deadline: 'الأسبوع القادم', status: 'قيد الإنجاز (70%)' },
              { title: 'مشروع برمجة تطبيق آلة حاسبة ذكية بـ Python', subject: 'المهارات الرقمية', deadline: 'بعد أسبوعين', status: 'مكتمل وجاهز للتسليم' },
              { title: 'دراسة ميدانية لمعالم الحضارة في شبه الجزيرة العربية', subject: 'الاجتماعيات', deadline: 'خلال 3 أيام', status: 'بانتظار المراجعة' },
            ].map((p, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{p.title}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{p.subject} • موعد التسليم: {p.deadline}</p>
                </div>
                <span className="text-[10px] font-black px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-600">
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
