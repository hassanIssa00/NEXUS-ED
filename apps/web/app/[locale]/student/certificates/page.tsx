'use client'

import { useCallback, useEffect, useState } from 'react'
import { Award, Download, RefreshCw } from 'lucide-react'
import { apiClient } from '@/lib/api/client'

interface Achievement {
  id: string
  name: string
  description?: string | null
  unlockedAt?: string
}

interface IssuedCertificate {
  id: string
  serial: string
  title: string
  description?: string | null
  createdAt: string
  issuer?: { name?: string | null }
}

export default function StudentCertificatesPage() {
  const [studentName, setStudentName] = useState('')
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [certificates, setCertificates] = useState<IssuedCertificate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [{ data }, certificateResponse] = await Promise.all([
        apiClient.get('/dashboard/student'),
        apiClient.get<IssuedCertificate[]>('/workspace/student/certificates'),
      ])
      setStudentName(data?.student?.name || data?.student?.email || '')
      setAchievements(Array.isArray(data?.achievements) ? data.achievements : [])
      setCertificates(certificateResponse.data || [])
    } catch {
      setError('تعذر تحميل سجل الإنجازات.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const downloadCertificate = async (certificate: IssuedCertificate) => {
    try {
      const response = await apiClient.get(`/workspace/certificates/${certificate.id}/pdf`, { responseType: 'blob' })
      const url = URL.createObjectURL(response.data)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${certificate.serial}.pdf`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('تعذر تنزيل الشهادة. حاول مرة أخرى.')
    }
  }

  return (
    <main className="mx-auto max-w-4xl space-y-5 p-4 md:p-6" dir="rtl">
      <header className="flex items-center justify-between gap-3 border-b pb-4"><div className="flex items-center gap-3"><Award className="h-7 w-7 text-amber-600" /><div><h1 className="text-xl font-bold">الإنجازات المسجلة</h1><p className="text-sm text-muted-foreground">{studentName || 'ملف الطالب'}</p></div></div><button onClick={() => void load()} aria-label="تحديث" className="rounded-lg border p-2"><RefreshCw className="h-4 w-4" /></button></header>
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {loading ? <p className="py-12 text-center text-sm text-muted-foreground">جارٍ تحميل السجل...</p> : <div className="space-y-6">
        <section className="space-y-3"><h2 className="text-lg font-semibold">الشهادات الصادرة</h2>{certificates.length === 0 ? <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">لا توجد شهادات صادرة لملفك حتى الآن.</p> : <div className="divide-y rounded-md border">{certificates.map((item) => <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div className="flex items-start gap-3"><Award className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" /><div><h3 className="font-semibold">{item.title}</h3>{item.description && <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>}<p className="mt-1 text-xs text-muted-foreground">{item.issuer?.name || 'Nexus EDU'} · {new Date(item.createdAt).toLocaleDateString('ar-SA')} · {item.serial}</p></div></div><button onClick={() => void downloadCertificate(item)} className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm"><Download className="h-4 w-4" />تنزيل PDF</button></article>)}</div>}</section>
        <section className="space-y-3"><h2 className="text-lg font-semibold">إنجازات المنصة</h2>{achievements.length === 0 ? <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">لا توجد إنجازات مسجلة بعد.</p> : <div className="divide-y rounded-md border">{achievements.map((item) => <article key={item.id} className="flex items-start gap-3 p-4"><Award className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" /><div><h3 className="font-semibold">{item.name}</h3>{item.description && <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>}{item.unlockedAt && <time className="mt-2 block text-xs text-muted-foreground">{new Date(item.unlockedAt).toLocaleDateString('ar-SA')}</time>}</div></article>)}</div>}</section>
      </div>}
    </main>
  )
}
