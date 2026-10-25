'use client'
import { motion } from 'framer-motion'
import { Link } from '@/i18n/routing'
import { useLocale } from 'next-intl'
import { BrainCircuit, Award, Calendar, Trophy, BarChart3, BookOpen, Gamepad2, MessageSquare } from 'lucide-react'

export function QuickNavGrid() {
  const isEnglish = useLocale() === 'en'
  const links = [
    { href: '/student/ai-tutor', icon: BrainCircuit, label: isEnglish ? 'AI Tutor' : 'المعلم الذكي', desc: isEnglish ? 'Instant AI learning support' : 'مساعدة فورية بالذكاء الاصطناعي', from: 'from-violet-600', to: 'to-indigo-600', shadow: 'shadow-violet-500/25' },
    { href: '/student/grades', icon: Award, label: isEnglish ? 'Grades' : 'سجل الدرجات', desc: isEnglish ? 'Test and assignment results' : 'نتائج الاختبارات والواجبات', from: 'from-rose-500', to: 'to-pink-600', shadow: 'shadow-rose-500/25' },
    { href: '/student/attendance', icon: Calendar, label: isEnglish ? 'Attendance' : 'الحضور والغياب', desc: isEnglish ? 'Attendance and excuses' : 'نسبة الحضور والمبررات', from: 'from-teal-500', to: 'to-emerald-600', shadow: 'shadow-teal-500/25' },
    { href: '/student/million', icon: Trophy, label: isEnglish ? 'Million Challenge' : 'تحدي المليون', desc: isEnglish ? 'Nexus competitions and badges' : 'مسابقات نكسس والأوسمة', from: 'from-amber-500', to: 'to-orange-500', shadow: 'shadow-amber-500/25' },
    { href: '/student/analytics', icon: BarChart3, label: isEnglish ? 'Analytics' : 'التحليلات', desc: isEnglish ? 'Detailed performance reports' : 'تقارير أدائك التفصيلية', from: 'from-blue-500', to: 'to-cyan-600', shadow: 'shadow-blue-500/25' },
    { href: '/student/subjects', icon: BookOpen, label: isEnglish ? 'My Subjects' : 'موادي', desc: isEnglish ? 'Subjects and learning content' : 'محتوى ومنهج جميع المواد', from: 'from-fuchsia-500', to: 'to-purple-600', shadow: 'shadow-fuchsia-500/25' },
    { href: '/student/games', icon: Gamepad2, label: isEnglish ? 'Learning Games' : 'الألعاب التعليمية', desc: isEnglish ? 'Learn while you play' : 'تعلّم وأنت تلعب', from: 'from-lime-500', to: 'to-green-600', shadow: 'shadow-lime-500/25' },
    { href: '/student/messages', icon: MessageSquare, label: isEnglish ? 'Messages' : 'الرسائل', desc: isEnglish ? 'Contact your teachers' : 'تواصل مع معلميك', from: 'from-sky-500', to: 'to-blue-600', shadow: 'shadow-sky-500/25' },
  ]
  return (
    <div dir={isEnglish ? 'ltr' : 'rtl'}>
      <h3 className="font-extrabold text-gray-900 dark:text-white text-lg mb-4 px-1">🚀 {isEnglish ? 'Quick access' : 'الوصول السريع'}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {links.map((a, i) => (
          <Link key={i} href={a.href}>
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, type: 'spring', stiffness: 200 }}
              whileHover={{ y: -4, scale: 1.02 }}
              className={`flex flex-col items-center gap-3 p-5 rounded-2xl bg-gradient-to-br ${a.from} ${a.to} text-white cursor-pointer shadow-lg ${a.shadow} relative overflow-hidden group`}>
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />
              <div className="w-12 h-12 bg-white/20 rounded-xl border border-white/20 flex items-center justify-center shadow-inner backdrop-blur-sm relative z-10">
                <a.icon className="w-6 h-6" />
              </div>
              <div className="text-center relative z-10">
                <p className="font-bold text-sm leading-tight">{a.label}</p>
                <p className="text-white/70 text-[10px] mt-0.5 font-medium">{a.desc}</p>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  )
}
