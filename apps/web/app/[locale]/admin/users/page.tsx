'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { apiClient } from '@/lib/api/client'
import { Pencil, Plus, RefreshCw, Search, UserRound, UserRoundX } from 'lucide-react'
import { PresenceBadge } from '@/components/ui/presence-badge'
import { ClassHierarchyPicker } from '@/components/classes/ClassHierarchyPicker'
import { useLocale } from 'next-intl'

type UserRecord = {
  id: string
  name: string | null
  firstName: string | null
  lastName: string | null
  email: string
  avatar?: string | null
  role: string
  phone: string | null
  isActive: boolean
  lastActiveDate: string | null
}
type UserResponse = { data: UserRecord[]; meta: { total: number; page: number; limit: number; totalPages: number } }
type SchoolClass = { id: string; name: string }
type Enrollment = { student: Pick<UserRecord, 'id' | 'name' | 'firstName' | 'lastName' | 'email' | 'phone' | 'avatar' | 'isActive' | 'lastActiveDate'> }

const roles = [
  ['TEACHER', 'معلم'], ['STUDENT', 'طالب'], ['PARENT', 'ولي أمر'], ['PRINCIPAL', 'مدير'],
  ['VICE_PRINCIPAL', 'وكيل'], ['COUNSELOR', 'مرشد طلابي'], ['SUPERVISOR', 'مشرف'],
  ['ACCOUNTANT', 'محاسب'], ['HR', 'موارد بشرية'], ['ADMIN', 'إداري'],
]
const roleNames = Object.fromEntries(roles)
const blankForm = { name: '', email: '', phone: '', role: 'STUDENT', password: '' }

export default function UsersPage() {
  const isEnglish = useLocale() === 'en'
  const t = (ar: string, en: string) => isEnglish ? en : ar
  const [result, setResult] = useState<UserResponse | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [role, setRole] = useState('all')
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [classFilterId, setClassFilterId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<UserRecord | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(blankForm)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (role === 'STUDENT') {
        const classesResponse = await apiClient.get<SchoolClass[]>('/classes')
        setClasses(classesResponse.data)
        if (classFilterId) {
          const response = await apiClient.get<Enrollment[]>(`/enrollments/class/${classFilterId}`)
          const normalizedSearch = appliedSearch.trim().toLocaleLowerCase()
          const students: UserRecord[] = response.data.map(({ student }) => ({ ...student, role: 'STUDENT' }))
          const filtered = normalizedSearch ? students.filter((student) => `${student.name || [student.firstName, student.lastName].filter(Boolean).join(' ')} ${student.email}`.toLocaleLowerCase().includes(normalizedSearch)) : students
          setResult({ data: filtered, meta: { total: filtered.length, page: 1, limit: filtered.length || 25, totalPages: 1 } })
        } else {
          const response = await apiClient.get<UserResponse>('/users', {
            params: { page, limit: 25, search: appliedSearch || undefined, role },
          })
          setResult(response.data)
        }
      } else {
        const response = await apiClient.get<UserResponse>('/users', {
          params: { page, limit: 25, search: appliedSearch || undefined, role: role === 'all' ? undefined : role },
        })
        setResult(response.data)
      }
    } catch {
      setError(t('تعذر تحميل حسابات المدرسة.', 'Could not load school accounts.'))
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [page, appliedSearch, role, classFilterId, isEnglish])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load()
    }, 60_000)
    return () => window.clearInterval(timer)
  }, [load])

  const beginCreate = () => { setEditing(null); setForm(blankForm); setModalOpen(true) }
  const beginEdit = (user: UserRecord) => {
    setEditing(user)
    setForm({ name: user.name || [user.firstName, user.lastName].filter(Boolean).join(' '), email: user.email, phone: user.phone || '', role: user.role, password: '' })
    setModalOpen(true)
  }

  const save = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (editing) {
        const body: Record<string, string> = { name: form.name.trim(), email: form.email.trim(), role: form.role, phone: form.phone.trim() }
        if (form.password) body.password = form.password
        await apiClient.patch(`/users/${editing.id}`, body)
      } else {
        await apiClient.post('/users', { ...form, name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() || undefined })
      }
      setEditing(null)
      setForm(blankForm)
      setModalOpen(false)
      await load()
    } catch {
      setError(t('تعذر حفظ الحساب. تحقق من البريد والدور والحقول المطلوبة.', 'Could not save the account. Check the email, role, and required fields.'))
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (user: UserRecord) => {
    setError(null)
    try {
      await apiClient.patch(`/users/${user.id}`, { isActive: !user.isActive })
      await load()
    } catch {
      setError(t('تعذر تحديث حالة الحساب.', 'Could not update the account status.'))
    }
  }

  const submitSearch = (event: FormEvent) => { event.preventDefault(); setPage(1); setAppliedSearch(search.trim()) }

  return (
    <div className="space-y-6 pb-12" dir={isEnglish ? 'ltr' : 'rtl'}>
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-gray-200 pb-5 dark:border-white/10">
        <div><p className="text-sm font-semibold text-violet-700 dark:text-violet-300">{t('إدارة المدرسة', 'School management')}</p><h1 className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{t('حسابات المستخدمين', 'User accounts')}</h1><p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('إدارة الحسابات المحفوظة في قاعدة بيانات المدرسة.', 'Manage accounts stored in the school database.')}</p></div>
        <div className="flex gap-2"><button onClick={() => void load()} title={t('تحديث القائمة', 'Refresh list')} className="rounded-lg border border-gray-200 p-2.5 text-gray-600 dark:border-white/10 dark:text-gray-300"><RefreshCw className="h-4 w-4" /></button><button onClick={beginCreate} className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-800"><Plus className="h-4 w-4" /> {t('إضافة حساب', 'Add account')}</button></div>
      </header>

      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>}

      {modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) { setEditing(null); setForm(blankForm); setModalOpen(false) } }}>
        <form onSubmit={save} dir={isEnglish ? 'ltr' : 'rtl'} className="w-full max-w-lg space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-[#1e1e2d]">
          <div className="flex items-center justify-between"><h2 className="text-lg font-black text-gray-900 dark:text-white">{editing ? t('تعديل الحساب', 'Edit account') : t('حساب جديد', 'New account')}</h2><button type="button" onClick={() => { setEditing(null); setForm(blankForm); setModalOpen(false) }} className="text-sm text-gray-500">{t('إغلاق', 'Close')}</button></div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">{t('الاسم', 'Name')}<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 dark:border-white/10" /></label>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">{t('البريد الإلكتروني', 'Email')}<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 dark:border-white/10" /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">{t('الدور', 'Role')}<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#1e1e2d]">{roles.map(([value, label]) => <option key={value} value={value}>{t(label, ({ TEACHER: 'Teacher', STUDENT: 'Student', PARENT: 'Parent', PRINCIPAL: 'Principal', VICE_PRINCIPAL: 'Vice principal', COUNSELOR: 'Counselor', SUPERVISOR: 'Supervisor', ACCOUNTANT: 'Accountant', HR: 'Human resources', ADMIN: 'Administrator' } as Record<string, string>)[value])}</option>)}</select></label>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">{t('الهاتف', 'Phone')}<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 dark:border-white/10" /></label>
          </div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">{editing ? t('كلمة مرور جديدة (اختياري)', 'New password (optional)') : t('كلمة المرور', 'Password')}<input required={!editing} minLength={8} type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 dark:border-white/10" /></label>
          <button disabled={saving} className="w-full rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? t('جار الحفظ...', 'Saving…') : t('حفظ الحساب', 'Save account')}</button>
        </form>
      </div>}

      <form onSubmit={submitSearch} className="grid gap-2 sm:grid-cols-[1fr_200px_auto]">
        <label className="relative"><Search className={`absolute ${isEnglish ? 'left-3' : 'right-3'} top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400`} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('ابحث بالاسم أو البريد', 'Search by name or email')} className={`w-full rounded-lg border border-gray-200 bg-white py-2.5 ${isEnglish ? 'pl-10 pr-3' : 'pr-10 pl-3'} text-sm dark:border-white/10 dark:bg-[#1e1e2d]`} /></label>
        <select value={role} onChange={(event) => { setPage(1); setClassFilterId(''); setRole(event.target.value) }} className="rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-[#1e1e2d]"><option value="all">{t('كل الأدوار', 'All roles')}</option>{roles.map(([value, label]) => <option key={value} value={value}>{t(label, ({ TEACHER: 'Teacher', STUDENT: 'Student', PARENT: 'Parent', PRINCIPAL: 'Principal', VICE_PRINCIPAL: 'Vice principal', COUNSELOR: 'Counselor', SUPERVISOR: 'Supervisor', ACCOUNTANT: 'Accountant', HR: 'Human resources', ADMIN: 'Administrator' } as Record<string, string>)[value])}</option>)}</select>
        <button className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-bold text-white dark:bg-white dark:text-gray-900">{t('بحث', 'Search')}</button>
      </form>

      {role === 'STUDENT' && classes.length > 0 && <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#1e1e2d]"><div><h2 className="font-black text-gray-900 dark:text-white">{t('تصنيف الطلاب حسب المرحلة والصف والفصل', 'Filter students by stage, grade, and class')}</h2><p className="mt-1 text-xs text-gray-500">{t('حدد الفصل لعرض حسابات طلابه فقط.', 'Choose a class to show only its students.')}</p></div><ClassHierarchyPicker classes={classes} value={classFilterId} onChange={(value) => { setPage(1); setClassFilterId(value) }} locale={isEnglish ? 'en' : 'ar'} /><button type="button" onClick={() => { setPage(1); setClassFilterId('') }} className="text-xs font-semibold text-primary hover:underline">{t('عرض كل الطلاب', 'Show all students')}</button></section>}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-[#1e1e2d]">
        <table className="w-full min-w-[980px] text-start text-sm"><thead className="bg-gray-50 text-xs text-gray-500 dark:bg-white/5"><tr><th className="px-4 py-3">{t('الاسم', 'Name')}</th><th className="px-4 py-3">{t('البريد الإلكتروني', 'Email')}</th><th className="px-4 py-3">{t('الدور', 'Role')}</th><th className="px-4 py-3">{t('الهاتف', 'Phone')}</th><th className="px-4 py-3">{t('حالة الحساب', 'Account status')}</th><th className="px-4 py-3">{t('النشاط وآخر ظهور', 'Activity and last seen')}</th><th className="px-4 py-3">{t('إجراءات', 'Actions')}</th></tr></thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/10">{result?.data.map((user) => <tr key={user.id}><td className="px-4 py-3 font-bold text-gray-900 dark:text-white"><span className="inline-flex items-center gap-2">{user.avatar ? <img src={user.avatar} alt={`${t('صورة', 'Photo')} ${user.name || [user.firstName, user.lastName].filter(Boolean).join(' ')}`} className="size-9 rounded-full border border-gray-200 object-cover dark:border-white/10" /> : <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">{(user.name || user.firstName || '؟').slice(0, 1)}</span>}{user.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || '—'}</span></td><td className="px-4 py-3 text-gray-600 dark:text-gray-300">{user.email}</td><td className="px-4 py-3 text-gray-600 dark:text-gray-300">{t(roleNames[user.role] || user.role, ({ TEACHER: 'Teacher', STUDENT: 'Student', PARENT: 'Parent', PRINCIPAL: 'Principal', VICE_PRINCIPAL: 'Vice principal', COUNSELOR: 'Counselor', SUPERVISOR: 'Supervisor', ACCOUNTANT: 'Accountant', HR: 'Human resources', ADMIN: 'Administrator' } as Record<string, string>)[user.role] || user.role)}</td><td className="px-4 py-3 text-gray-600 dark:text-gray-300">{user.phone || '—'}</td><td className="px-4 py-3">{user.isActive ? t('مفعّل', 'Active') : t('موقوف', 'Suspended')}</td><td className="px-4 py-3"><PresenceBadge lastActiveDate={user.lastActiveDate} /></td><td className="px-4 py-3"><div className="flex gap-2"><button title={t('تعديل الحساب', 'Edit account')} onClick={() => beginEdit(user)} className="rounded-md border border-gray-200 p-2 dark:border-white/10"><Pencil className="h-4 w-4" /></button><button title={user.isActive ? t('تعطيل الحساب', 'Suspend account') : t('تفعيل الحساب', 'Activate account')} onClick={() => void toggleActive(user)} className="rounded-md border border-gray-200 p-2 dark:border-white/10">{user.isActive ? <UserRoundX className="h-4 w-4 text-rose-600" /> : <UserRound className="h-4 w-4 text-emerald-600" />}</button></div></td></tr>)}</tbody>
        </table>
        {loading && <p className="p-8 text-center text-sm text-gray-500">{t('جار تحميل المستخدمين...', 'Loading users…')}</p>}
        {!loading && !error && result?.data.length === 0 && <p className="p-8 text-center text-sm text-gray-500">{t('لا توجد حسابات مطابقة.', 'No matching accounts.')}</p>}
      </div>
      {result && result.meta.totalPages > 1 && !classFilterId && <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300"><span>{isEnglish ? `Page ${result.meta.page} of ${result.meta.totalPages} · ${result.meta.total} accounts` : `صفحة ${result.meta.page} من ${result.meta.totalPages} · ${result.meta.total} حساب`}</span><div className="flex gap-2"><button disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-gray-200 px-3 py-2 disabled:opacity-40 dark:border-white/10">{t('السابق', 'Previous')}</button><button disabled={page >= result.meta.totalPages || loading} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-gray-200 px-3 py-2 disabled:opacity-40 dark:border-white/10">{t('التالي', 'Next')}</button></div></div>}
    </div>
  )
}
