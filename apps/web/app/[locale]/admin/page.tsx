'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, AlertCircle, BookOpen, Download, FileText, RefreshCw, School, Users } from 'lucide-react';
import { dashboardApi, type AdminDashboardResponse } from '@/lib/api/dashboard';
import { apiClient } from '@/lib/api/client';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Account = { id: string; name?: string | null; firstName?: string | null; lastName?: string | null; email: string; role: string; isActive: boolean; createdAt: string };

const roleLabels: Record<string, string> = {
  ADMIN: 'مدير النظام', PRINCIPAL: 'مدير المدرسة', VICE_PRINCIPAL: 'وكيل المدرسة', TEACHER: 'معلم',
  STUDENT: 'طالب', PARENT: 'ولي أمر', COUNSELOR: 'مرشد طلابي', SUPERVISOR: 'مشرف', ACCOUNTANT: 'محاسب', HR: 'موارد بشرية',
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardResponse | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dashboard, userList] = await Promise.all([
        dashboardApi.getAdminDashboard(),
        apiClient.get('/users', { params: { page: 1, limit: 100 } }),
      ]);
      setData(dashboard);
      setAccounts(Array.isArray(userList.data?.data) ? userList.data.data : []);
    } catch (reason: any) {
      setError(reason?.response?.data?.message || 'تعذر تحميل البيانات الإدارية من الخادم.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const exportReport = async () => {
    setExporting(true);
    try {
      const { data: file } = await apiClient.get('/admin/dashboard/export/pdf', { params: { type: 'full' }, responseType: 'blob' });
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'school-admin-report.json';
      link.click();
      URL.revokeObjectURL(url);
    } catch (reason: any) {
      setError(reason?.response?.data?.message || 'تعذر تصدير التقرير.');
    } finally {
      setExporting(false);
    }
  };

  const kpis = data?.kpis;

  return (
    <main className="mx-auto max-w-7xl space-y-6 pb-10" dir="rtl">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-bold">لوحة إدارة المدرسة</h1><p className="mt-1 text-sm text-muted-foreground">ملخص الحسابات والسجلات المحفوظة لمدرستك.</p></div>
        <div className="flex gap-2"><Button variant="outline" onClick={load} disabled={loading}><RefreshCw className={`ml-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />تحديث</Button><Button variant="outline" onClick={exportReport} disabled={exporting || !data}><Download className="ml-2 h-4 w-4" />تصدير تقرير</Button></div>
      </header>

      {error && <p role="alert" className="flex items-start gap-2 text-sm text-destructive"><AlertCircle className="mt-0.5 h-4 w-4" />{error}</p>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'المستخدمون', value: kpis?.totalUsers, icon: Users },
          { label: 'الطلاب', value: kpis?.totalStudents, icon: School },
          { label: 'المعلمون', value: kpis?.totalTeachers, icon: BookOpen },
          { label: 'الفصول', value: kpis?.totalClasses, icon: Activity },
          { label: 'المواد', value: kpis?.totalSubjects, icon: FileText },
        ].map((item) => <Card key={item.label}><CardContent className="flex items-center justify-between p-4"><div><p className="text-sm text-muted-foreground">{item.label}</p><p className="mt-1 text-2xl font-bold">{loading ? '—' : item.value ?? '—'}</p></div><item.icon className="h-5 w-5 text-primary" /></CardContent></Card>)}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">الفواتير والنشاط</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <p>إجمالي الإيرادات المسددة <strong className="block text-lg">{kpis ? `${kpis.totalRevenue.toLocaleString()} ر.س` : '—'}</strong></p>
              <p>حضور آخر 30 يومًا <strong className="block text-lg">{kpis?.attendanceRate == null ? 'لا توجد سجلات' : `${kpis.attendanceRate}%`}</strong></p>
              <p>فواتير مسددة <strong className="block text-lg">{data?.invoiceSummary.paid ?? '—'}</strong></p>
              <p>فواتير معلقة <strong className="block text-lg">{data?.invoiceSummary.pending ?? '—'}</strong></p>
            </div>
            <div className="border-t pt-3">
              <h2 className="mb-2 text-sm font-semibold">آخر أنشطة مسجلة</h2>
              {loading ? <p className="text-sm text-muted-foreground">تحميل الأنشطة...</p> : data?.recentActivity.length ? <ul className="space-y-2">{data.recentActivity.slice(0, 6).map((item) => <li key={item.id} className="flex justify-between gap-3 text-sm"><span className="min-w-0 truncate">{item.actor} · {item.action}</span><time className="shrink-0 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</time></li>)}</ul> : <p className="text-sm text-muted-foreground">لا توجد أنشطة مسجلة.</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4" />الحسابات المسجلة</CardTitle></CardHeader>
          <CardContent className="p-0">
            {loading ? <p className="p-5 text-sm text-muted-foreground">تحميل الحسابات...</p> : accounts.length === 0 ? <p className="p-5 text-sm text-muted-foreground">لا توجد حسابات في المدرسة.</p> : <div className="max-h-[360px] overflow-auto"><table className="w-full text-sm"><thead className="sticky top-0 bg-muted"><tr><th className="p-3 text-right font-semibold">الاسم</th><th className="p-3 text-right font-semibold">الدور</th><th className="p-3 text-right font-semibold">الحالة</th></tr></thead><tbody className="divide-y">{accounts.map((account) => <tr key={account.id}><td className="p-3"><span className="block font-medium">{account.name || [account.firstName, account.lastName].filter(Boolean).join(' ') || account.email}</span><span className="block text-xs text-muted-foreground">{account.email}</span></td><td className="p-3">{roleLabels[account.role] || account.role}</td><td className="p-3">{account.isActive ? 'مفعّل' : 'موقوف'}</td></tr>)}</tbody></table></div>}
            <div className="border-t p-3"><Link href="/admin/users" className="text-sm font-semibold text-primary">إدارة الحسابات</Link></div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader><CardTitle className="text-base">إدارة المدرسة</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {[['/admin/users', 'الحسابات'], ['/admin/classes', 'الفصول'], ['/admin/subjects', 'المواد'], ['/admin/settings', 'الإعدادات'], ['/admin/enrollments', 'التسجيلات']].map(([href, label]) => <Link key={href} href={href} className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium hover:bg-muted">{label}</Link>)}
        </CardContent>
      </Card>
    </main>
  );
}
