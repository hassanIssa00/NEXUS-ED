'use client'
import { motion } from 'framer-motion'

export function ProgressRing({
  pct, color, size = 90, label, value, onDark = true
}: {
  pct: number; color: string; size?: number; label: string; value: string; onDark?: boolean
}) {
  const r = size / 2 - 8; const circ = 2 * Math.PI * r
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={7} />
          <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={7}
            strokeLinecap="round" strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - (pct / 100) * circ }}
            transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-xl font-black text-white drop-shadow-md select-none">{value}</p>
        </div>
      </div>
      <p className="text-xs font-black text-center leading-tight text-white/95 drop-shadow-xs select-none">{label}</p>
    </div>
  )
}

export function AnimatedBar({ pct, color, label, delay = 0 }: { pct: number; color: string; label: string; delay?: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-bold">
        <span className="text-gray-600 dark:text-gray-300">{label}</span>
        <span style={{ color }}>{pct}%</span>
      </div>
      <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <motion.div className="h-full rounded-full relative" style={{ backgroundColor: color }}
          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.2, delay, ease: 'easeOut' }}>
          <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.25)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.25)_50%,rgba(255,255,255,0.25)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] opacity-60 animate-[move_1s_linear_infinite]" />
        </motion.div>
      </div>
    </div>
  )
}
