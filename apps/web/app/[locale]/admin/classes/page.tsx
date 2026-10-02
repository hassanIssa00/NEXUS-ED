'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { apiClient } from '@/lib/api/client'
import { BookOpen, Pencil, Plus, RefreshCw, Users } from 'lucide-react'

type SchoolClass = {
  id: string
  name: string
  description: string | null
  academicYear: string | null
  teacherId: string | null
  teacher: { id: string; name: string | null; email: string } | null
  _count: { students: number; subjects: number }
}
type Teacher = { id: string; name: string | null; email: string }
const emptyForm = { name: '', description: '', academicYear: '', teacherId: '' }

export default function ClassesPage() {
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SchoolClass | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [classResponse, teacherResponse] = await Promise.all([
        apiClient.get<SchoolClass[]>('/classes'),
        apiClient.get<{ data: Teacher[] }>('/users', { params: { role: 'TEACHER', limit: 100 } }),
      ])
      setClasses(classResponse.data)
      setTeachers(teacherResponse.data.data)
    } catch {
      setError('تعذر تحميل الفصول أو قائمة المعلمين من قاعدة البيانات.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const create = () => { setEditing(null); setForm(emptyForm); setModalOpen(true) }
  const edit = (item: SchoolClass) => {
    setEditing(item)
    setForm({ name: item.name, description: item.description || '', academicYear: item.academicYear || '', teacherId: item.teacherId || '' })
    setModalOpen(true)
  }

  const save = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    const body = { ...form, description: form.description.trim() || undefined, academicYear: form.academicYear.trim() || undefined, teacherId: form.teacherId || undefined }
    try {
      if (editing) await apiClient.patch(`/classes/${editing.id}`, body)
      else await apiClient.post('/classes', body)
      setModalOpen(false)
      await load()
    } catch {
      setError('تعذر حفظ الفصل. تأكد من الاسم وصلاحية المعلم المحدد.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-gray-200 pb-5 dark:border-white/10"><div><p className="text-sm font-semibold text-violet-700 dark:text-violet-300">إدارة المدرسة</p><h1 className="mt-1 text-2xl font-black text-gray-900 dark:text-white">الفصول الدراسية</h1><p className="mt-2 text-sm text-gray-500 dark:text-gray-400">الفصول والمعلمون والتسجيلات المرتبطة بها في قاعدة البيانات.</p></div><div className="flex gap-2"><button onClick={() => void load()} title="تحديث الفصول" className="rounded-lg border border-gray-200 p-2.5 dark:border-white/10"><RefreshCw className="h-4 w-4" /></button><button onClick={create} className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-800"><Plus className="h-4 w-4" /> إنشاء فصل</button></div></header>
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#1e1e2d]"><p className="text-xs text-gray-500">الفصول</p><p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{classes.length}</p></div><div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#1e1e2d]"><p className="text-xs text-gray-500">الطلاب المسجلون</p><p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{classes.reduce((sum, item) => sum + item._count.students, 0)}</p></div><div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#1e1e2d]"><p className="text-xs text-gray-500">المواد المرتبطة</p><p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{classes.reduce((sum, item) => sum + item._count.subjects, 0)}</p></div></div>

      {loading ? <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 dark:border-white/10 dark:bg-[#1e1e2d]">جار تحميل الفصول...</div> : classes.length ? <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-[#1e1e2d]"><table className="w-full min-w-[760px] text-right text-sm"><thead className="bg-gray-50 text-xs text-gray-500 dark:bg-white/5"><tr><th className="px-4 py-3">الفصل</th><th className="px-4 py-3">السنة الدراسية</th><th className="px-4 py-3">المعلم</th><th className="px-4 py-3">الطلاب</th><th className="px-4 py-3">المواد</th><th className="px-4 py-3">إجراء</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-white/10">{classes.map((item) => <tr key={item.id}><td className="px-4 py-3"><p className="font-bold text-gray-900 dark:text-white">{item.name}</p>{item.description && <p className="mt-1 text-xs text-gray-500">{item.description}</p>}</td><td className="px-4 py-3 text-gray-600 dark:text-gray-300">{item.academicYear || '—'}</td><td className="px-4 py-3 text-gray-600 dark:text-gray-300">{item.teacher?.name || item.teacher?.email || 'غير معيّن'}</td><td className="px-4 py-3"><span className="inline-flex items-center gap-1"><Users className="h-4 w-4 text-gray-400" />{item._count.students}</span></td><td className="px-4 py-3"><span className="inline-flex items-center gap-1"><BookOpen className="h-4 w-4 text-gray-400" />{item._count.subjects}</span></td><td className="px-4 py-3"><button onClick={() => edit(item)} title="تعديل الفصل" className="rounded-md border border-gray-200 p-2 dark:border-white/10"><Pencil className="h-4 w-4" /></button></td></tr>)}</tbody></table></div> : !error && <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-white/15">لا توجد فصول مسجلة للمدرسة بعد.</div>}

      {modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false) }}><form onSubmit={save} className="w-full max-w-lg space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-[#1e1e2d]"><div className="flex items-center justify-between"><h2 className="text-lg font-black text-gray-900 dark:text-white">{editing ? 'تعديل الفصل' : 'إنشاء فصل'}</h2><button type="button" onClick={() => setModalOpen(false)} className="text-sm text-gray-500">إغلاق</button></div><label className="block text-sm font-semibold">اسم الفصل<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 dark:border-white/10" /></label><label className="block text-sm font-semibold">السنة الدراسية<input value={form.academicYear} onChange={(event) => setForm({ ...form, academicYear: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 dark:border-white/10" /></label><label className="block text-sm font-semibold">الوصف<input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 dark:border-white/10" /></label><label className="block text-sm font-semibold">معلم الفصل<select value={form.teacherId} onChange={(event) => setForm({ ...form, teacherId: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#1e1e2d]"><option value="">بدون تعيين</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name || teacher.email}</option>)}</select></label><button disabled={saving} className="w-full rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? 'جار الحفظ...' : 'حفظ الفصل'}</button></form></div>}
    </div>
  )
}
