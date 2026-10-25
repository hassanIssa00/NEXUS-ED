'use client'

import { useCallback, useEffect, useState } from 'react'
import { Award, BadgeCheck, Download, RefreshCw, ShieldCheck } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { useLocale } from 'next-intl'

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
  const locale = useLocale()
  const isEnglish = locale === 'en'
  const copy = (ar: string, en: string) => isEnglish ? en : ar
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
      setError(copy('تعذر تحميل سجل الإنجازات.', 'Could not load the achievement record.'))
    } finally {
      setLoading(false)
    }
  }, [isEnglish])

  useEffect(() => { void load() }, [load])

  const downloadCertificate = async (certificate: IssuedCertificate) => {
    try {
      const response = await apiClient.get(`/workspace/certificates/${certificate.id}/pdf`, { responseType: 'blob' })
      const url = URL.createObjectURL(response.data)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${certificate.serial}.pdf`
      anchor.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      setError(copy('تعذر تنزيل الشهادة. حاول مرة أخرى.', 'Could not download the certificate. Please try again.'))
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 pb-12 md:p-7" dir={isEnglish ? 'ltr' : 'rtl'}>
      <header className="relative overflow-hidden rounded-[1.6rem] bg-gradient-to-l from-[#152b49] via-[#214d6a] to-[#177c70] p-5 text-white shadow-lg sm:p-7"><div aria-hidden="true" className="absolute -left-10 -top-16 size-52 rounded-full border-[28px] border-white/5" /><div className="relative flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><div className="grid size-12 place-items-center rounded-xl bg-white"><img src="/second_logo.webp" alt={copy('مدارس الإخلاص الأهلية', 'Al-Ikhlas Private Schools')} className="size-10 object-contain" /></div><div className="grid size-12 place-items-center rounded-xl bg-white"><img src="/logo_new.webp" alt="Nexus EDU" className="size-10 object-contain" /></div><div className="me-1"><p className="text-xs font-bold text-sky-100">{copy('إنجازك محفوظ في ملفك', 'Your achievements are saved to your profile')}</p><h1 className="mt-1 text-xl font-black sm:text-2xl">{copy('الشهادات والإنجازات', 'Certificates and achievements')}</h1><p className="mt-1 text-sm text-white/80">{studentName || copy('ملف الطالب', 'Student profile')}</p></div></div><button onClick={() => void load()} aria-label={copy('تحديث', 'Refresh')} className="grid size-10 place-items-center rounded-xl border border-white/25 bg-white/10 hover:bg-white/20"><RefreshCw className="h-4 w-4" /></button></div></header>
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {loading ? <p className="py-12 text-center text-sm text-muted-foreground">{copy('جارٍ تحميل السجل...', 'Loading your record…')}</p> : <div className="space-y-6">
        <section className="space-y-3"><div className="flex items-center justify-between"><div><h2 className="text-lg font-black">{copy('الشهادات الصادرة', 'Issued certificates')}</h2><p className="text-sm text-muted-foreground">{copy('شهادات موثقة من المدرسة محفوظة في ملفك', 'School-issued certificates saved to your profile')}</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">{certificates.length} {copy('شهادة', 'certificates')}</span></div>{certificates.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><Award className="mx-auto size-9 text-slate-400" /><p className="mt-3 font-bold">{copy('لا توجد شهادات صادرة لملفك حتى الآن.', 'No certificates have been issued to your profile yet.')}</p><p className="mt-1 text-sm text-muted-foreground">{copy('عند إصدار شهادة لك، ستظهر هنا ويمكنك تنزيلها والتحقق من صحتها.', 'When a certificate is issued to you, it will appear here for download and verification.')}</p></div> : <div className="grid gap-4 md:grid-cols-2">{certificates.map((item) => <article key={item.id} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div aria-hidden="true" className="absolute -left-8 -top-8 size-28 rounded-full bg-amber-100/50 blur-2xl" /><div className="relative"><div className="mb-4 flex items-start justify-between gap-3"><div className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 text-amber-700"><Award className="size-5" /></div><span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800"><BadgeCheck className="size-3.5" />{copy('معتمدة', 'Verified')}</span></div><h3 className="text-lg font-black text-[#152b49]">{item.title}</h3>{item.description && <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>}<p className="mt-3 text-xs text-slate-500">{item.issuer?.name || copy('مدارس الإخلاص الأهلية', 'Al-Ikhlas Private Schools')} · {new Date(item.createdAt).toLocaleDateString(isEnglish ? 'en-US' : 'ar-SA')}</p><div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3"><code dir="ltr" className="text-[10px] font-semibold text-slate-500">{item.serial}</code><div className="flex gap-2"><a href={`/${locale}/certificates/verify/${encodeURIComponent(item.serial)}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-[#214d6a] hover:bg-slate-50"><ShieldCheck className="size-3.5" />{copy('التحقق', 'Verify')}</a><button onClick={() => void downloadCertificate(item)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#214d6a] px-3 text-xs font-bold text-white hover:bg-[#152b49]"><Download className="size-3.5" />PDF</button></div></div></div></article>)}</div>}</section>
        <section className="space-y-3"><h2 className="text-lg font-semibold">{copy('إنجازات المنصة', 'Platform achievements')}</h2>{achievements.length === 0 ? <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">{copy('لا توجد إنجازات مسجلة بعد.', 'No achievements have been recorded yet.')}</p> : <div className="divide-y rounded-md border">{achievements.map((item) => <article key={item.id} className="flex items-start gap-3 p-4"><Award className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" /><div><h3 className="font-semibold">{item.name}</h3>{item.description && <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>}{item.unlockedAt && <time className="mt-2 block text-xs text-muted-foreground">{new Date(item.unlockedAt).toLocaleDateString(isEnglish ? 'en-US' : 'ar-SA')}</time>}</div></article>)}</div>}</section>
      </div>}
    </main>
  )
}
