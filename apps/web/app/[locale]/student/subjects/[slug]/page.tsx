import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, BookOpen } from 'lucide-react'
import { curriculaList, getCurriculumBySlug } from '@/lib/curriculaData'
import CurriculumInteractiveWorkbook from '@/components/CurriculumInteractiveWorkbook'
import QuranReadOnlyViewer from '@/components/QuranReadOnlyViewer'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ locale: string; slug: string }>
}

export function generateStaticParams() {
  return curriculaList.map((c) => ({ slug: c.slug }))
}

export default async function CurriculumBookPage({ params }: PageProps) {
  const { slug } = await params
  const curriculum = getCurriculumBySlug(slug)

  if (!curriculum) notFound()

  return (
    <div className="min-h-screen" dir="rtl">
      {/* Breadcrumb */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <Link href="../subjects" className="hover:text-blue-700 transition">
            المناهج التعليمية
          </Link>
          <ChevronLeft size={14} />
          <span className="font-black text-slate-900">{curriculum.title}</span>
        </div>
        <Link
          href="../subjects"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black text-white shadow-sm transition hover:opacity-90"
          style={{ backgroundColor: curriculum.color }}
        >
          <BookOpen size={13} />
          كل المواد
        </Link>
      </div>

      {curriculum.isQuran ? (
        <QuranReadOnlyViewer curriculum={curriculum} />
      ) : (
        <CurriculumInteractiveWorkbook curriculum={curriculum} />
      )}
    </div>
  )
}
