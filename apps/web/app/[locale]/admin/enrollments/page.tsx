'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { apiClient } from '@/lib/api/client'
import { ArrowRightLeft, RefreshCw, Search, UserPlus, UserRoundMinus } from 'lucide-react'

type SchoolClass = { id: string; name: string; academicYear: string | null; _count: { students: number } }
type Student = { id: string; name: string | null; firstName: string | null; lastName: string | null; email: string }
type Enrollment = { id: string; enrolledAt: string; student: Student }
type PagedStudents = { data: Student[]; meta: { page: number; totalPages: number; total: number } }
const fullName = (student: Student) => student.name || [student.firstName, student.lastName].filter(Boolean).join(' ') || student.email

export default function EnrollmentsPage() {
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
      setClassId((current) => current || response.data[0]?.id || '')
    } catch {
      setError('تعذر تحميل الفصول من قاعدة البيانات.')
      setLoading(false)
    }
  }, [])

  const loadClassData = useCallback(async () => {
    if (!classId) {
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
      setError('تعذر تحميل قيود الفصل أو الطلاب المتاحين.')
    } finally {
      setLoading(false)
    }
  }, [classId, candidatePage, appliedSearch])

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
      setNotice(`تم قيد ${response.data.created} طالب${response.data.skipped ? `، وتجاوز ${response.data.skipped} قيدًا موجودًا` : ''}.`)
      await loadClassData()
    } catch {
      setError('تعذر تنفيذ القيد. لم يتم تجاوز نطاق المدرسة أو الطلاب النشطين.')
    } finally {
      setSaving(false)
    }
  }

  const removeEnrollment = async (enrollment: Enrollment) => {
    if (!window.confirm(`إلغاء قيد ${fullName(enrollment.student)} من الفصل؟`)) return
    setError(null)
    try {
      await apiClient.delete(`/enrollments/${enrollment.id}`)
      setNotice('تم إلغاء القيد.')
      await loadClassData()
    } catch {
      setError('تعذر إلغاء القيد.')
    }
  }

  const selectedClass = classes.find((item) => item.id === classId)

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-gray-200 pb-5 dark:border-white/10"><div><p className="text-sm font-semibold text-violet-700 dark:text-violet-300">إدارة المدرسة</p><h1 className="mt-1 text-2xl font-black text-gray-900 dark:text-white">قيد الطلاب في الفصول</h1><p className="mt-2 text-sm text-gray-500 dark:text-gray-400">التسجيلات والطلاب من قاعدة بيانات المدرسة.</p></div><button onClick={() => void loadClassData()} disabled={loading} title="تحديث التسجيلات" className="rounded-lg border border-gray-200 p-2.5 dark:border-white/10"><RefreshCw className="h-4 w-4" /></button></header>
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">{notice}</p>}

      <section className="grid gap-3 sm:grid-cols-3"><label className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#1e1e2d]"><span className="text-xs text-gray-500">الفصل الدراسي</span><select value={classId} onChange={(event) => { setClassId(event.target.value); setCandidatePage(1) }} className="mt-2 w-full bg-transparent text-sm font-bold text-gray-900 outline-none dark:text-white"><option value="">اختر فصلًا</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#1e1e2d]"><p className="text-xs text-gray-500">الطلاب المقيدون</p><p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{loading ? '—' : enrollments.length}</p></div><div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#1e1e2d]"><p className="text-xs text-gray-500">طلاب متاحون لهذا الفصل</p><p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{candidates?.meta.total ?? '—'}</p></div></section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-[#1e1e2d]"><div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-white/10"><div><h2 className="font-black text-gray-900 dark:text-white">المقيدون{selectedClass ? ` · ${selectedClass.name}` : ''}</h2><p className="mt-1 text-xs text-gray-500">السنة {selectedClass?.academicYear || 'غير محددة'}</p></div><ArrowRightLeft className="h-4 w-4 text-violet-600" /></div>{enrollments.length ? <div className="divide-y divide-gray-100 dark:divide-white/10">{enrollments.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-gray-900 dark:text-white">{fullName(item.student)}</p><p className="truncate text-xs text-gray-500">{item.student.email}</p></div><button onClick={() => void removeEnrollment(item)} title="إلغاء القيد" className="rounded-md border border-gray-200 p-2 text-rose-700 dark:border-white/10 dark:text-rose-300"><UserRoundMinus className="h-4 w-4" /></button></div>)}</div> : !loading && <p className="p-8 text-center text-sm text-gray-500">لا يوجد طلاب مقيدون في هذا الفصل.</p>}</section>

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-[#1e1e2d]"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4 dark:border-white/10"><div><h2 className="font-black text-gray-900 dark:text-white">إضافة طلاب للفصل</h2><p className="mt-1 text-xs text-gray-500">اختر حتى 100 طالب في العملية</p></div><button onClick={() => void enrollSelected()} disabled={!selectedIds.length || saving || loading} className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"><UserPlus className="h-4 w-4" /> قيد {selectedIds.length || ''}</button></div>
          <form onSubmit={searchCandidates} className="flex gap-2 border-b border-gray-100 p-3 dark:border-white/10"><label className="relative flex-1"><Search className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث عن طالب" className="w-full rounded-lg border border-gray-200 bg-transparent py-2 pr-9 pl-2 text-sm dark:border-white/10" /></label><button className="rounded-lg border border-gray-200 px-3 text-xs font-bold dark:border-white/10">بحث</button></form>
          {candidates?.data.length ? <div className="divide-y divide-gray-100 dark:divide-white/10">{candidates.data.map((student) => <label key={student.id} className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5"><input type="checkbox" checked={selectedIds.includes(student.id)} onChange={() => toggleStudent(student.id)} disabled={!selectedIds.includes(student.id) && selectedIds.length >= 100} className="h-4 w-4 accent-violet-700" /><span className="min-w-0"><span className="block truncate text-sm font-bold text-gray-900 dark:text-white">{fullName(student)}</span><span className="block truncate text-xs text-gray-500">{student.email}</span></span></label>)}</div> : !loading && <p className="p-8 text-center text-sm text-gray-500">لا يوجد طلاب متاحون لهذا الفصل.</p>}
          {candidates && candidates.meta.totalPages > 1 && <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-xs text-gray-500 dark:border-white/10"><span>صفحة {candidates.meta.page} من {candidates.meta.totalPages}</span><div className="flex gap-2"><button disabled={candidatePage <= 1 || loading} onClick={() => setCandidatePage((value) => value - 1)} className="rounded border border-gray-200 px-2 py-1 disabled:opacity-40 dark:border-white/10">السابق</button><button disabled={candidatePage >= candidates.meta.totalPages || loading} onClick={() => setCandidatePage((value) => value + 1)} className="rounded border border-gray-200 px-2 py-1 disabled:opacity-40 dark:border-white/10">التالي</button></div></div>}
        </section>
      </div>
    </div>
  )
}
