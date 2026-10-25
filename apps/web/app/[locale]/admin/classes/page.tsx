'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { apiClient } from '@/lib/api/client'
import { Link } from '@/i18n/routing'
import { BookOpen, Pencil, Plus, RefreshCw, Users } from 'lucide-react'
import { ClassHierarchyPicker } from '@/components/classes/ClassHierarchyPicker'
import { gradeWordsLabel, parseClassName, stageLabel, type ClassStage } from '@/lib/school-class-hierarchy'
import { useLocale } from 'next-intl'

type SchoolClass = {
  id: string
  name: string
  description: string | null
  academicYear: string | null
  classCode: string
  teacherId: string | null
  teacher: { id: string; name: string | null; email: string } | null
  _count: { students: number; subjects: number }
}
type Teacher = { id: string; name: string | null; email: string }
const emptyForm = { name: '', description: '', academicYear: '', teacherId: '' }
const gradesByStage: Record<Exclude<ClassStage, 'unspecified'>, number[]> = { kindergarten: [1, 2, 3], primary: [1, 2, 3, 4, 5, 6], middle: [1, 2, 3], secondary: [1, 2, 3] }

export default function ClassesPage() {
  const isEnglish = useLocale() === 'en'
  const t = (ar: string, en: string) => isEnglish ? en : ar
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SchoolClass | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [classStage, setClassStage] = useState<Exclude<ClassStage, 'unspecified'>>('primary')
  const [classGrade, setClassGrade] = useState(1)
  const [classSection, setClassSection] = useState(1)
  const [classFilterId, setClassFilterId] = useState('')

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
      setError(t('تعذر تحميل الفصول أو قائمة المعلمين من قاعدة البيانات.', 'Could not load classes or teachers from the school database.'))
    } finally {
      setLoading(false)
    }
  }, [isEnglish])

  useEffect(() => { void load() }, [load])

  const create = () => { setEditing(null); setForm(emptyForm); setClassStage('primary'); setClassGrade(1); setClassSection(1); setModalOpen(true) }
  const edit = (item: SchoolClass) => {
    setEditing(item)
    setForm({ name: item.name, description: item.description || '', academicYear: item.academicYear || '', teacherId: item.teacherId || '' })
    setModalOpen(true)
  }

  const save = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    const body = { ...form, name: editing ? form.name.trim() : `${gradeWordsLabel(classGrade, classStage)} ${classGrade}/${classSection}`, description: form.description.trim() || undefined, academicYear: form.academicYear.trim() || undefined, teacherId: form.teacherId || undefined }
    try {
      if (editing) await apiClient.patch(`/classes/${editing.id}`, body)
      else await apiClient.post('/classes', body)
      setModalOpen(false)
      await load()
    } catch {
      setError(t('تعذر حفظ الفصل. تأكد من الاسم وصلاحية المعلم المحدد.', 'Could not save the class. Check its name and the selected teacher.'))
    } finally {
      setSaving(false)
    }
  }

  const visibleClasses = classFilterId ? classes.filter((item) => item.id === classFilterId) : classes
  const currentName = isEnglish ? `${classStage === 'kindergarten' ? 'Level' : 'Grade'} ${classGrade} / ${classSection} · ${({ kindergarten: 'Kindergarten', primary: 'Primary', middle: 'Middle school', secondary: 'Secondary' } as const)[classStage]}` : `${gradeWordsLabel(classGrade, classStage)} ${classGrade}/${classSection}`

  return (
    <div className="space-y-6 pb-12" dir={isEnglish ? 'ltr' : 'rtl'}>
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-gray-200 pb-5 dark:border-white/10"><div><p className="text-sm font-semibold text-violet-700 dark:text-violet-300">{t('إدارة المدرسة', 'School management')}</p><h1 className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{t('الفصول الدراسية', 'Classes')}</h1><p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('الفصول والمعلمون والتسجيلات المرتبطة بها في قاعدة البيانات.', 'Classes, teachers, and enrollments stored in the school database.')}</p></div><div className="flex gap-2"><button onClick={() => void load()} title={t('تحديث الفصول', 'Refresh classes')} className="rounded-lg border border-gray-200 p-2.5 dark:border-white/10"><RefreshCw className="h-4 w-4" /></button><button onClick={create} className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-800"><Plus className="h-4 w-4" /> {t('إنشاء فصل', 'Create class')}</button></div></header>
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>}

      <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#1e1e2d]">
        <div className="mb-3"><h2 className="font-bold text-gray-900 dark:text-white">{t('تصفّح الفصول حسب المرحلة والصف', 'Browse classes by stage and grade')}</h2><p className="mt-1 text-xs text-gray-500">{t('تظهر هنا الفصول الموجودة فعلًا في سجل المدرسة، ثم تختار الشعبة بالاسم المسجل.', 'Only classes registered by the school appear here. Choose the section by its registered name.')}</p></div>
        <ClassHierarchyPicker classes={classes} value={classFilterId} onChange={setClassFilterId} locale={isEnglish ? 'en' : 'ar'} />
        {classFilterId && <button type="button" onClick={() => setClassFilterId('')} className="mt-3 text-xs font-semibold text-violet-700 hover:underline dark:text-violet-300">{t('عرض كل الفصول', 'Show all classes')}</button>}
      </section>

      <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#1e1e2d]"><p className="text-xs text-gray-500">{t('الفصول المعروضة', 'Classes shown')}</p><p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{visibleClasses.length}</p></div><div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#1e1e2d]"><p className="text-xs text-gray-500">{t('الطلاب المسجلون', 'Enrolled students')}</p><p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{visibleClasses.reduce((sum, item) => sum + item._count.students, 0)}</p></div><div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#1e1e2d]"><p className="text-xs text-gray-500">{t('المواد المرتبطة', 'Linked subjects')}</p><p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{visibleClasses.reduce((sum, item) => sum + item._count.subjects, 0)}</p></div></div>

      {loading ? <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 dark:border-white/10 dark:bg-[#1e1e2d]">{t('جار تحميل الفصول...', 'Loading classes…')}</div> : visibleClasses.length ? <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-[#1e1e2d]"><table className="w-full min-w-[760px] text-start text-sm"><thead className="bg-gray-50 text-xs text-gray-500 dark:bg-white/5"><tr><th className="px-4 py-3">{t('المرحلة والصف / الشعبة', 'Stage / grade / section')}</th><th className="px-4 py-3">{t('السنة الدراسية', 'Academic year')}</th><th className="px-4 py-3">{t('المعلم', 'Teacher')}</th><th className="px-4 py-3">{t('الطلاب', 'Students')}</th><th className="px-4 py-3">{t('المواد', 'Subjects')}</th><th className="px-4 py-3">{t('إجراء', 'Action')}</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-white/10">{visibleClasses.map((item) => { const parsed = parseClassName(item.name); const parsedGradeLabel = parsed.grade === null ? t('صف غير محدد', 'Unspecified grade') : `${t('الصف', 'Grade')} ${parsed.grade} · ${stageLabel(parsed.stage, isEnglish)}`; return <tr key={item.id}><td className="px-4 py-3"><p className="font-bold text-gray-900 dark:text-white">{parsedGradeLabel}</p><p className="mt-1 text-xs text-gray-500">{item.name}</p>{item.description && <p className="mt-1 text-xs text-gray-500">{item.description}</p>}</td><td className="px-4 py-3 text-gray-600 dark:text-gray-300">{item.academicYear || '—'}</td><td className="px-4 py-3 text-gray-600 dark:text-gray-300">{item.teacher?.name || item.teacher?.email || t('غير معيّن', 'Unassigned')}</td><td className="px-4 py-3"><span className="inline-flex items-center gap-1"><Users className="h-4 w-4 text-gray-400" />{item._count.students}</span></td><td className="px-4 py-3"><span className="inline-flex items-center gap-1"><BookOpen className="h-4 w-4 text-gray-400" />{item._count.subjects}</span></td><td className="px-4 py-3"><div className="flex items-center gap-2"><Link href={`/admin/enrollments?classId=${encodeURIComponent(item.id)}` as never} className="rounded-md border border-gray-200 px-2.5 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-50 dark:border-white/10 dark:text-violet-300 dark:hover:bg-white/5">{t('عرض الطلاب', 'View students')}</Link><button onClick={() => edit(item)} title={t('تعديل الفصل', 'Edit class')} className="rounded-md border border-gray-200 p-2 dark:border-white/10"><Pencil className="h-4 w-4" /></button></div></td></tr>})}</tbody></table></div> : !error && <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-white/15">{t('لا توجد فصول مسجلة في هذا الاختيار. جرّب مرحلة وصفًا آخر.', 'No classes are registered for this selection. Try another stage or grade.')}</div>}

      {modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false) }}><form onSubmit={save} dir={isEnglish ? 'ltr' : 'rtl'} className="w-full max-w-lg space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-[#1e1e2d]"><div className="flex items-center justify-between"><h2 className="text-lg font-black text-gray-900 dark:text-white">{editing ? t('تعديل الفصل', 'Edit class') : t('إنشاء فصل', 'Create class')}</h2><button type="button" onClick={() => setModalOpen(false)} className="text-sm text-gray-500">{t('إغلاق', 'Close')}</button></div>{editing ? <label className="block text-sm font-semibold">{t('اسم الفصل', 'Class name')}<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 dark:border-white/10" /></label> : <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-semibold">{t('المرحلة', 'Stage')}<select value={classStage} onChange={(event) => { const next = event.target.value as Exclude<ClassStage, 'unspecified'>; setClassStage(next); setClassGrade(1) }} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#1e1e2d]"><option value="kindergarten">{t('رياض الأطفال', 'Kindergarten')}</option><option value="primary">{t('ابتدائي', 'Primary')}</option><option value="middle">{t('متوسط', 'Middle school')}</option><option value="secondary">{t('ثانوي', 'Secondary')}</option></select></label><label className="block text-sm font-semibold">{t('الصف', 'Grade')}<select value={classGrade} onChange={(event) => setClassGrade(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#1e1e2d]">{gradesByStage[classStage].map((grade) => <option key={grade} value={grade}>{isEnglish ? `Grade ${grade}` : gradeWordsLabel(grade, classStage)}</option>)}</select></label><label className="block text-sm font-semibold">{t('رقم الشعبة', 'Section number')}<input type="number" min={1} max={30} value={classSection} onChange={(event) => setClassSection(Math.max(1, Number(event.target.value) || 1))} className="mt-1 w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 dark:border-white/10" /></label><div className="rounded-lg border border-dashed border-violet-300 bg-violet-50/60 p-3 text-sm dark:border-violet-500/30 dark:bg-violet-500/10"><span className="text-xs text-gray-500">{t('اسم الفصل الذي سيُسجّل', 'Class name to be registered')}</span><p className="mt-1 font-bold text-violet-900 dark:text-violet-200">{currentName}</p></div></div>}<label className="block text-sm font-semibold">{t('السنة الدراسية', 'Academic year')}<input value={form.academicYear} onChange={(event) => setForm({ ...form, academicYear: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 dark:border-white/10" /></label><label className="block text-sm font-semibold">{t('الوصف', 'Description')}<input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 dark:border-white/10" /></label><label className="block text-sm font-semibold">{t('معلم الفصل', 'Class teacher')}<select value={form.teacherId} onChange={(event) => setForm({ ...form, teacherId: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#1e1e2d]"><option value="">{t('بدون تعيين', 'Unassigned')}</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name || teacher.email}</option>)}</select></label><button disabled={saving} className="w-full rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? t('جار الحفظ...', 'Saving…') : t('حفظ الفصل', 'Save class')}</button></form></div>}
    </div>
  )
}
