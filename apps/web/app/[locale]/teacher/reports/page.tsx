'use client'

import { useEffect, useState } from 'react'
import { ParentReportView } from '@/components/analytics/parent-report-view'
import { apiClient } from '@/lib/api/client'

interface SchoolClass {
  id: string
  name: string
}

interface Student {
  id: string
  name: string | null
  firstName: string | null
  lastName: string | null
}

export default function TeacherReportsPage() {
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [classId, setClassId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [period, setPeriod] = useState<'week' | 'month'>('month')
  const [loading, setLoading] = useState(true)
  const [rosterLoading, setRosterLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    apiClient.get('/classes')
      .then(({ data }) => setClasses(Array.isArray(data) ? data : []))
      .catch(() => setError('تعذر تحميل الفصول من النظام.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!classId) {
      setStudents([])
      setStudentId('')
      return
    }

    setRosterLoading(true)
    setStudentId('')
    apiClient.get(`/classes/${classId}`)
      .then(({ data }) => {
        const roster = Array.isArray(data?.students)
          ? data.students.map((entry: any) => entry.student).filter((student: Student) => student?.id)
          : []
        setStudents(roster)
      })
      .catch(() => setError('تعذر تحميل قائمة طلاب الفصل.'))
      .finally(() => setRosterLoading(false))
  }, [classId])

  const selectedStudent = students.find((student) => student.id === studentId)
  const studentName = selectedStudent?.name || [selectedStudent?.firstName, selectedStudent?.lastName].filter(Boolean).join(' ')

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      <header>
        <h1 className="text-2xl font-bold">تقارير الطلاب</h1>
        <p className="text-sm text-muted-foreground">تقارير مبنية على الدرجات والحضور والواجبات المسجلة في النظام.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <label className="space-y-2 text-sm font-medium">
          الفصل
          <select className="w-full rounded-md border bg-background p-2.5" value={classId} onChange={(event) => setClassId(event.target.value)} disabled={loading || classes.length === 0}>
            <option value="">{loading ? 'جارٍ تحميل الفصول...' : 'اختر الفصل'}</option>
            {classes.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>)}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium">
          الطالب
          <select className="w-full rounded-md border bg-background p-2.5" value={studentId} onChange={(event) => setStudentId(event.target.value)} disabled={!classId || rosterLoading || students.length === 0}>
            <option value="">{rosterLoading ? 'جارٍ تحميل الطلاب...' : 'اختر الطالب'}</option>
            {students.map((student) => <option key={student.id} value={student.id}>{student.name || [student.firstName, student.lastName].filter(Boolean).join(' ')}</option>)}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium">
          الفترة
          <select className="w-full rounded-md border bg-background p-2.5" value={period} onChange={(event) => setPeriod(event.target.value as 'week' | 'month')}>
            <option value="week">آخر أسبوع</option>
            <option value="month">آخر شهر</option>
          </select>
        </label>
      </section>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!loading && !error && classes.length === 0 && <p className="py-10 text-center text-muted-foreground">لا توجد فصول مرتبطة بحسابك.</p>}
      {classId && !rosterLoading && students.length === 0 && <p className="py-8 text-center text-muted-foreground">لا يوجد طلاب مسجلون في هذا الفصل.</p>}
      {studentId && <div><p className="mb-3 text-sm text-muted-foreground">تقرير {studentName}</p><ParentReportView key={`${studentId}-${period}`} studentId={studentId} period={period} /></div>}
    </div>
  )
}
