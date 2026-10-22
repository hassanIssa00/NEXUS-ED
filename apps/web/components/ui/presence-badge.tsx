'use client'

import { useEffect, useState } from 'react'

type PresenceBadgeProps = {
  lastActiveDate?: string | null
  locale?: string
}

const ONLINE_WINDOW_MS = 2 * 60 * 1000

export function PresenceBadge({ lastActiveDate, locale = 'ar' }: PresenceBadgeProps) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const english = locale === 'en'
  const timestamp = lastActiveDate ? new Date(lastActiveDate).getTime() : Number.NaN
  const age = now - timestamp
  const online = Number.isFinite(timestamp) && age >= -60_000 && age <= ONLINE_WINDOW_MS

  let label = english ? 'No activity recorded' : 'لا يوجد نشاط مسجل'
  if (online) {
    label = english ? 'Active now' : 'نشط الآن'
  } else if (Number.isFinite(timestamp)) {
    const minutes = Math.max(1, Math.floor(age / 60_000))
    if (minutes < 60) {
      label = english ? `Last seen ${minutes}m ago` : `آخر ظهور منذ ${minutes} د`
    } else if (minutes < 24 * 60) {
      const hours = Math.floor(minutes / 60)
      label = english ? `Last seen ${hours}h ago` : `آخر ظهور منذ ${hours} س`
    } else {
      const days = Math.floor(minutes / (24 * 60))
      label = english ? `Last seen ${days}d ago` : `آخر ظهور منذ ${days} يوم`
    }
  }

  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-xs text-muted-foreground" title={lastActiveDate ? new Date(lastActiveDate).toLocaleString(english ? 'en-US' : 'ar-EG') : undefined}>
      <span className={`h-2 w-2 rounded-full ${online ? 'bg-emerald-500' : 'bg-gray-400'}`} aria-hidden="true" />
      <span className={online ? 'font-semibold text-emerald-700 dark:text-emerald-300' : undefined}>{label}</span>
    </span>
  )
}
