'use client'

import { useEffect, useState } from 'react'
import { ParentReportView } from '@/components/analytics/parent-report-view'
import { apiClient } from '@/lib/api/client'
import { useLocale } from 'next-intl'

interface SchoolClass {
  id: string
  name: string
}

interface Student {
  id: string
  name: string | null
  firstName: string | null
  lastName: string | null
  avatar?: string | null
}

export default function TeacherReportsPage() {
  const isEnglish = useLocale() === 'en'
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
      .catch(() => setError(isEnglish ? 'Could not load classes.' : 'تعذر تحميل الفصول من النظام.'))
      .finally(() => setLoading(false))
  }, [isEnglish])

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
      .catch(() => setError(isEnglish ? 'Could not load this class roster.' : 'تعذر تحميل قائمة طلاب الفصل.'))
      .finally(() => setRosterLoading(false))
  }, [classId, isEnglish])

  const selectedStudent = students.find((student) => student.id === studentId)
  const studentName = selectedStudent?.name || [selectedStudent?.firstName, selectedStudent?.lastName].filter(Boolean).join(' ')

  return (
    <div className="space-y-6 pb-12" dir={isEnglish ? 'ltr' : 'rtl'}>
      <header>
        <h1 className="text-2xl font-bold">{isEnglish ? 'Student reports' : 'تقارير الطلاب'}</h1>
        <p className="text-sm text-muted-foreground">{isEnglish ? 'Reports based on grades, attendance, and assignments recorded in the system.' : 'تقارير مبنية على الدرجات والحضور والواجبات المسجلة في النظام.'}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <label className="space-y-2 text-sm font-medium">
          {isEnglish ? 'Class' : 'الفصل'}
          <select className="w-full rounded-md border bg-background p-2.5" value={classId} onChange={(event) => setClassId(event.target.value)} disabled={loading || classes.length === 0}>
            <option value="">{loading ? (isEnglish ? 'Loading classes...' : 'جارٍ تحميل الفصول...') : (isEnglish ? 'Select a class' : 'اختر الفصل')}</option>
            {classes.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>)}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium">
          {isEnglish ? 'Student' : 'الطالب'}
          <select className="w-full rounded-md border bg-background p-2.5" value={studentId} onChange={(event) => setStudentId(event.target.value)} disabled={!classId || rosterLoading || students.length === 0}>
            <option value="">{rosterLoading ? (isEnglish ? 'Loading students...' : 'جارٍ تحميل الطلاب...') : (isEnglish ? 'Select a student' : 'اختر الطالب')}</option>
            {students.map((student) => <option key={student.id} value={student.id}>{student.name || [student.firstName, student.lastName].filter(Boolean).join(' ')}</option>)}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium">
          {isEnglish ? 'Period' : 'الفترة'}
          <select className="w-full rounded-md border bg-background p-2.5" value={period} onChange={(event) => setPeriod(event.target.value as 'week' | 'month')}>
            <option value="week">{isEnglish ? 'Last week' : 'آخر أسبوع'}</option>
            <option value="month">{isEnglish ? 'Last month' : 'آخر شهر'}</option>
          </select>
        </label>
      </section>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!loading && !error && classes.length === 0 && <p className="py-10 text-center text-muted-foreground">{isEnglish ? 'No classes are linked to your account.' : 'لا توجد فصول مرتبطة بحسابك.'}</p>}
      {classId && !rosterLoading && students.length === 0 && <p className="py-8 text-center text-muted-foreground">{isEnglish ? 'No students are enrolled in this class.' : 'لا يوجد طلاب مسجلون في هذا الفصل.'}</p>}
      {studentId && <div className="space-y-3"><div className="flex items-center gap-3 rounded-xl border bg-card p-3"><div className="size-12 shrink-0 overflow-hidden rounded-full bg-muted">{selectedStudent?.avatar ? <img src={selectedStudent.avatar} alt={isEnglish ? `Photo of ${studentName}` : `صورة ${studentName}`} className="h-full w-full bg-white object-contain" /> : <span className="grid h-full w-full place-items-center font-bold text-muted-foreground">{studentName.slice(0, 1)}</span>}</div><p className="text-sm text-muted-foreground">{isEnglish ? 'Report for ' : 'تقرير الطالب '}<strong className="text-foreground">{studentName}</strong></p></div><ParentReportView key={`${studentId}-${period}`} studentId={studentId} period={period} /></div>}
    </div>
  )
}
