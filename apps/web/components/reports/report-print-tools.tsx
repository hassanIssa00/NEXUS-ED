'use client'

import { Printer } from 'lucide-react'
import Image from 'next/image'
import { useLocale } from 'next-intl'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { apiClient } from '@/lib/api/client'

export function PrintReportButton({ label = 'طباعة / حفظ PDF' }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground hover:bg-muted"
    >
      <Printer className="h-4 w-4" />
      {label}
    </button>
  )
}

export function ReportPrintIdentity({ title, subtitle }: { title: string; subtitle?: string }) {
  const isEnglish = useLocale() === 'en'

  return (
    <header className="report-print-header" aria-label={isEnglish ? 'Report identity' : 'هوية التقرير'} dir={isEnglish ? 'ltr' : 'rtl'}>
      <div className="report-school-brand">
        <Image src="/second_logo.webp" alt={isEnglish ? 'Al-Ikhlas School logo' : 'شعار مدارس الإخلاص الأهلية'} width={64} height={64} />
        <div>
          <strong>{isEnglish ? 'Al-Ikhlas Private Schools' : 'مدارس الإخلاص الأهلية'}</strong>
          <span>{isEnglish ? 'Jeddah · Saudi Arabia' : 'جدة · المملكة العربية السعودية'}</span>
        </div>
      </div>
      <div className="report-print-heading">
        <p>Nexus EDU</p>
        <h1>{title}</h1>
        {subtitle ? <span>{subtitle}</span> : null}
      </div>
      <div className="report-nexus-brand">
        <Image src="/logo_new.webp" alt={isEnglish ? 'Nexus EDU logo' : 'شعار منصة نكسس التعليمية'} width={150} height={72} />
        <div className="report-platform-stamp" aria-label={isEnglish ? 'Nexus EDU platform mark' : 'علامة منصة نكسس التعليمية'}>
          <Image src="/nexus_emblem_transparent.png" alt="" aria-hidden="true" width={26} height={26} />
          <span>NEXUS</span>
          <small>{isEnglish ? 'PLATFORM' : 'المنصة'}</small>
        </div>
      </div>
    </header>
  )
}

export function ReportPrintFooter() {
  const isEnglish = useLocale() === 'en'
  const { profile } = useAuth()
  const [principalName, setPrincipalName] = useState('')
  const [stampDate, setStampDate] = useState('')

  useEffect(() => {
    let active = true
    apiClient.get('/users/school-signature')
      .then(({ data }) => {
        if (active && typeof data?.name === 'string' && data.name.trim()) setPrincipalName(data.name.trim())
      })
      .catch(() => undefined)
    setStampDate(new Intl.DateTimeFormat(isEnglish ? 'en-GB' : 'ar-SA-u-ca-islamic', { year: 'numeric', month: 'numeric', day: 'numeric' }).format(new Date()))
    return () => { active = false }
  }, [isEnglish])

  const directorName = principalName || (profile?.role === 'principal' ? profile.full_name : (isEnglish ? 'School principal' : 'مدير المدرسة'))

  return (
    <footer className="report-print-footer" dir={isEnglish ? 'ltr' : 'rtl'}>
      <div className="report-print-signatures" dir="ltr">
        <div className="report-director-stamp" dir="rtl" aria-label={isEnglish ? `Official seal of ${directorName}` : `الختم الرسمي المعتمد باسم ${directorName}`}>
          <small>{isEnglish ? 'OFFICIAL APPROVED SEAL' : 'الختم الرسمي المعتمد'}</small>
          <strong>{directorName}</strong>
          <span className="report-stamp-stars">✦</span>
          <span className="report-stamp-signature">{isEnglish ? 'Principal signature' : 'توقيع المدير'}</span>
          <span className="report-stamp-line" />
          <span className="report-stamp-date">{stampDate || (isEnglish ? 'Issued by school administration' : 'إصدار إدارة المدرسة')}</span>
          <em>{isEnglish ? 'Nexus EDU · Al-Ikhlas Private Schools' : 'منصة نكسس · مدارس الإخلاص الأهلية'}</em>
        </div>
        <div className="report-platform-seal" dir="rtl" aria-label={isEnglish ? 'Nexus EDU platform seal' : 'ختم منصة نكسس التعليمية'}>
          <Image src="/nexus_emblem_transparent.png" alt="" aria-hidden="true" width={42} height={42} />
          <strong>NEXUS EDU</strong>
          <small>{isEnglish ? 'PLATFORM SEAL' : 'ختم المنصة'}</small>
        </div>
      </div>
      <div className="report-print-footer-meta">
        <span>{isEnglish ? 'Nexus EDU · Generated from school system records' : 'Nexus EDU · تقرير مستخرج من سجلات المدرسة المحفوظة'}</span>
        <span>{isEnglish ? 'Al-Ikhlas Private Schools · Jeddah' : 'مدارس الإخلاص الأهلية · جدة'}</span>
      </div>
    </footer>
  )
}
