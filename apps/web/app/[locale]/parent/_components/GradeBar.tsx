'use client'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, BookOpen } from 'lucide-react'
import { useLocale } from 'next-intl'

export function MiniGradeBar({ label, value, max = 100, color }: { label: string; value: number; max?: number; color: string }) {
  const isEnglish = useLocale() === 'en'
  const pct = Math.min(Math.round((value / max) * 100), 100)
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-bold">
        <span className="text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
          <BookOpen className="w-3 h-3" style={{ color }} /> {label}
        </span>
        <span style={{ color }}>{value}/{max}</span>
      </div>
      <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <motion.div className="h-full rounded-full relative" style={{ backgroundColor: color }}
          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: 'easeOut' }}>
          <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.25)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.25)_50%,rgba(255,255,255,0.25)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] opacity-60" />
        </motion.div>
      </div>
      <p className="text-[10px] text-gray-400 font-medium text-left">{pct}% {isEnglish ? 'of total' : 'من المجموع'}</p>
    </div>
  )
}

export function ChildStatCard({ label, value, color, icon: Icon }: { label: string; value: string | number; color: string; icon: any }) {
  return (
    <div className="rounded-2xl p-4 text-center relative overflow-hidden" style={{ backgroundColor: `${color}10`, border: `1px solid ${color}20` }}>
      <div className="absolute top-1 right-1 w-2 h-2 rounded-bl-md" style={{ backgroundColor: color }} />
      <p className="text-3xl font-black mb-1 leading-none" style={{ color }}>{value}</p>
      <p className="text-[11px] font-bold text-gray-500 flex items-center justify-center gap-1">
        <Icon className="w-3 h-3" style={{ color }} />{label}
      </p>
    </div>
  )
}
