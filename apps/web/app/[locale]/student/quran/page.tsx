import { getCurriculumBySlug } from '@/lib/curriculaData'
import QuranReadOnlyViewer from '@/components/QuranReadOnlyViewer'
import { notFound } from 'next/navigation'

export default function StudentQuranPage() {
  const curriculum = getCurriculumBySlug('quran')
  if (!curriculum) notFound()

  return (
    <div className="min-h-screen" dir="rtl">
      <QuranReadOnlyViewer curriculum={curriculum} />
    </div>
  )
}
