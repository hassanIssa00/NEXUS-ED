'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, BookOpen, CircleAlert, FileText, Loader2, School, Users } from 'lucide-react';
import { dashboardApi, AdminDashboardResponse } from '@/lib/api/dashboard';

function Metric({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Activity }) {
  return <div className="flex items-center justify-between gap-3 border-b py-4 last:border-0"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div><Icon className="h-5 w-5 text-primary" /></div>;
}

export default function VicePrincipalDashboard() {
  const [data, setData] = useState<AdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    dashboardApi.getAdminDashboard()
      .then((result) => { if (active) setData(result); })
      .catch((reason: any) => { if (active) setError(reason?.response?.data?.message || 'تعذر تحميل مؤشرات المدرسة من الخادم.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <main className="mx-auto max-w-6xl space-y-6 pb-10" dir="rtl">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b pb-5"><div><p className="text-sm font-medium text-primary">الإدارة المدرسية</p><h1 className="mt-1 text-2xl font-bold">لوحة الوكيل</h1><p className="mt-1 text-sm text-muted-foreground">مؤشرات محسوبة من سجلات المدرسة الحالية.</p></div><nav className="flex flex-wrap gap-2 text-sm"><Link className="rounded-md border px-3 py-2 hover:bg-muted" href="/principal/analytics">التقارير</Link><Link className="rounded-md border px-3 py-2 hover:bg-muted" href="/admin/classes">الفصول</Link><Link className="rounded-md border px-3 py-2 hover:bg-muted" href="/admin/users">المستخدمون</Link></nav></header>
      {loading ? <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />تحميل مؤشرات المدرسة...</div> : error ? <p role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 p-4 text-sm text-destructive"><CircleAlert className="h-4 w-4" />{error}</p> : data ? <>
        <section className="grid gap-x-8 rounded-md border bg-card px-5 sm:grid-cols-2 lg:grid-cols-3">
          <Metric label="الطلاب" value={data.kpis.totalStudents} icon={Users} />
          <Metric label="المعلمون" value={data.kpis.totalTeachers} icon={Users} />
          <Metric label="الفصول" value={data.kpis.totalClasses} icon={School} />
          <Metric label="المواد" value={data.kpis.totalSubjects} icon={BookOpen} />
          <Metric label="المستخدمون النشطون" value={data.kpis.activeUsers} icon={Activity} />
          <Metric label="الحضور خلال 30 يومًا" value={data.kpis.attendanceRate === null ? 'لا توجد سجلات' : `${data.kpis.attendanceRate}%`} icon={FileText} />
        </section>
        <section className="rounded-md border bg-card"><h2 className="border-b px-4 py-3 font-semibold">آخر إجراءات النظام</h2>{data.recentActivity.length ? <ul className="divide-y">{data.recentActivity.map((item) => <li key={item.id} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm"><span>{item.actor} · {item.action}</span><time className="text-muted-foreground">{new Date(item.createdAt).toLocaleString('ar-SA')}</time></li>)}</ul> : <p className="p-4 text-sm text-muted-foreground">لا توجد إجراءات مسجلة.</p>}</section>
      </> : null}
    </main>
  );
}
