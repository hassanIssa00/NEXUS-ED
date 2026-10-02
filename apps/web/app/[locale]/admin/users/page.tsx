'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { apiClient } from '@/lib/api/client'
import { Pencil, Plus, RefreshCw, Search, UserRound, UserRoundX } from 'lucide-react'

type UserRecord = {
  id: string
  name: string | null
  firstName: string | null
  lastName: string | null
  email: string
  role: string
  phone: string | null
  isActive: boolean
}
type UserResponse = { data: UserRecord[]; meta: { total: number; page: number; limit: number; totalPages: number } }

const roles = [
  ['TEACHER', 'معلم'], ['STUDENT', 'طالب'], ['PARENT', 'ولي أمر'], ['PRINCIPAL', 'مدير'],
  ['VICE_PRINCIPAL', 'وكيل'], ['COUNSELOR', 'مرشد طلابي'], ['SUPERVISOR', 'مشرف'],
  ['ACCOUNTANT', 'محاسب'], ['HR', 'موارد بشرية'], ['ADMIN', 'إداري'],
]
const roleNames = Object.fromEntries(roles)
const blankForm = { name: '', email: '', phone: '', role: 'STUDENT', password: '' }

export default function UsersPage() {
  const [result, setResult] = useState<UserResponse | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [role, setRole] = useState('all')
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
      const response = await apiClient.get<UserResponse>('/users', {
        params: { page, limit: 25, search: appliedSearch || undefined, role: role === 'all' ? undefined : role },
      })
      setResult(response.data)
    } catch {
      setError('تعذر تحميل حسابات المدرسة.')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [page, appliedSearch, role])

  useEffect(() => { void load() }, [load])

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
      setError('تعذر حفظ الحساب. تحقق من البريد والدور والحقول المطلوبة.')
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
      setError('تعذر تحديث حالة الحساب.')
    }
  }

  const submitSearch = (event: FormEvent) => { event.preventDefault(); setPage(1); setAppliedSearch(search.trim()) }

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-gray-200 pb-5 dark:border-white/10">
        <div><p className="text-sm font-semibold text-violet-700 dark:text-violet-300">إدارة المدرسة</p><h1 className="mt-1 text-2xl font-black text-gray-900 dark:text-white">حسابات المستخدمين</h1><p className="mt-2 text-sm text-gray-500 dark:text-gray-400">إدارة الحسابات المحفوظة في قاعدة بيانات المدرسة.</p></div>
        <div className="flex gap-2"><button onClick={() => void load()} title="تحديث القائمة" className="rounded-lg border border-gray-200 p-2.5 text-gray-600 dark:border-white/10 dark:text-gray-300"><RefreshCw className="h-4 w-4" /></button><button onClick={beginCreate} className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-800"><Plus className="h-4 w-4" /> إضافة حساب</button></div>
      </header>

      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>}

      {modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) { setEditing(null); setForm(blankForm); setModalOpen(false) } }}>
        <form onSubmit={save} className="w-full max-w-lg space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-[#1e1e2d]">
          <div className="flex items-center justify-between"><h2 className="text-lg font-black text-gray-900 dark:text-white">{editing ? 'تعديل الحساب' : 'حساب جديد'}</h2><button type="button" onClick={() => { setEditing(null); setForm(blankForm); setModalOpen(false) }} className="text-sm text-gray-500">إغلاق</button></div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">الاسم<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 dark:border-white/10" /></label>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">البريد الإلكتروني<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 dark:border-white/10" /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">الدور<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#1e1e2d]">{roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">الهاتف<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 dark:border-white/10" /></label>
          </div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">{editing ? 'كلمة مرور جديدة (اختياري)' : 'كلمة المرور'}<input required={!editing} minLength={8} type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 dark:border-white/10" /></label>
          <button disabled={saving} className="w-full rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? 'جار الحفظ...' : 'حفظ الحساب'}</button>
        </form>
      </div>}

      <form onSubmit={submitSearch} className="grid gap-2 sm:grid-cols-[1fr_200px_auto]">
        <label className="relative"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث بالاسم أو البريد" className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pr-10 pl-3 text-sm dark:border-white/10 dark:bg-[#1e1e2d]" /></label>
        <select value={role} onChange={(event) => { setPage(1); setRole(event.target.value) }} className="rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-[#1e1e2d]"><option value="all">كل الأدوار</option>{roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <button className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-bold text-white dark:bg-white dark:text-gray-900">بحث</button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-[#1e1e2d]">
        <table className="w-full min-w-[800px] text-right text-sm"><thead className="bg-gray-50 text-xs text-gray-500 dark:bg-white/5"><tr><th className="px-4 py-3">الاسم</th><th className="px-4 py-3">البريد الإلكتروني</th><th className="px-4 py-3">الدور</th><th className="px-4 py-3">الهاتف</th><th className="px-4 py-3">الحالة</th><th className="px-4 py-3">إجراءات</th></tr></thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/10">{result?.data.map((user) => <tr key={user.id}><td className="px-4 py-3 font-bold text-gray-900 dark:text-white">{user.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || '—'}</td><td className="px-4 py-3 text-gray-600 dark:text-gray-300">{user.email}</td><td className="px-4 py-3 text-gray-600 dark:text-gray-300">{roleNames[user.role] || user.role}</td><td className="px-4 py-3 text-gray-600 dark:text-gray-300">{user.phone || '—'}</td><td className="px-4 py-3">{user.isActive ? 'نشط' : 'غير نشط'}</td><td className="px-4 py-3"><div className="flex gap-2"><button title="تعديل الحساب" onClick={() => beginEdit(user)} className="rounded-md border border-gray-200 p-2 dark:border-white/10"><Pencil className="h-4 w-4" /></button><button title={user.isActive ? 'تعطيل الحساب' : 'تفعيل الحساب'} onClick={() => void toggleActive(user)} className="rounded-md border border-gray-200 p-2 dark:border-white/10">{user.isActive ? <UserRoundX className="h-4 w-4 text-rose-600" /> : <UserRound className="h-4 w-4 text-emerald-600" />}</button></div></td></tr>)}</tbody>
        </table>
        {loading && <p className="p-8 text-center text-sm text-gray-500">جار تحميل المستخدمين...</p>}
        {!loading && !error && result?.data.length === 0 && <p className="p-8 text-center text-sm text-gray-500">لا توجد حسابات مطابقة.</p>}
      </div>
      {result && result.meta.totalPages > 1 && <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300"><span>صفحة {result.meta.page} من {result.meta.totalPages} · {result.meta.total} حساب</span><div className="flex gap-2"><button disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-gray-200 px-3 py-2 disabled:opacity-40 dark:border-white/10">السابق</button><button disabled={page >= result.meta.totalPages || loading} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-gray-200 px-3 py-2 disabled:opacity-40 dark:border-white/10">التالي</button></div></div>}
    </div>
  )
}
