'use client'

import { useParams } from 'next/navigation'
import { PlacementAssessmentReportDocument } from '@/components/assessment/placement-assessment-report-document'

export default function PlacementAssessmentReportPage() {
  const { attemptId } = useParams<{ attemptId: string }>()
  return <PlacementAssessmentReportDocument attemptId={attemptId} />
}
