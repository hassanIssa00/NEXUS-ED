'use client'

import { use, useEffect, useState } from 'react'
import { BadgeCheck, CalendarDays, LoaderCircle, ShieldAlert } from 'lucide-react'
import { apiClient } from '@/lib/api/client'

type CertificateVerification = {
  verified: true
  serial: string
  title: string
  description?: string | null
  issuedAt: string
  schoolName: string
  studentName: string
  issuerName: string
}

export default function VerifyCertificatePage({ params }: { params: Promise<{ locale: string; serial: string }> }) {
  const { locale, serial } = use(params)
  const [certificate, setCertificate] = useState<CertificateVerification | null>(null)
  const [loading, setLoading] = useState(true)
  const isEnglish = locale === 'en'

  useEffect(() => {
    let active = true
    apiClient.get<CertificateVerification>(`/workspace/certificates/verify/${encodeURIComponent(serial)}`)
      .then(({ data }) => { if (active) setCertificate(data) })
      .catch(() => { if (active) setCertificate(null) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [serial])

  const date = certificate?.issuedAt
    ? new Intl.DateTimeFormat(isEnglish ? 'en' : 'ar-SA', { dateStyle: 'long' }).format(new Date(certificate.issuedAt))
    : ''

  return <main dir={isEnglish ? 'ltr' : 'rtl'} className="relative flex min-h-[calc(100vh-5rem)] items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-100 via-slate-50 to-white px-4 py-12">
    <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-cyan-200/30 blur-3xl" />
    <div aria-hidden="true" className="pointer-events-none absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-amber-200/30 blur-3xl" />
    <section className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white bg-white/95 shadow-[0_28px_90px_-35px_rgba(20,55,78,0.35)]">
      <div className="h-2 bg-gradient-to-r from-[#c99b43] via-[#159a91] to-[#214d6a]" />
      <div className="p-6 sm:p-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-14 place-items-center rounded-2xl border border-slate-100 bg-white shadow-sm"><img src="/logo_new.webp" alt="Nexus EDU" className="size-11 object-contain" /></div>
            <div className="grid size-14 place-items-center rounded-2xl border border-slate-100 bg-white shadow-sm"><img src="/second_logo.webp" alt={isEnglish ? 'Al-Ikhlas Schools' : 'مدارس الإخلاص الأهلية'} className="size-11 object-contain" /></div>
          </div>
          <span className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-bold tracking-wide text-slate-500">NEXUS EDU · VERIFY</span>
        </div>

        {loading ? <div className="flex min-h-64 flex-col items-center justify-center gap-4 text-slate-600"><LoaderCircle className="size-9 animate-spin text-[#1c7c79]" /><p>{isEnglish ? 'Checking certificate record…' : 'جارٍ التحقق من سجل الشهادة…'}</p></div> : certificate ? <>
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
            <BadgeCheck className="size-8 shrink-0 text-emerald-600" />
            <div><h1 className="font-black">{isEnglish ? 'Verified certificate' : 'شهادة موثقة وصحيحة'}</h1><p className="mt-1 text-sm text-emerald-800">{isEnglish ? 'This serial matches an issued certificate in Nexus EDU.' : 'رقم الشهادة مطابق لسجل شهادة صادرة في منصة نكسس.'}</p></div>
          </div>
          <p className="mb-2 text-sm font-bold text-[#1c7c79]">{certificate.schoolName}</p>
          <h2 className="text-2xl font-black text-[#152b49]">{certificate.title}</h2>
          <div className="my-6 rounded-2xl border border-[#dce7e9] bg-gradient-to-br from-[#f3f8fa] to-[#eff8f5] p-5 sm:p-7">
            <p className="text-sm text-slate-500">{isEnglish ? 'Awarded to' : 'مُنحت بكل فخر إلى'}</p>
            <p className="mt-2 text-2xl font-black text-[#137968] sm:text-3xl">{certificate.studentName}</p>
            {certificate.description && <p className="mt-4 leading-7 text-slate-700">{certificate.description}</p>}
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-100 p-4"><dt className="text-xs font-semibold text-slate-500">{isEnglish ? 'Issued by' : 'جهة الإصدار'}</dt><dd className="mt-1 font-bold text-slate-800">{certificate.issuerName}</dd></div>
            <div className="rounded-xl border border-slate-100 p-4"><dt className="flex items-center gap-2 text-xs font-semibold text-slate-500"><CalendarDays className="size-4" />{isEnglish ? 'Issue date' : 'تاريخ الإصدار'}</dt><dd className="mt-1 font-bold text-slate-800">{date}</dd></div>
          </dl>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#152b49] px-4 py-3 text-white"><span className="text-xs text-slate-300">{isEnglish ? 'Certificate serial' : 'الرقم التسلسلي'}</span><code dir="ltr" className="font-mono text-sm font-bold tracking-wide">{certificate.serial}</code></div>
        </> : <div className="flex min-h-64 flex-col items-center justify-center text-center"><ShieldAlert className="mb-4 size-10 text-amber-600" /><h1 className="text-xl font-black text-slate-900">{isEnglish ? 'Certificate not found' : 'لم نعثر على شهادة بهذا الرقم'}</h1><p className="mt-2 max-w-md text-sm leading-6 text-slate-600">{isEnglish ? 'Check the QR code or serial and try again.' : 'تأكد من أن رمز التحقق واضح أو أدخل الرقم التسلسلي الصحيح.'}</p></div>}
      </div>
    </section>
  </main>
}
