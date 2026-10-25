'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { Activity, AlertCircle, BookOpen, FileText, Printer, RefreshCw, School, Users } from 'lucide-react';
import { dashboardApi, type AdminDashboardResponse } from '@/lib/api/dashboard';
import { apiClient } from '@/lib/api/client';
import { formatSchoolActivity } from '@/lib/dashboard-utils';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportPrintFooter, ReportPrintIdentity } from '@/components/reports/report-print-tools';
import { DashboardBarChart, DashboardComparisonChart, DashboardDonutChart } from '@/components/dashboard/analytics-charts';
import styles from './page.module.css';

type Account = { id: string; name?: string | null; firstName?: string | null; lastName?: string | null; email: string; role: string; isActive: boolean; createdAt: string };
type SchoolSetup = {
  stats: { totalClasses: number; totalSubjects: number; unassignedStudents: number };
  attendance?: { todayPresent: number; todayAbsent: number; todayLate: number; todayRecordCount: number };
  assignments?: { pending: number; submitted: number; graded: number };
};
type ClassActivity = { classId: string; className: string; avgAttendance: number | null; avgGrade: number | null };

const roleLabels: Record<string, string> = {
  ADMIN: 'مدير النظام', PRINCIPAL: 'مدير المدرسة', VICE_PRINCIPAL: 'وكيل المدرسة', TEACHER: 'معلم',
  STUDENT: 'طالب', PARENT: 'ولي أمر', COUNSELOR: 'مرشد طلابي', SUPERVISOR: 'مشرف', ACCOUNTANT: 'محاسب', HR: 'موارد بشرية',
};

const adminCopy = {
  ar: {
    title: 'لوحة إدارة المدرسة', subtitle: 'ملخص الحسابات والسجلات المحفوظة لمدرستك.', refresh: 'تحديث', print: 'طباعة / حفظ PDF',
    tabs: { overview: 'ملخص المدرسة', accounts: 'الحسابات', management: 'إدارة المدرسة' },
    users: 'المستخدمون', students: 'الطلاب', teachers: 'المعلمون', classes: 'الفصول', subjects: 'المواد',
    financeActivity: 'الفواتير والنشاط', paidInvoices: 'فواتير مدفوعة', pendingInvoices: 'فواتير معلقة', attendance: 'حضور آخر 30 يومًا',
    recentActivity: 'آخر أنشطة المدرسة', accounts: 'الحسابات المسجلة', accountName: 'الاسم', role: 'الدور', status: 'الحالة', active: 'مفعّل', inactive: 'موقوف',
    attendanceChart: 'توزيع الحضور اليوم', assignmentChart: 'حالة تسليمات الواجبات', invoiceStatus: 'حالة الفواتير المدرسية', enrollmentChart: 'تسجيل الطلاب عبر الوقت', classChart: 'مقارنة الحضور والدرجات حسب الفصل', noChartData: 'لا توجد سجلات كافية لعرض الرسم البياني.',
    loadingActivity: 'تحميل الأنشطة...', noActivity: 'لا توجد أنشطة مدرسية مسجلة.', loadingAccounts: 'تحميل الحسابات...', noAccounts: 'لا توجد حسابات في المدرسة.',
    accountLink: 'إدارة الحسابات', schoolManagement: 'إدارة المدرسة', links: { accounts: 'الحسابات', classes: 'الفصول', subjects: 'المواد', settings: 'الإعدادات', enrollments: 'التسجيلات' },
    loadError: 'تعذر تحميل البيانات الإدارية من الخادم.', setup: 'بيانات المدرسة تحتاج إلى استكمال', setupBody: (students: number, classes: number, subjects: number) => `${[...(classes === 0 ? ['لا توجد فصول مسجلة'] : []), ...(subjects === 0 ? ['لا توجد مواد دراسية'] : []), ...(students > 0 ? [`${students} طالبًا بلا فصل`] : [])].join('، ')}. أكمل إعداد المدرسة وربط الطلاب حتى تعمل المتابعة الأكاديمية.`,
    roles: roleLabels,
  },
  en: {
    title: 'School administration', subtitle: 'Overview of the accounts and records stored for your school.', refresh: 'Refresh', print: 'Print / Save PDF',
    tabs: { overview: 'School overview', accounts: 'Accounts', management: 'School management' },
    users: 'Users', students: 'Students', teachers: 'Teachers', classes: 'Classes', subjects: 'Subjects',
    financeActivity: 'Invoices and activity', paidInvoices: 'Paid invoices', pendingInvoices: 'Pending invoices', attendance: 'Attendance, last 30 days',
    recentActivity: 'Recent school activity', accounts: 'Registered accounts', accountName: 'Name', role: 'Role', status: 'Status', active: 'Active', inactive: 'Suspended',
    attendanceChart: 'Today’s attendance', assignmentChart: 'Assignment submission status', invoiceStatus: 'School invoice status', enrollmentChart: 'Student enrollment over time', classChart: 'Attendance and grades by class', noChartData: 'There are not enough records to show this chart.',
    loadingActivity: 'Loading activity...', noActivity: 'No school activity has been recorded.', loadingAccounts: 'Loading accounts...', noAccounts: 'There are no accounts at this school.',
    accountLink: 'Manage accounts', schoolManagement: 'School management', links: { accounts: 'Accounts', classes: 'Classes', subjects: 'Subjects', settings: 'Settings', enrollments: 'Enrollments' },
    loadError: 'Could not load administration data from the server.', setup: 'School setup needs attention', setupBody: (students: number, classes: number, subjects: number) => `${[...(classes === 0 ? ['No classes are registered'] : []), ...(subjects === 0 ? ['No subjects are registered'] : []), ...(students > 0 ? [`${students} students are not assigned to a class`] : [])].join('; ')}. Complete school setup and student enrollment before academic follow-up.`,
    roles: { ADMIN: 'School administrator', PRINCIPAL: 'Principal', VICE_PRINCIPAL: 'Vice principal', TEACHER: 'Teacher', STUDENT: 'Student', PARENT: 'Parent', COUNSELOR: 'Counselor', SUPERVISOR: 'Supervisor', ACCOUNTANT: 'Accountant', HR: 'Human resources' },
  },
} as const

export default function AdminDashboardPage() {
  const locale = useLocale();
  const t = adminCopy[locale === 'en' ? 'en' : 'ar'];
  const [data, setData] = useState<AdminDashboardResponse | null>(null);
  const [setup, setSetup] = useState<SchoolSetup | null>(null);
  const [classActivity, setClassActivity] = useState<ClassActivity[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'accounts' | 'management'>('overview');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dashboardResult, userListResult, setupResult, classResult] = await Promise.allSettled([
        dashboardApi.getAdminDashboard(),
        apiClient.get('/users', { params: { page: 1, limit: 100 } }),
        apiClient.get<SchoolSetup>('/admin/dashboard/overview'),
        apiClient.get<ClassActivity[]>('/admin/dashboard/classes'),
      ]);
      if (dashboardResult.status === 'fulfilled') setData(dashboardResult.value);
      if (userListResult.status === 'fulfilled') {
        setAccounts(Array.isArray(userListResult.value.data?.data) ? userListResult.value.data.data : []);
      }
      if (setupResult.status === 'fulfilled') setSetup(setupResult.value.data);
      if (classResult.status === 'fulfilled') setClassActivity(classResult.value.data);
      const failure = dashboardResult.status === 'rejected' ? dashboardResult.reason : userListResult.status === 'rejected' ? userListResult.reason : setupResult.status === 'rejected' ? setupResult.reason : null;
      if (failure) setError(failure?.response?.data?.message || t.loadError);
    } finally {
      setLoading(false);
    }
  }, [t.loadError]);

  useEffect(() => { void load(); }, [load]);

  const exportReport = () => window.print();

  const kpis = data?.kpis;

  return (
      <main className={`report-print-root ${styles.report} mx-auto max-w-7xl space-y-6 pb-10`} dir={locale === 'en' ? 'ltr' : 'rtl'}>
      <ReportPrintIdentity title={t.title} subtitle={`${t.subtitle} · ${new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'ar-SA').format(new Date())}`} />
      <header className={`flex flex-wrap items-end justify-between gap-3 ${styles.actions}`}>
        <div><h1 className="text-2xl font-bold">{t.title}</h1><p className="mt-1 text-sm text-muted-foreground">{t.subtitle}</p></div>
        <div className="flex gap-2"><Button variant="outline" onClick={load} disabled={loading}><RefreshCw className={`ml-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />{t.refresh}</Button>{activeTab !== 'management' && <Button variant="outline" onClick={exportReport} disabled={loading || !data || Boolean(error)}><Printer className="ml-2 h-4 w-4" />{t.print}</Button>}</div>
      </header>

      {error && <p role="alert" className="flex items-start gap-2 text-sm text-destructive"><AlertCircle className="mt-0.5 h-4 w-4" />{error}</p>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: t.users, value: kpis?.totalUsers, icon: Users },
          { label: t.students, value: kpis?.totalStudents, icon: School },
          { label: t.teachers, value: kpis?.totalTeachers, icon: BookOpen },
          { label: t.classes, value: kpis?.totalClasses, icon: Activity },
          { label: t.subjects, value: kpis?.totalSubjects, icon: FileText },
        ].map((item) => <Card key={item.label}><CardContent className="flex items-center justify-between p-4"><div><p className="text-sm text-muted-foreground">{item.label}</p><p className="mt-1 text-2xl font-bold">{loading ? '—' : item.value ?? '—'}</p></div><item.icon className="h-5 w-5 text-primary" /></CardContent></Card>)}
      </section>

      {setup && (setup.stats.totalClasses === 0 || setup.stats.totalSubjects === 0 || setup.stats.unassignedStudents > 0) && <section className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-950 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-100"><h2 className="font-bold">{t.setup}</h2><p className="mt-1 text-sm">{t.setupBody(setup.stats.unassignedStudents, setup.stats.totalClasses, setup.stats.totalSubjects)}</p></section>}

      <nav role="tablist" aria-label={t.schoolManagement} className="print:hidden flex flex-wrap gap-2 border-b border-border pb-2">
        {(['overview', 'accounts', 'management'] as const).map((tab) => <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${activeTab === tab ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:bg-muted'}`}>{t.tabs[tab]}</button>)}
      </nav>

      {activeTab === 'overview' && <Card>
          <CardHeader><CardTitle className="text-base">{t.financeActivity}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-4 lg:grid-cols-2">
              <DashboardDonutChart title={t.attendanceChart} emptyLabel={t.noChartData} data={setup?.attendance ? [
                { label: locale === 'en' ? 'Present' : 'حاضر', value: setup.attendance.todayPresent, color: '#0f766e' },
                { label: locale === 'en' ? 'Absent' : 'غائب', value: setup.attendance.todayAbsent, color: '#dc2626' },
                { label: locale === 'en' ? 'Late' : 'متأخر', value: setup.attendance.todayLate, color: '#d97706' },
              ] : []} />
              <DashboardDonutChart title={t.assignmentChart} emptyLabel={t.noChartData} data={setup?.assignments ? [
                { label: locale === 'en' ? 'Awaiting grading' : 'بانتظار التصحيح', value: setup.assignments.pending, color: '#d97706' },
                { label: locale === 'en' ? 'Graded' : 'تم التصحيح', value: setup.assignments.graded, color: '#0f766e' },
              ] : []} />
              <DashboardBarChart title={t.enrollmentChart} emptyLabel={t.noChartData} data={(data?.enrollmentSeries || []).map((item) => ({ label: item.label, value: item.value }))} color="#0f766e" />
              <DashboardComparisonChart title={t.classChart} emptyLabel={t.noChartData} leftLabel={locale === 'en' ? 'Attendance' : 'الحضور'} rightLabel={locale === 'en' ? 'Average grade' : 'متوسط الدرجات'} data={classActivity.map((item) => ({ label: item.className, first: item.avgAttendance, second: item.avgGrade }))} />
              <DashboardDonutChart title={t.invoiceStatus} emptyLabel={t.noChartData} data={data ? [
                { label: locale === 'en' ? 'Paid' : 'مدفوعة', value: data.invoiceSummary.paid, color: '#0f766e' },
                { label: locale === 'en' ? 'Pending' : 'معلقة', value: data.invoiceSummary.pending, color: '#d97706' },
                { label: locale === 'en' ? 'Requires action' : 'تحتاج إجراء', value: data.invoiceSummary.requiresAction, color: '#2563eb' },
                { label: locale === 'en' ? 'Failed' : 'فشلت', value: data.invoiceSummary.failed, color: '#dc2626' },
                { label: locale === 'en' ? 'Refunded' : 'مستردة', value: data.invoiceSummary.refunded, color: '#7c3aed' },
              ] : []} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <p>{t.paidInvoices} <strong className="block text-lg">{data?.invoiceSummary.paid ?? '—'}</strong></p>
              <p>{t.pendingInvoices} <strong className="block text-lg">{data?.invoiceSummary.pending ?? '—'}</strong></p>
              <p>{t.attendance} <strong className="block text-lg">{kpis?.attendanceRate == null ? '—' : `${kpis.attendanceRate}%`}</strong></p>
            </div>
            <div className="border-t pt-3">
              <h2 className="mb-2 text-sm font-semibold">{t.recentActivity}</h2>
              {loading ? <p className="text-sm text-muted-foreground">{t.loadingActivity}</p> : data?.recentActivity.length ? <ul className="space-y-2">{data.recentActivity.slice(0, 6).map((item) => <li key={item.id} className="flex justify-between gap-3 text-sm"><span className="min-w-0 truncate">{item.actor} · {formatSchoolActivity(item.action, locale)}</span><time className="shrink-0 text-xs text-muted-foreground">{new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'ar-SA').format(new Date(item.createdAt))}</time></li>)}</ul> : <p className="text-sm text-muted-foreground">{t.noActivity}</p>}
            </div>
          </CardContent>
      </Card>}

      {activeTab === 'accounts' && <Card className={styles.accounts}>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4" />{t.accounts}</CardTitle></CardHeader>
          <CardContent className="p-0">
            {loading ? <p className="p-5 text-sm text-muted-foreground">{t.loadingAccounts}</p> : accounts.length === 0 ? <p className="p-5 text-sm text-muted-foreground">{t.noAccounts}</p> : <div className="max-h-[360px] overflow-auto"><table className="w-full text-sm"><thead className="sticky top-0 bg-muted"><tr><th className="p-3 text-right font-semibold">{t.accountName}</th><th className="p-3 text-right font-semibold">{t.role}</th><th className="p-3 text-right font-semibold">{t.status}</th></tr></thead><tbody className="divide-y">{accounts.map((account) => <tr key={account.id}><td className="p-3"><span className="block font-medium">{account.name || [account.firstName, account.lastName].filter(Boolean).join(' ') || account.email}</span><span className="block text-xs text-muted-foreground">{account.email}</span></td><td className="p-3">{t.roles[account.role as keyof typeof t.roles] || account.role}</td><td className="p-3">{account.isActive ? t.active : t.inactive}</td></tr>)}</tbody></table></div>}
            <div className="border-t p-3"><Link href="/admin/users" className="text-sm font-semibold text-primary">{t.accountLink}</Link></div>
          </CardContent>
      </Card>}

      {activeTab === 'management' && <Card>
        <CardHeader><CardTitle className="text-base">{t.schoolManagement}</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {[['/admin/users', t.links.accounts], ['/admin/classes', t.links.classes], ['/admin/subjects', t.links.subjects], ['/admin/settings', t.links.settings], ['/admin/enrollments', t.links.enrollments]].map(([href, label]) => <Link key={href} href={href} className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium hover:bg-muted">{label}</Link>)}
        </CardContent>
      </Card>}
      <ReportPrintFooter />
    </main>
  );
}
