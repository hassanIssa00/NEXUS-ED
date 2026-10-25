'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Link } from '@/i18n/routing'
import { apiClient } from '@/lib/api/client'
import { ArrowRightLeft, RefreshCw, Search, UserPlus, UserRoundMinus } from 'lucide-react'
import { ClassHierarchyPicker } from '@/components/classes/ClassHierarchyPicker'
import { useLocale } from 'next-intl'

type SchoolClass = { id: string; name: string; academicYear: string | null; _count: { students: number } }
type Student = { id: string; name: string | null; firstName: string | null; lastName: string | null; email: string; avatar?: string | null }
type Enrollment = { id: string; enrolledAt: string; student: Student }
type PagedStudents = { data: Student[]; meta: { page: number; totalPages: number; total: number } }
const fullName = (student: Student) => student.name || [student.firstName, student.lastName].filter(Boolean).join(' ') || student.email

export default function EnrollmentsPage() {
  const isEnglish = useLocale() === 'en'
  const t = (ar: string, en: string) => isEnglish ? en : ar
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [classId, setClassId] = useState('')
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [candidates, setCandidates] = useState<PagedStudents | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [candidatePage, setCandidatePage] = useState(1)
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const loadClasses = useCallback(async () => {
    setError(null)
    try {
      const response = await apiClient.get<SchoolClass[]>('/classes')
      setClasses(response.data)
      const requestedClassId = new URLSearchParams(window.location.search).get('classId')
      const requestedClass = response.data.find((item) => item.id === requestedClassId)
      setClassId((current) => current || requestedClass?.id || '')
    } catch {
      setError(t('تعذر تحميل الفصول من قاعدة البيانات.', 'Could not load classes from the school database.'))
      setLoading(false)
    }
  }, [isEnglish])

  const loadClassData = useCallback(async () => {
    if (!classId) {
      setEnrollments([])
      setCandidates(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [enrollmentResponse, candidateResponse] = await Promise.all([
        apiClient.get<Enrollment[]>(`/enrollments/class/${classId}`),
        apiClient.get<PagedStudents>(`/enrollments/class/${classId}/candidates`, { params: { page: candidatePage, limit: 25, search: appliedSearch || undefined } }),
      ])
      setEnrollments(enrollmentResponse.data)
      setCandidates(candidateResponse.data)
      setSelectedIds([])
    } catch {
      setError(t('تعذر تحميل قيود الفصل أو الطلاب المتاحين.', 'Could not load class enrollments or available students.'))
    } finally {
      setLoading(false)
    }
  }, [classId, candidatePage, appliedSearch, isEnglish])

  useEffect(() => { void loadClasses() }, [loadClasses])
  useEffect(() => { void loadClassData() }, [loadClassData])

  const searchCandidates = (event: FormEvent) => {
    event.preventDefault()
    setCandidatePage(1)
    setAppliedSearch(search.trim())
  }

  const toggleStudent = (id: string) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 100 ? [...current, id] : current)
  }

  const enrollSelected = async () => {
    if (!classId || !selectedIds.length) return
    setSaving(true)
    setError(null)
    try {
      const response = await apiClient.post<{ created: number; skipped: number }>('/enrollments/bulk', { classId, studentIds: selectedIds })
      setNotice(isEnglish ? `Enrolled ${response.data.created} students${response.data.skipped ? `; skipped ${response.data.skipped} existing enrollments` : ''}.` : `تم قيد ${response.data.created} طالب${response.data.skipped ? `، وتجاوز ${response.data.skipped} قيدًا موجودًا` : ''}.`)
      await loadClassData()
    } catch {
      setError(t('تعذر تنفيذ القيد. لم يتم تجاوز نطاق المدرسة أو الطلاب النشطين.', 'Could not complete enrollment. Only active students within this school can be enrolled.'))
    } finally {
      setSaving(false)
    }
  }

  const removeEnrollment = async (enrollment: Enrollment) => {
    if (!window.confirm(t(`إلغاء قيد ${fullName(enrollment.student)} من الفصل؟`, `Remove ${fullName(enrollment.student)} from this class?`))) return
    setError(null)
    try {
      await apiClient.delete(`/enrollments/${enrollment.id}`)
      setNotice(t('تم إلغاء القيد.', 'Enrollment removed.'))
      await loadClassData()
    } catch {
      setError(t('تعذر إلغاء القيد.', 'Could not remove the enrollment.'))
    }
  }

  const selectedClass = classes.find((item) => item.id === classId)

  return (
    <div className="space-y-6 pb-12" dir={isEnglish ? 'ltr' : 'rtl'}>
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-gray-200 pb-5 dark:border-white/10"><div><p className="text-sm font-semibold text-violet-700 dark:text-violet-300">{t('إدارة المدرسة', 'School management')}</p><h1 className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{t('قيد الطلاب في الفصول', 'Class enrollment')}</h1><p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('التسجيلات والطلاب من قاعدة بيانات المدرسة.', 'Enrollments and students from the school database.')}</p></div><button onClick={() => void loadClassData()} disabled={loading} title={t('تحديث التسجيلات', 'Refresh enrollments')} className="rounded-lg border border-gray-200 p-2.5 dark:border-white/10"><RefreshCw className="h-4 w-4" /></button></header>
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">{notice}</p>}

      <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#1e1e2d]"><div><h2 className="font-black text-gray-900 dark:text-white">{t('تصنيف الفصل حسب المرحلة والصف', 'Filter classes by stage and grade')}</h2><p className="mt-1 text-xs text-gray-500">{t('اختر المرحلة ثم الصف ثم الشعبة لإدارة قيود الطلاب.', 'Choose a stage, grade, and section to manage student enrollments.')}</p></div><ClassHierarchyPicker classes={classes} value={classId} onChange={(value) => { setClassId(value); setCandidatePage(1) }} locale={isEnglish ? 'en' : 'ar'} /><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-gray-200 p-4 dark:border-white/10"><p className="text-xs text-gray-500">{t('الطلاب المقيدون', 'Enrolled students')}</p><p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{loading ? '—' : enrollments.length}</p></div><div className="rounded-xl border border-gray-200 p-4 dark:border-white/10"><p className="text-xs text-gray-500">{t('طلاب متاحون لهذا الفصل', 'Students available for this class')}</p><p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{candidates?.meta.total ?? '—'}</p></div></div></section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-[#1e1e2d]"><div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-white/10"><div><h2 className="font-black text-gray-900 dark:text-white">{t('المقيدون', 'Enrolled students')}{selectedClass ? ` · ${selectedClass.name}` : ''}</h2><p className="mt-1 text-xs text-gray-500">{t('السنة', 'Year')} {selectedClass?.academicYear || t('غير محددة', 'Not set')}</p></div><ArrowRightLeft className="h-4 w-4 text-violet-600" /></div>{enrollments.length ? <div className="divide-y divide-gray-100 dark:divide-white/10">{enrollments.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3"><div className="flex min-w-0 items-center gap-3">{item.student.avatar ? <img src={item.student.avatar} alt={`${t('صورة', 'Photo')} ${fullName(item.student)}`} className="size-10 shrink-0 rounded-full border border-gray-200 object-cover dark:border-white/10" /> : <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">{fullName(item.student).slice(0, 1)}</span>}<div className="min-w-0"><Link href={`/admin/students/${item.student.id}` as never} className="block truncate text-sm font-bold text-primary hover:underline">{fullName(item.student)}</Link><p className="truncate text-xs text-gray-500">{item.student.email}</p></div></div><button onClick={() => void removeEnrollment(item)} title={t('إلغاء القيد', 'Remove enrollment')} className="rounded-md border border-gray-200 p-2 text-rose-700 dark:border-white/10 dark:text-rose-300"><UserRoundMinus className="h-4 w-4" /></button></div>)}</div> : !loading && <p className="p-8 text-center text-sm text-gray-500">{t('لا يوجد طلاب مقيدون في هذا الفصل.', 'No students are enrolled in this class.')}</p>}</section>

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-[#1e1e2d]"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4 dark:border-white/10"><div><h2 className="font-black text-gray-900 dark:text-white">{t('إضافة طلاب للفصل', 'Add students to class')}</h2><p className="mt-1 text-xs text-gray-500">{t('اختر حتى 100 طالب في العملية', 'Select up to 100 students at a time')}</p></div><button onClick={() => void enrollSelected()} disabled={!selectedIds.length || saving || loading} className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"><UserPlus className="h-4 w-4" /> {t('قيد', 'Enroll')} {selectedIds.length || ''}</button></div>
          <form onSubmit={searchCandidates} className="flex gap-2 border-b border-gray-100 p-3 dark:border-white/10"><label className="relative flex-1"><Search className={`absolute ${isEnglish ? 'left-2.5' : 'right-2.5'} top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400`} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('ابحث عن طالب', 'Search students')} className={`w-full rounded-lg border border-gray-200 bg-transparent py-2 ${isEnglish ? 'pl-9 pr-2' : 'pr-9 pl-2'} text-sm dark:border-white/10`} /></label><button className="rounded-lg border border-gray-200 px-3 text-xs font-bold dark:border-white/10">{t('بحث', 'Search')}</button></form>
          {candidates?.data.length ? <div className="divide-y divide-gray-100 dark:divide-white/10">{candidates.data.map((student) => <label key={student.id} className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5"><input type="checkbox" checked={selectedIds.includes(student.id)} onChange={() => toggleStudent(student.id)} disabled={!selectedIds.includes(student.id) && selectedIds.length >= 100} className="h-4 w-4 accent-violet-700" /><span className="min-w-0"><span className="block truncate text-sm font-bold text-gray-900 dark:text-white">{fullName(student)}</span><span className="block truncate text-xs text-gray-500">{student.email}</span></span></label>)}</div> : !loading && <p className="p-8 text-center text-sm text-gray-500">{t('لا يوجد طلاب متاحون لهذا الفصل.', 'No students are available for this class.')}</p>}
          {candidates && candidates.meta.totalPages > 1 && <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-xs text-gray-500 dark:border-white/10"><span>{isEnglish ? `Page ${candidates.meta.page} of ${candidates.meta.totalPages}` : `صفحة ${candidates.meta.page} من ${candidates.meta.totalPages}`}</span><div className="flex gap-2"><button disabled={candidatePage <= 1 || loading} onClick={() => setCandidatePage((value) => value - 1)} className="rounded border border-gray-200 px-2 py-1 disabled:opacity-40 dark:border-white/10">{t('السابق', 'Previous')}</button><button disabled={candidatePage >= candidates.meta.totalPages || loading} onClick={() => setCandidatePage((value) => value + 1)} className="rounded border border-gray-200 px-2 py-1 disabled:opacity-40 dark:border-white/10">{t('التالي', 'Next')}</button></div></div>}
        </section>
      </div>
    </div>
  )
}
