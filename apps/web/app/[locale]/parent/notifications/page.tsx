'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bell, BookOpen, CalendarCheck, CheckCheck, RefreshCw, Trophy } from 'lucide-react'
import { apiClient } from '@/lib/api/client'

interface SchoolNotification {
  id: string
  title: string
  body: string
  type: string
  isRead: boolean
  createdAt: string
}

const iconFor = (type: string) => {
  if (type === 'WARNING') return CalendarCheck
  if (type === 'GRADE') return Trophy
  if (type === 'SUCCESS') return BookOpen
  return Bell
}

export default function ParentNotificationsPage() {
  const [notifications, setNotifications] = useState<SchoolNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await apiClient.get('/notifications')
      setNotifications(Array.isArray(data) ? data : [])
    } catch {
      setError('تعذر تحميل إشعارات الحساب.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const markRead = async (id: string) => {
    try {
      await apiClient.post(`/notifications/${encodeURIComponent(id)}/read`)
      setNotifications((current) => current.map((item) => item.id === id ? { ...item, isRead: true } : item))
    } catch {
      setError('تعذر تحديث حالة الإشعار.')
    }
  }

  const markAllRead = async () => {
    try {
      await apiClient.post('/notifications/read-all')
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })))
    } catch {
      setError('تعذر تحديث حالة الإشعارات.')
    }
  }

  const unreadCount = notifications.filter((item) => !item.isRead).length

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 md:p-6" dir="rtl">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div><h1 className="text-xl font-bold">الإشعارات</h1><p className="text-sm text-muted-foreground">الإشعارات المرتبطة بحساب ولي الأمر</p></div>
        <div className="flex items-center gap-2">
          <button onClick={() => void load()} aria-label="تحديث" className="rounded-lg border p-2"><RefreshCw className="h-4 w-4" /></button>
          <button onClick={() => void markAllRead()} disabled={unreadCount === 0} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm disabled:opacity-50"><CheckCheck className="h-4 w-4" /> قراءة الكل</button>
        </div>
      </header>

      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {loading ? <p className="py-12 text-center text-sm text-muted-foreground">جارٍ تحميل الإشعارات...</p>
        : notifications.length === 0 ? <p className="rounded-lg border p-8 text-center text-sm text-muted-foreground">لا توجد إشعارات مسجلة لهذا الحساب.</p>
          : <div className="divide-y rounded-lg border">{notifications.map((item) => {
            const Icon = iconFor(item.type)
            return <button key={item.id} onClick={() => !item.isRead && void markRead(item.id)} className="flex w-full items-start gap-3 p-4 text-right hover:bg-muted/40">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
              <span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-3"><span className="font-semibold">{item.title}</span><time className="shrink-0 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString('ar-SA')}</time></span><span className="mt-1 block text-sm text-muted-foreground">{item.body}</span></span>
              {!item.isRead && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-600" aria-label="غير مقروء" />}
            </button>
          })}</div>}
    </main>
  )
}
