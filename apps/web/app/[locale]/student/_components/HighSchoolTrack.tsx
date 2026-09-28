'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  GraduationCap, Target, Award, Brain, Calculator, FileCheck,
  CheckCircle, Clock, Sparkles, TrendingUp, Building, ArrowUpRight
} from 'lucide-react'

export function HighSchoolTrack() {
  const [selectedTrack, setSelectedTrack] = useState('cs')
  const [gpa, setGpa] = useState(98.5)
  const [qudurat, setQudurat] = useState(88)
  const [tahsili, setTahsili] = useState(85)
  const [activeTest, setActiveTest] = useState(false)
  const [testScore, setTestScore] = useState<number | null>(null)

  // Weighted Percentage calculation (الموزونة)
  const weighted = Math.round((gpa * 0.3) + (qudurat * 0.3) + (tahsili * 0.4) * 10) / 10

  const TRACKS = [
    { id: 'general', name: 'المسار العام', icon: '🌐', desc: 'مسار تأسيسي متوازن بين العلوم الإنسانية والتطبيقية' },
    { id: 'cs', name: 'مسار علوم الحاسب والهندسة', icon: '💻', desc: 'الذكاء الاصطناعي، الأمن السيبراني، وهندسة البرمجيات' },
    { id: 'health', name: 'مسار الصحة والحياة', icon: '🩺', desc: 'الطب، العلوم الحيوية، الصيدلة، والتكنولوجيا الطبية' },
    { id: 'business', name: 'مسار إدارة الأعمال', icon: '📊', desc: 'ريادة الأعمال، الاقتصاد، الإدارة المالية والمحاسبة' },
    { id: 'sharia', name: 'المسار الشرعي', icon: '⚖️', desc: 'الدراسات القضائية، الشريعة الإسلامية، والأنظمة القانونية' },
  ]

  const runPracticeQudurat = () => {
    setActiveTest(true)
    setTimeout(() => {
      setActiveTest(false)
      setTestScore(Math.floor(85 + Math.random() * 14))
    }, 1500)
  }

  return (
    <div className="space-y-8" dir="rtl">
      {/* ─── Hero Banner ─── */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2.5rem] p-8 md:p-10 text-white shadow-xl"
        style={{ background: 'linear-gradient(135deg, #312e81 0%, #1e1b4b 50%, #4338ca 100%)' }}
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-3">
              <GraduationCap className="w-4 h-4 text-amber-300" />
              <span className="text-xs font-bold text-indigo-100">المرحلة الثانوية ونظام المسارات الوزاري</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black mb-2 tracking-tight">
              بوابة التميز الجامعي والمسارات التخصصية 🎓
            </h2>
            <p className="text-white/80 text-xs md:text-sm font-medium max-w-xl leading-relaxed">
              تتبع المعدل التراكمي (GPA)، ساعات العمل التطوعي (40 ساعة)، ومحاكي تدريب مقاييس القدرات والتحصيلي الوطنية.
            </p>
          </div>

          <div className="flex gap-3">
            <div className="px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center">
              <p className="text-2xl font-black text-amber-300">{gpa}%</p>
              <p className="text-[10px] text-indigo-100 font-bold">المعدل التراكمي (GPA)</p>
            </div>
            <div className="px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center">
              <p className="text-2xl font-black text-emerald-300">32 / 40</p>
              <p className="text-[10px] text-indigo-100 font-bold">ساعات التطوع المعتمدة</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── Tracks Selector ─── */}
      <div className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-3xl p-6 shadow-sm">
        <h3 className="text-base font-black text-gray-900 dark:text-white mb-1">المسار التخصصي للطالب</h3>
        <p className="text-xs text-gray-400 mb-4">اختر أو راجع خطة المسار الأكاديمي المعتمدة لك:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {TRACKS.map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedTrack(t.id)}
              className={`p-4 rounded-2xl border text-right transition-all cursor-pointer ${
                selectedTrack === t.id
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-md'
                  : 'border-gray-100 dark:border-white/5 hover:border-indigo-300'
              }`}
            >
              <span className="text-2xl mb-1 block">{t.icon}</span>
              <p className="text-xs font-black text-gray-900 dark:text-white">{t.name}</p>
              <p className="text-[10px] text-gray-400 mt-1 line-clamp-2">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Qudurat & Tahsili Simulation ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* القدرات */}
        <div className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-gray-900 dark:text-white">محاكي اختبار القدرات العامة (GAT)</h4>
              <p className="text-[11px] text-gray-400">تدريب مكثف على القسم الكمي واللفظي وفق معايير مركز قياس</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 mb-4">
            <div className="flex justify-between items-center text-xs font-bold text-indigo-900 dark:text-indigo-200 mb-2">
              <span>آخر درجة اختبار قياس:</span>
              <span className="text-lg font-black text-indigo-600">{testScore ? `${testScore}%` : '88%'}</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              نموذج تدريبي مكون من 20 سؤال (10 كمي + 10 لفظي) مع شرح تفصيلي لطرق الحل الذهني السريع.
            </p>
          </div>

          <button
            onClick={runPracticeQudurat}
            disabled={activeTest}
            className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
          >
            {activeTest ? <><Sparkles className="w-4 h-4 animate-spin" />جاري تصحيح الاختبار التجريبي...</> : <><Target className="w-4 h-4" />بدء اختبار تجريبي فوري (20 دقيقة)</>}
          </button>
        </div>

        {/* حاسبة النسبة الموزونة والقبول الجامعي */}
        <div className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-gray-900 dark:text-white">حاسبة النسبة الموزونة والقبول الجامعي</h4>
              <p className="text-[11px] text-gray-400">معيار القبول التنافسي (30% ثانوية + 30% قدرات + 40% تحصيلي)</p>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            <div>
              <div className="flex justify-between text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                <span>المعدل الثانوي: {gpa}%</span>
                <span>(30%)</span>
              </div>
              <input type="range" min="60" max="100" value={gpa} onChange={e => setGpa(Number(e.target.value))} className="w-full accent-indigo-600" />
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                <span>درجة القدرات: {qudurat}</span>
                <span>(30%)</span>
              </div>
              <input type="range" min="60" max="100" value={qudurat} onChange={e => setQudurat(Number(e.target.value))} className="w-full accent-indigo-600" />
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                <span>درجة التحصيلي: {tahsili}</span>
                <span>(40%)</span>
              </div>
              <input type="range" min="60" max="100" value={tahsili} onChange={e => setTahsili(Number(e.target.value))} className="w-full accent-indigo-600" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-500">نسبتك الموزونة التقريبية:</p>
              <p className="text-3xl font-black text-emerald-600">{weighted}%</p>
            </div>
            <div className="text-left text-[11px] font-bold text-gray-600 dark:text-gray-300">
              <p className="text-emerald-700 dark:text-emerald-300">تؤهلك لكليات:</p>
              <p>الهندسة والحاسب والعلوم الصحية ✅</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
