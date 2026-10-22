'use client'

import { Printer } from 'lucide-react'
import Image from 'next/image'
import { useLocale } from 'next-intl'

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

  return (
    <footer className="report-print-footer">
      <span>{isEnglish ? 'Nexus EDU · Generated from school system records' : 'Nexus EDU · تقرير مستخرج من سجلات المدرسة المحفوظة'}</span>
      <span>{isEnglish ? 'Al-Ikhlas Private Schools · Jeddah' : 'مدارس الإخلاص الأهلية · جدة'}</span>
    </footer>
  )
}
