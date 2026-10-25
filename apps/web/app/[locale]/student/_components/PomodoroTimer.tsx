'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useLocale } from 'next-intl'
import { Timer, Play, Pause, RotateCcw, Coffee } from 'lucide-react'

export function PomodoroTimer() {
  const isEnglish = useLocale() === 'en'
  const [mode, setMode] = useState<'focus' | 'break'>('focus')
  const [seconds, setSeconds] = useState(25 * 60)
  const [running, setRunning] = useState(false)

  const total = mode === 'focus' ? 25 * 60 : 5 * 60
  const pct = ((total - seconds) / total) * 100

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          setRunning(false)
          setMode(m => m === 'focus' ? 'break' : 'focus')
          return mode === 'focus' ? 5 * 60 : 25 * 60
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [running, mode])

  const reset = () => { setRunning(false); setSeconds(mode === 'focus' ? 25 * 60 : 5 * 60) }
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  const r = 50; const circ = 2 * Math.PI * r

  return (
    <div dir={isEnglish ? 'ltr' : 'rtl'} className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-[2rem] p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
          <Timer className="w-4 h-4 text-rose-500" />
        </div>
        <div>
          <h3 className="font-extrabold text-gray-900 dark:text-white text-sm">{isEnglish ? 'Pomodoro timer' : 'مؤقت بومودورو'}</h3>
          <p className="text-[10px] text-gray-500">{isEnglish ? 'Focus technique' : 'تقنية التركيز الذكي'}</p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="flex gap-2 mb-2">
          {(['focus', 'break'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setRunning(false); setSeconds(m === 'focus' ? 25 * 60 : 5 * 60) }}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${mode === m ? (m === 'focus' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30') : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}>
              {m === 'focus' ? (isEnglish ? '🎯 Focus · 25 min' : '🎯 تركيز 25 دقيقة') : (isEnglish ? '☕ Break · 5 min' : '☕ استراحة 5 دقائق')}
            </button>
          ))}
        </div>

        <div className="relative">
          <svg width={130} height={130} className="-rotate-90">
            <circle cx={65} cy={65} r={r} fill="none" stroke="currentColor" strokeWidth={8} className="text-gray-100 dark:text-gray-800" />
            <motion.circle cx={65} cy={65} r={r} fill="none"
              stroke={mode === 'focus' ? '#ef4444' : '#10b981'}
              strokeWidth={8} strokeLinecap="round" strokeDasharray={circ}
              animate={{ strokeDashoffset: circ - (pct / 100) * circ }}
              transition={{ duration: 0.5 }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{mm}:{ss}</p>
            <p className="text-[10px] text-gray-400 font-bold mt-0.5">{mode === 'focus' ? (isEnglish ? 'Focus' : 'تركيز') : (isEnglish ? 'Break' : 'استراحة')}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setRunning(p => !p)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow-lg transition-all ${mode === 'focus' ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/30' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'}`}>
            {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {running ? (isEnglish ? 'Pause' : 'إيقاف') : (isEnglish ? 'Start' : 'ابدأ')}
          </motion.button>
          <button onClick={reset} className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
