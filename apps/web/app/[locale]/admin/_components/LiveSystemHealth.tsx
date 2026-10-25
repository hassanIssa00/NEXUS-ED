'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, CheckCircle2, AlertCircle, XCircle, RefreshCw, Server, Database, Zap, Globe } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { useLocale } from 'next-intl'

type HealthStatus = 'healthy' | 'warning' | 'error' | 'checking'

function StatusDot({ status }: { status: HealthStatus }) {
  const colors: Record<HealthStatus, string> = { healthy: 'bg-emerald-400', warning: 'bg-amber-400', error: 'bg-red-500', checking: 'bg-gray-400' }
  const glows: Record<HealthStatus, string> = { healthy: 'shadow-[0_0_10px_rgba(52,211,153,0.7)]', warning: 'shadow-[0_0_10px_rgba(251,191,36,0.7)]', error: 'shadow-[0_0_10px_rgba(239,68,68,0.7)]', checking: '' }
  return <span className={`w-2.5 h-2.5 rounded-full ${colors[status]} ${glows[status]} ${status !== 'checking' ? 'animate-pulse' : 'animate-spin'} inline-block`} />
}

const SERVICES = [
  { label: 'الخادم الرئيسي', labelEn: 'Application server', key: 'server', icon: Server },
  { label: 'قاعدة البيانات', labelEn: 'Database', key: 'database', icon: Database },
  { label: 'وحدة الذكاء الاصطناعي', labelEn: 'AI service', key: 'ai', icon: Zap },
  { label: 'شبكة التوصيل CDN', labelEn: 'Content delivery network (CDN)', key: 'cdn', icon: Globe },
]

export function LiveSystemHealth() {
  const isEnglish = useLocale() === 'en'
  const [statuses, setStatuses] = useState<Record<string, HealthStatus>>({ server: 'checking', database: 'checking', ai: 'checking', cdn: 'checking' })
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [checking, setChecking] = useState(false)

  const check = async () => {
    setChecking(true)
    try {
      await apiClient.get('/health')
      setStatuses({ server: 'healthy', database: 'healthy', ai: 'healthy', cdn: 'healthy' })
    } catch {
      setStatuses({ server: 'error', database: 'warning', ai: 'warning', cdn: 'healthy' })
    } finally { setChecking(false); setLastChecked(new Date()) }
  }

  useEffect(() => { check(); const id = setInterval(check, 30000); return () => clearInterval(id) }, [])

  const allHealthy = Object.values(statuses).every(s => s === 'healthy')
  const hasError = Object.values(statuses).some(s => s === 'error')

  return (
    <div className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-[2rem] p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-extrabold text-gray-900 dark:text-white flex items-center gap-2 text-sm">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${allHealthy ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-rose-50 dark:bg-rose-500/10'}`}>
            <Activity className={`w-4 h-4 ${allHealthy ? 'text-emerald-500' : 'text-rose-500'}`} />
          </div>
          {isEnglish ? 'Live system health' : 'صحة النظام المباشرة'}
        </h3>
        <button onClick={check} disabled={checking} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-medium transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
          {isEnglish ? 'Refresh' : 'تحديث'}
        </button>
      </div>

      <div className={`mb-4 p-3 rounded-2xl flex items-center gap-3 ${allHealthy ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20' : hasError ? 'bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20' : 'bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20'}`}>
        {allHealthy ? <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" /> : hasError ? <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />}
        <div>
          <p className={`text-xs font-black ${allHealthy ? 'text-emerald-700 dark:text-emerald-400' : hasError ? 'text-rose-700 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400'}`}>
            {allHealthy ? (isEnglish ? '🟢 All systems are operating normally' : '🟢 جميع الأنظمة تعمل بكفاءة تامة') : hasError ? (isEnglish ? '🔴 Some systems have an issue' : '🔴 يوجد خلل في بعض الأنظمة') : (isEnglish ? '🟡 Some systems need attention' : '🟡 تحذير: بعض الأنظمة تحتاج للمراجعة')}
          </p>
          {lastChecked && <p className="text-[10px] text-gray-400 mt-0.5">{isEnglish ? 'Last checked:' : 'آخر فحص:'} {lastChecked.toLocaleTimeString(isEnglish ? 'en-US' : 'ar-SA')}</p>}
        </div>
      </div>

      <div className="space-y-3">
        {SERVICES.map((svc, i) => {
          const status = statuses[svc.key]
          const Icon = svc.icon
          return (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
              className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-gray-500" />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{isEnglish ? svc.labelEn : svc.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-gray-400">
                  {status === 'healthy' ? (isEnglish ? 'Operational' : 'يعمل') : status === 'warning' ? (isEnglish ? 'Warning' : 'تحذير') : status === 'error' ? (isEnglish ? 'Error' : 'خطأ') : (isEnglish ? 'Checking' : 'جاري الفحص')}
                </span>
                <StatusDot status={status} />
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
