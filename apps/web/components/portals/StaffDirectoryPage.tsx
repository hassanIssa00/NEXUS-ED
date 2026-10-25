'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { apiClient } from '@/lib/api/client'
import { Download, RefreshCw, Search, Users } from 'lucide-react'
import { PresenceBadge } from '@/components/ui/presence-badge'

type StaffMember = {
  id: string
  name: string | null
  firstName: string | null
  lastName: string | null
  email: string
  role: string
  phone: string | null
  isActive: boolean
  lastActiveDate: string | null
  createdAt: string
}

type StaffResponse = {
  data: StaffMember[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

const roleLabels: Record<string, string> = {
  TEACHER: 'معلم',
  ADMIN: 'إداري',
  PRINCIPAL: 'مدير',
  VICE_PRINCIPAL: 'وكيل',
  COUNSELOR: 'مرشد طلابي',
  SUPERVISOR: 'مشرف',
  ACCOUNTANT: 'محاسب',
  HR: 'موارد بشرية',
}

const hrText = {
  ar: {
    eyebrow: 'الموارد البشرية', title: 'دليل موظفي المدرسة', refresh: 'تحديث الدليل', export: 'تصدير الصفحة',
    matched: 'موظفون مطابقون للبحث', active: 'حسابات نشطة في الصفحة الحالية', search: 'ابحث بالاسم أو البريد', searchButton: 'بحث', role: 'كل الأدوار',
    employee: 'الموظف', roleColumn: 'الدور', email: 'البريد الإلكتروني', phone: 'الهاتف', status: 'حالة الحساب', presence: 'النشاط وآخر ظهور', activeStatus: 'مفعّل', disabledStatus: 'موقوف',
    loading: 'جار تحميل دليل المدرسة...', noResults: 'لا توجد نتائج مطابقة.', loadError: 'تعذر تحميل دليل الموظفين من المدرسة.', previous: 'السابق', next: 'التالي', page: (current: number, total: number) => `صفحة ${current} من ${total}`,
    roles: roleLabels,
  },
  en: {
    eyebrow: 'Human resources', title: 'School staff directory', refresh: 'Refresh directory', export: 'Export page',
    matched: 'Staff matching the search', active: 'Active accounts on this page', search: 'Search by name or email', searchButton: 'Search', role: 'All roles',
    employee: 'Employee', roleColumn: 'Role', email: 'Email', phone: 'Phone', status: 'Account status', presence: 'Activity / last seen', activeStatus: 'Enabled', disabledStatus: 'Disabled',
    loading: 'Loading the school directory...', noResults: 'No matching staff found.', loadError: 'Could not load the school staff directory.', previous: 'Previous', next: 'Next', page: (current: number, total: number) => `Page ${current} of ${total}`,
    roles: { TEACHER: 'Teacher', ADMIN: 'Administrator', PRINCIPAL: 'Principal', VICE_PRINCIPAL: 'Vice principal', COUNSELOR: 'Counselor', SUPERVISOR: 'Supervisor', ACCOUNTANT: 'Accountant', HR: 'Human resources' },
  },
} as const

function staffName(person: StaffMember) {
  return person.name || [person.firstName, person.lastName].filter(Boolean).join(' ') || person.email
}

function exportCsv(rows: StaffMember[], english = false) {
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`
  const labels = english
    ? { headers: ['Name', 'Email', 'Role', 'Phone', 'Status'], roles: { TEACHER: 'Teacher', ADMIN: 'Administrator', PRINCIPAL: 'Principal', VICE_PRINCIPAL: 'Vice principal', COUNSELOR: 'Counselor', SUPERVISOR: 'Supervisor', ACCOUNTANT: 'Accountant', HR: 'Human resources' }, active: 'Active', inactive: 'Inactive' }
    : { headers: ['الاسم', 'البريد الإلكتروني', 'الدور', 'الهاتف', 'الحالة'], roles: roleLabels, active: 'نشط', inactive: 'غير نشط' }
  const content = '\uFEFF' + [
    labels.headers,
    ...rows.map((person) => [staffName(person), person.email, labels.roles[person.role as keyof typeof labels.roles] || person.role, person.phone || '', person.isActive ? labels.active : labels.inactive]),
  ].map((row) => row.map(quote).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'staff-directory.csv'
  link.click()
  URL.revokeObjectURL(url)
}

export default function StaffDirectoryPage() {
  const locale = useLocale()
  const t = hrText[locale === 'en' ? 'en' : 'ar']
  const [result, setResult] = useState<StaffResponse | null>(null)
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiClient.get<StaffResponse>('/users/staff', {
        params: { page, limit: 25, search: appliedQuery || undefined, role: roleFilter || undefined },
      })
      setResult(response.data)
    } catch {
      setError(t.loadError)
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [page, appliedQuery, roleFilter, t.loadError])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load()
    }, 60_000)
    return () => window.clearInterval(timer)
  }, [load])

  const applySearch = (event: FormEvent) => {
    event.preventDefault()
    setPage(1)
    setAppliedQuery(query.trim())
  }

  return (
    <div className="space-y-6 pb-12" dir={locale === 'en' ? 'ltr' : 'rtl'}>
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-gray-200 pb-5 dark:border-white/10">
        <div>
          <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">{t.eyebrow}</p>
          <h1 className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{t.title}</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void load()} disabled={loading} title={t.refresh} className="rounded-lg border border-gray-200 p-2.5 text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"><RefreshCw className="h-4 w-4" /></button>
          <button onClick={() => result && exportCsv(result.data, locale === 'en')} disabled={!result?.data.length} className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3.5 py-2.5 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-gray-900"><Download className="h-4 w-4" />{t.export}</button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#1e1e2d]">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"><Users className="h-5 w-5" /></span>
          <div><p className="text-xs text-gray-500 dark:text-gray-400">{t.matched}</p><p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{result?.meta.total ?? '—'}</p></div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#1e1e2d]">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t.active}</p>
          <p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{result ? result.data.filter((person) => person.isActive).length : '—'}</p>
        </div>
      </section>

      <form onSubmit={applySearch} className="flex flex-wrap gap-2">
        <label className="relative flex-1">
          <Search className={`absolute ${locale === 'en' ? 'left-3' : 'right-3'} top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400`} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} className={`w-full rounded-lg border border-gray-200 bg-white py-2.5 ${locale === 'en' ? 'pl-10 pr-3' : 'pr-10 pl-3'} text-sm text-gray-900 outline-none focus:border-violet-500 dark:border-white/10 dark:bg-[#1e1e2d] dark:text-white`} />
        </label>
        <select value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value); setPage(1) }} aria-label={t.role} className="rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-[#1e1e2d]"><option value="">{t.role}</option>{Object.entries(t.roles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <button className="rounded-lg bg-violet-700 px-4 text-sm font-bold text-white hover:bg-violet-800">{t.searchButton}</button>
      </form>

      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{error}</div>}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-[#1e1e2d]">
        <table className="w-full min-w-[720px] text-start text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 dark:bg-white/5 dark:text-gray-400">
            <tr><th className="px-4 py-3 font-semibold">{t.employee}</th><th className="px-4 py-3 font-semibold">{t.roleColumn}</th><th className="px-4 py-3 font-semibold">{t.email}</th><th className="px-4 py-3 font-semibold">{t.phone}</th><th className="px-4 py-3 font-semibold">{t.status}</th><th className="px-4 py-3 font-semibold">{t.presence}</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/10">
            {result?.data.map((person) => (
              <tr key={person.id}>
                <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">{staffName(person)}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{t.roles[person.role as keyof typeof t.roles] || person.role}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{person.email}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{person.phone || '—'}</td>
                <td className="px-4 py-3"><span className={person.isActive ? 'font-semibold text-emerald-700 dark:text-emerald-300' : 'font-semibold text-gray-500'}>{person.isActive ? t.activeStatus : t.disabledStatus}</span></td>
                <td className="px-4 py-3"><PresenceBadge lastActiveDate={person.lastActiveDate} locale={locale} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && !error && result?.data.length === 0 && <p className="p-8 text-center text-sm text-gray-500">{t.noResults}</p>}
        {loading && <p className="p-8 text-center text-sm text-gray-500">{t.loading}</p>}
      </div>

      {result && result.meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
          <span>{t.page(result.meta.page, result.meta.totalPages)}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-gray-200 px-3 py-2 disabled:opacity-40 dark:border-white/10">{t.previous}</button>
            <button disabled={page >= result.meta.totalPages || loading} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-gray-200 px-3 py-2 disabled:opacity-40 dark:border-white/10">{t.next}</button>
          </div>
        </div>
      )}
    </div>
  )
}
